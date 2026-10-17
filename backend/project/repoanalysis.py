"""Code-repository analysis for assisted curation of a code record.

One endpoint (wired through swagger.yml):
- POST /api/curation/analyze-repo   inventory + classify a GitHub/GitLab repo

The folder analysis (project/curation.py) reads a paper folder whose SHAPE
says where one record ends and the next begins. A code repository has a
different, but just as conventional, shape -- scripts/ and examples/, a
package or src/ tree, data/, figures/, a manifest of pinned dependencies --
so it gets its own boundaries here and then the same candidate format, the
same evidence extractors and the same link suggestions as a paper folder.
The guided setup's import step consumes both responses unchanged.

The response is an ANALYSIS ONLY: nothing is stored, and nothing becomes a
record until the curator adds it in the browser.

Safety model:
- The browser sends a repository link; only github.com and gitlab.com are
  accepted, and only an `owner/name` path (GitLab: nested groups) made of
  safe characters is taken from it. Every URL fetched is built here.
- The repository is pinned to ONE commit: the tree, every text read and the
  file links handed back all use that commit, so the record keeps pointing
  at the code it was curated from even after the branch moves on.
- Discovery is bounded: tree entries, text reads, bytes per read, GitLab
  tree pages and a request timeout, with an explicit `truncated` flag.
- File contents are never logged.
"""
import os
import posixpath
import re
from urllib.parse import quote, urlparse

import requests

from project import autocurate
from project import evidence as ev
from project import folderstandard as fs
from project.auth import csrf_protect, get_current_user
from project.curation import (
    CHART_EXTENSIONS,
    DATASET_EXTENSIONS,
    HIGH,
    LOW,
    MEDIUM,
    NEEDS_INPUT,
    MAX_CANDIDATE_PATHS,
    MAX_TEXT_BYTES,
    NOTEBOOK_EXTENSIONS,
    RUNNABLE_EXTENSIONS,
    REQUEST_TIMEOUT,
    _candidate,
    _evidence_line,
    _script_header,
    _usable,
    classify_tools,
)

# ---- bounds -------------------------------------------------------------------

MAX_TREE_FILES = 5000
MAX_TEXT_FILES = 60
MAX_GITLAB_PAGES = 30
MAX_SCRIPT_RECORDS = 80
MAX_CHART_RECORDS = 40
MAX_DATASET_RECORDS = 40
MAX_DEPENDENCY_TOOLS = 15

# ---- repository shape ------------------------------------------------------------

# Never part of the curated code: tooling, caches, vendored copies, build
# output. Any path with one of these segments is left out.
IGNORED_SEGMENTS = frozenset((
    ".git", ".github", ".gitlab", ".circleci", ".vscode", ".idea",
    "node_modules", "bower_components", "vendor", "third_party",
    "venv", ".venv", "env", ".env", "__pycache__", ".ipynb_checkpoints",
    "build", "dist", "site-packages", ".tox", ".nox", ".eggs",
    ".mypy_cache", ".pytest_cache",
    # Packaging and CI: how the code is built and shipped, not the code.
    "conda", "conda-recipe", "conda.recipe", "recipe", "docker", "ci",
    "packaging", "debian", "rpm",
))
# Tests are code, but they do not produce a result a reader reproduces; they
# are counted and left out so they do not crowd the scripts list.
TEST_SEGMENTS = frozenset(("test", "tests", "testing", "spec", "specs",
                           "test-suite", "test_suite", "testsuite"))
DOC_DIRS = frozenset(("doc", "docs", "documentation", "manual", "site"))

# Top-level folders whose children are things a person RUNS. Taken from the
# folder standard's script names, minus the ones that mean "library source"
# in a code base (code, src), plus the usual names in software repositories.
SCRIPT_DIRS = frozenset(
    {fs._normalized(name) for name in fs.LEGACY_ALIASES[fs.ROLE_SCRIPTS]
     if name not in ("code", "codes", "src")}
    | {fs._normalized(name) for name in (
        "bin", "examples", "example", "notebooks", "notebook", "tutorials",
        "tutorial", "demos", "demo", "analysis", "workflows", "workflow",
        "recipes", "benchmarks", "benchmark", "apps", "cli", "utils",
        "utilities", "postprocessing", "postprocess", "jobs", "runs")})
DATA_DIRS = frozenset(fs._normalized(name)
                      for name in fs.LEGACY_ALIASES[fs.ROLE_DATASETS])
CHART_DIRS = frozenset(fs._normalized(name)
                       for name in fs.LEGACY_ALIASES[fs.ROLE_CHARTS])

# What counts as source code in a library folder.
SOURCE_EXTENSIONS = (
    ".py", ".pyx", ".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".f",
    ".f77", ".f90", ".f95", ".f03", ".f08", ".cu", ".cuh", ".jl", ".r", ".m",
    ".go", ".rs", ".java", ".scala", ".js", ".ts", ".sh", ".bash", ".pl",
    ".lua", ".cl",
)
# Scripts at the repository root that configure the project rather than do
# anything with it.
ROOT_SCRIPT_SKIP = frozenset((
    "setup.py", "conftest.py", "noxfile.py", "fabfile.py", "tasks.py",
    "versioneer.py", "conf.py", "_version.py", "manage.py",
))
# Manifests whose pinned entries become dependency Tools: the Python and
# conda ones a computational result depends on. A web front end's
# package.json lists dozens of build dependencies that are not what a
# reader needs to reproduce anything, so it is not read.
MANIFEST_RE = re.compile(
    r"(^|/)(requirements[\w.-]*\.txt|environment\.ya?ml|pyproject\.toml|"
    r"setup\.py)$", re.IGNORECASE)

USES_TOOL = "uses_tool"


def _ext(path):
    return posixpath.splitext(path)[1].lower()


def _top(path):
    return path.split("/", 1)[0] if "/" in path else ""


def _kept(path):
    segments = path.split("/")
    folders = [s.lower() for s in segments[:-1]]
    if any(s in IGNORED_SEGMENTS or (s.startswith(".") and s != ".")
           for s in folders):
        return False
    if any(s.endswith(".egg-info") for s in folders):
        return False
    return True


def _is_test(path):
    segments = [s.lower() for s in path.split("/")]
    name = segments[-1]
    return (any(s in TEST_SEGMENTS for s in segments[:-1])
            or name.startswith("test_") or name.endswith("_test.py"))


def _runnable(path):
    return _ext(path) in RUNNABLE_EXTENSIONS + NOTEBOOK_EXTENSIONS


def _children(top, files):
    """Immediate child folders (with their files) and files of `top`."""
    prefix = top + "/"
    folders, loose = {}, []
    for path in files:
        if not path.startswith(prefix):
            continue
        rest = path[len(prefix):]
        if "/" in rest:
            folders.setdefault(prefix + rest.split("/", 1)[0], []).append(path)
        else:
            loose.append(path)
    return sorted(folders.items()), sorted(loose)


def _role(top):
    key = fs._normalized(top)
    if key in DATA_DIRS:
        return "data"
    if key in CHART_DIRS:
        return "charts"
    if key in SCRIPT_DIRS:
        return "scripts"
    if top.lower() in DOC_DIRS or re.match(r"^docs?[_-]", top.lower()):
        return "docs"
    return "library"


def repo_boundaries(files):
    """Every record boundary in a repository, before anything is read.

    Returns (boundaries, notes, left_out): boundaries is an ordered list of
    {"kind", "path", "members", "role"} where `path` is the folder or file
    the record will hold and `members` the files it covers. Pure.
    """
    kept = [p for p in files if _kept(p)]
    tests = [p for p in kept if _is_test(p)]
    files = [p for p in kept if not _is_test(p)]
    notes = []
    if tests:
        notes.append("%d test file(s) were left out: tests check the code "
                     "rather than produce results." % len(tests))

    boundaries = []
    tops = sorted({_top(p) for p in files if _top(p)})

    # Scripts a person runs from the repository root.
    for path in sorted(p for p in files if "/" not in p):
        if _runnable(path) and path.lower() not in ROOT_SCRIPT_SKIP:
            boundaries.append({"kind": "script", "path": path,
                               "members": [path], "role": "root"})

    for top in tops:
        role = _role(top)
        folders, loose = _children(top, files)
        if role == "scripts":
            for folder, members in folders:
                if any(_runnable(p) or _ext(p) in SOURCE_EXTENSIONS
                       for p in members):
                    boundaries.append({"kind": "script", "path": folder,
                                       "members": members, "role": role})
            for path in loose:
                if _runnable(path):
                    boundaries.append({"kind": "script", "path": path,
                                       "members": [path], "role": role})
        elif role == "data":
            for folder, members in folders:
                boundaries.append({"kind": "dataset", "path": folder,
                                   "members": members, "role": role})
            for path in loose:
                if not ev.is_readme(path):
                    boundaries.append({"kind": "dataset", "path": path,
                                       "members": [path], "role": role})
        elif role == "charts":
            images = [p for p in files if p.startswith(top + "/")
                      and _ext(p) in CHART_EXTENSIONS
                      and fs._normalized(posixpath.splitext(
                          posixpath.basename(p))[0])
                      not in {fs._normalized(s)
                              for s in fs.CHART_DECORATIVE_STEMS}]
            for path in sorted(images):
                boundaries.append({"kind": "chart", "path": path,
                                   "members": [path], "role": role})
        elif role == "library":
            # src/ holds packages; each package is one record. Any other
            # top-level folder of source code is one record itself.
            if top.lower() == "src":
                units = [(f, m) for f, m in folders]
                units += [(p, [p]) for p in loose
                          if _ext(p) in SOURCE_EXTENSIONS]
            else:
                units = [(top, [p for p in files
                                if p.startswith(top + "/")])]
            for path, members in units:
                source = [p for p in members if _ext(p) in SOURCE_EXTENSIONS
                          or _ext(p) in NOTEBOOK_EXTENSIONS]
                if source:
                    boundaries.append({"kind": "script", "path": path,
                                       "members": members, "role": role})

    capped = []
    caps = {"script": MAX_SCRIPT_RECORDS, "chart": MAX_CHART_RECORDS,
            "dataset": MAX_DATASET_RECORDS}
    counts = {}
    for boundary in boundaries:
        kind = boundary["kind"]
        counts[kind] = counts.get(kind, 0) + 1
        if counts[kind] <= caps[kind]:
            capped.append(boundary)
    for kind, count in sorted(counts.items()):
        if count > caps[kind]:
            notes.append("Only the first %d of %d %s records are listed."
                         % (caps[kind], count, kind))
    return capped, notes, files


def manifests_in(files):
    return sorted(p for p in files if MANIFEST_RE.search(p))


def plan_repo_reads(files, limit=MAX_TEXT_FILES):
    """The files worth reading: manifests first, then each record's README,
    docstrings and notebooks, shared fairly (evidence.plan_reads)."""
    boundaries, _notes, kept = repo_boundaries(files)
    pairs = [(path, [path]) for path in manifests_in(kept)]
    # The repository's own README describes the code itself.
    pairs += [(p, [p]) for p in kept if "/" not in p and ev.is_readme(p)]
    pairs += [(b["path"], b["members"]) for b in boundaries
              if b["kind"] != "chart"]
    plan = []
    for path in manifests_in(kept):
        if path not in plan:
            plan.append(path)
    for path in ev.plan_reads(pairs, limit):
        if path not in plan:
            plan.append(path)
    return plan[:limit]


def _label(boundary):
    path, role = boundary["path"], boundary["role"]
    name = posixpath.basename(path)
    if boundary["kind"] == "script" and role == "library":
        return "%s/ (source code)" % path
    if len(boundary["members"]) > 1 or path not in boundary["members"]:
        return "%s/" % path
    return name if role in ("charts", "data") else path


def _imports(text, module):
    module = re.escape(module)
    return re.search(r"(?m)^\s*(?:from\s+%s(?:\.|\s)|import\s+%s\b)"
                     % (module, module), text or "") is not None


def analyze_repo_tree(files, texts, repo=None):
    """Pure classification of one repository inventory -- the unit under test.

    `repo` describes the repository ({"name", "version", "url"}) so the code
    itself becomes a Tool record that the scripts are linked to.
    """
    repo = repo or {}
    texts = texts or {}
    boundaries, notes, kept = repo_boundaries(files)
    charts, datasets, scripts, tools = [], [], [], []

    for boundary in boundaries:
        kind, path, members = (boundary["kind"], boundary["path"],
                               boundary["members"])
        label = _label(boundary)
        if kind == "script":
            sources = ev.build_sources("script", path, members, texts)
            header = (_script_header(path, texts.get(path))
                      if members == [path] else "")
            what = {
                "library": "The source code in %s (%d file(s))."
                           % (path, len(members)),
                "root": "A script at the top of the repository.",
            }.get(boundary["role"],
                  "One script record: %s%s." % (
                      path, "" if members == [path]
                      else " and everything in it (%d file(s))"
                      % len(members)))
            scripts.append(_candidate(
                "script", len(scripts),
                {"files": [path], "readme": "", "URLs": [], "extraFields": []},
                [what]
                + (["Header of %s: %s" % (path, header)] if header else [])
                + [_evidence_line(s) for s in sources],
                MEDIUM, members[:MAX_CANDIDATE_PATHS], needs_input=["readme"],
                field_evidence={"files": HIGH, "readme": NEEDS_INPUT,
                                "URLs": NEEDS_INPUT},
                label=label, file_count=len(members), ai_sources=sources,
                inventory=ev.inventory(members)))
            scripts[-1]["role"] = boundary["role"]
        elif kind == "dataset":
            sources = ev.build_sources("dataset", path, members, texts)
            described = [s for s in sources if s["type"] == "readme"]
            datasets.append(_candidate(
                "dataset", len(datasets),
                {"files": [path], "readme": "", "URLs": [], "extraFields": []},
                ["One dataset: %s (%d file(s))." % (path, len(members))]
                + ([_evidence_line(described[0])] if described else
                   ["Qresp cannot tell what these files mean -- the "
                    "description is left blank for you."]),
                MEDIUM if (len(members) > 1
                           or _ext(path) in DATASET_EXTENSIONS) else LOW,
                members[:MAX_CANDIDATE_PATHS], needs_input=["readme"],
                field_evidence={"files": HIGH, "readme": NEEDS_INPUT,
                                "URLs": NEEDS_INPUT},
                label=label, file_count=len(members), ai_sources=sources,
                inventory=ev.inventory(members)))
        elif kind == "chart":
            charts.append(_candidate(
                "chart", len(charts),
                {"imageFile": path, "files": [], "notebookFile": "",
                 "number": "", "caption": "", "properties": [],
                 "extraFields": []},
                ["An image in the repository's %s/ folder." % _top(path),
                 "Figure number, caption and properties are never derived "
                 "from a file name -- they are left blank."],
                MEDIUM, [path],
                needs_input=["caption", "number", "properties"],
                field_evidence={"imageFile": HIGH, "files": NEEDS_INPUT,
                                "notebookFile": NEEDS_INPUT,
                                "number": NEEDS_INPUT, "caption": NEEDS_INPUT,
                                "properties": NEEDS_INPUT},
                label=label, file_count=1,
                ai_sources=ev.build_sources("chart", path, [path], texts)))

    # The code itself: one software Tool, named after the repository and
    # versioned by its latest release when it has one.
    name = (repo.get("name") or "").strip()
    if name:
        version = (repo.get("version") or "").strip()
        tools.append(_candidate(
            "tool", 0,
            {"kind": "software", "packageName": name, "version": version,
             "executableName": "", "patches": [], "description": "",
             "urls": repo.get("url") or "", "extraFields": []},
            ["The code in this repository."]
            + (["Version %s is its latest release or tag." % version] if version
               else ["The repository has no release, so the version is "
                     "left for you to fill in (a tag or the commit)."]),
            HIGH, [repo.get("url") or name],
            needs_input=["description"] + ([] if version else ["version"]),
            field_evidence={"packageName": HIGH,
                            "version": HIGH if version else NEEDS_INPUT,
                            "executableName": NEEDS_INPUT,
                            "description": NEEDS_INPUT, "urls": HIGH,
                            "patches": NEEDS_INPUT},
            label="%s %s" % (name, version) if version else name))
        tools[-1]["role"] = "repository"

    # Pinned dependencies (manifests and `module load` lines), exactly as the
    # folder analysis reads them: a package without a stated version is not
    # a Tool.
    manifests = {p: texts[p] for p in manifests_in(kept) if p in texts}
    run_texts = {p: t for p, t in texts.items()
                 if _ext(p) in (".sh", ".bash") or p.endswith(".slurm")}
    for dependency in classify_tools(manifests, kept, run_texts):
        if len(tools) > MAX_DEPENDENCY_TOOLS:
            notes.append("Only the first %d pinned dependencies are listed."
                         % MAX_DEPENDENCY_TOOLS)
            break
        proposal = dependency["proposal"]
        if name and proposal.get("packageName", "").lower() == name.lower():
            continue
        if not (_PACKAGE_RE.match(proposal.get("packageName") or "")
                and _VERSION_RE.match(proposal.get("version") or "")):
            continue
        dependency["id"] = "tool-%d" % len(tools)
        dependency["label"] = "%s %s" % (proposal.get("packageName", ""),
                                         proposal.get("version", ""))
        dependency["role"] = "dependency"
        tools.append(dependency)

    groups = {"charts": charts, "datasets": datasets, "scripts": scripts,
              "tools": tools}
    for kind in groups:
        groups[kind] = [c for c in groups[kind] if _usable(c)]

    suggestions = _suggestions(groups, kept, texts)
    return groups, suggestions, notes


def _suggestions(groups, files, texts):
    try:
        found = autocurate.suggestions(groups, files, texts)
    except Exception as e:
        # Hints are optional; a bug in them must never cost the analysis.
        print("Repository suggestion pass skipped (%s)" % type(e).__name__)
        found = {"numbers": {}, "links": []}
    links = list(found.get("links") or [])

    scripts = groups["scripts"]
    for tool in groups["tools"]:
        package = (tool["proposal"].get("packageName") or "")
        module = package.lower().replace("-", "_")
        for script in scripts:
            if tool.get("role") == "repository":
                # Library source IS the repository, not a user of it.
                if script.get("role") == "library":
                    continue
                links.append({
                    "from": tool["id"], "to": script["id"], "type": USES_TOOL,
                    "reason": "%s is part of the %s repository."
                              % (script["label"], package),
                    "confidence": MEDIUM})
                continue
            members = [p for p in script["paths"] if p in texts]
            if module and any(_imports(texts[p], module) for p in members):
                links.append({
                    "from": tool["id"], "to": script["id"], "type": USES_TOOL,
                    "reason": "%s imports %s." % (script["label"], package),
                    "confidence": HIGH})
    return {"numbers": found.get("numbers") or {}, "links": links}


# ---- the repository host ------------------------------------------------------------

class RepoError(Exception):
    """A user-facing reason the repository could not be analyzed."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


_SEGMENT_RE = re.compile(r"^[A-Za-z0-9_.-]+$")
# A dependency Tool needs a real package name and a real version number; a
# constraint the manifest parser could not split ("scipy!=1.5.0") is not one.
_PACKAGE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.\-]*$")
_VERSION_RE = re.compile(r"^v?\d+(\.\d+)*([.\-+]?[A-Za-z0-9]+)*$")
_HEADERS = {"User-Agent": "Qresp/2.0 (curation repository analysis)"}


def parse_repo_url(raw):
    """(host, path) for a GitHub or GitLab repository link, or RepoError.

    Accepts the usual ways of writing one: https URL with or without a
    trailing /tree/..., a `git@host:path.git` remote, or a bare host/path.
    """
    value = str(raw or "").strip()
    if not value:
        raise RepoError("Enter the repository link first.")
    ssh = re.match(r"^git@([^:]+):(.+)$", value)
    if ssh:
        value = "https://%s/%s" % ssh.groups()
    if "://" not in value:
        value = "https://" + value
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if parsed.username or parsed.password or parsed.port:
        raise RepoError("That link does not look like a repository.")
    segments = [s for s in parsed.path.split("/") if s]
    if host == "github.com":
        segments = segments[:2]
    elif host == "gitlab.com":
        if "-" in segments:
            segments = segments[:segments.index("-")]
    else:
        raise RepoError("Only GitHub and GitLab repositories can be read. For "
                        "code elsewhere, choose \"RCC file server\" and point "
                        "Qresp at its folder.")
    if segments and segments[-1].endswith(".git"):
        segments[-1] = segments[-1][:-4]
    if len(segments) < 2 or not all(
            _SEGMENT_RE.match(s) and s not in (".", "..") for s in segments):
        raise RepoError("That link does not look like a repository.")
    return host, "/".join(segments)


def _get(url, headers=None, params=None):
    response = requests.get(url, headers=dict(_HEADERS, **(headers or {})),
                            params=params, timeout=REQUEST_TIMEOUT)
    if response.status_code == 404:
        raise RepoError("No public repository was found at that link.", 404)
    if response.status_code in (403, 429):
        raise RepoError("The repository host is limiting requests from this "
                        "server. Try again in a while; an administrator can "
                        "raise the limit with QRESP_GITHUB_TOKEN.", 503)
    response.raise_for_status()
    return response


def _github_headers():
    token = os.environ.get("QRESP_GITHUB_TOKEN", "").strip()
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    return headers


def fetch_github(path):
    api = "https://api.github.com/repos/" + path
    headers = _github_headers()
    info = _get(api, headers).json()
    branch = info.get("default_branch") or "main"
    sha = _get("%s/commits/%s" % (api, quote(branch, safe="")),
               dict(headers, Accept="application/vnd.github.sha")).text.strip()
    if not re.match(r"^[0-9a-f]{40}$", sha):
        raise RepoError("The repository's latest commit could not be read.",
                        502)
    tree = _get("%s/git/trees/%s" % (api, sha), headers,
                params={"recursive": "1"}).json()
    files = [entry["path"] for entry in tree.get("tree") or []
             if entry.get("type") == "blob"]
    version = ""
    try:
        version = (_get(api + "/releases/latest", headers).json()
                   .get("tag_name") or "")
    except RepoError:
        pass
    if not version:
        # Many scientific codes tag versions without publishing a release.
        try:
            tags = _get(api + "/tags", headers, params={"per_page": 1}).json()
            version = (tags[0].get("name") or "") if tags else ""
        except RepoError:
            pass  # Neither: the version is left for the curator.
    return {
        "host": "github",
        "path": path,
        "name": info.get("name") or path.split("/")[-1],
        "url": info.get("html_url") or "https://github.com/" + path,
        "branch": branch,
        "commit": sha,
        "version": version,
        "files": files[:MAX_TREE_FILES],
        "truncated": bool(tree.get("truncated")) or len(files) > MAX_TREE_FILES,
        "files_base": "https://github.com/%s/blob/%s" % (path, sha),
        "raw_base": "https://raw.githubusercontent.com/%s/%s" % (path, sha),
    }


def fetch_gitlab(path):
    api = "https://gitlab.com/api/v4/projects/" + quote(path, safe="")
    info = _get(api).json()
    branch = info.get("default_branch") or "main"
    sha = (_get("%s/repository/commits/%s" % (api, quote(branch, safe="")))
           .json().get("id") or "")
    if not re.match(r"^[0-9a-f]{40}$", sha):
        raise RepoError("The repository's latest commit could not be read.",
                        502)
    files, page, truncated = [], 1, False
    while page:
        if page > MAX_GITLAB_PAGES or len(files) >= MAX_TREE_FILES:
            truncated = True
            break
        response = _get(api + "/repository/tree", params={
            "recursive": "true", "per_page": 100, "ref": sha, "page": page})
        files += [entry["path"] for entry in response.json()
                  if entry.get("type") == "blob"]
        page = int(response.headers.get("X-Next-Page") or 0)
    version = ""
    try:
        releases = _get(api + "/releases", params={"per_page": 1}).json()
        version = (releases[0].get("tag_name") or "") if releases else ""
        if not version:
            tags = _get(api + "/repository/tags",
                        params={"per_page": 1}).json()
            version = (tags[0].get("name") or "") if tags else ""
    except RepoError:
        pass
    return {
        "host": "gitlab",
        "path": path,
        "name": info.get("name") or path.split("/")[-1],
        "url": info.get("web_url") or "https://gitlab.com/" + path,
        "branch": branch,
        "commit": sha,
        "version": version,
        "files": files[:MAX_TREE_FILES],
        "truncated": truncated,
        "files_base": "https://gitlab.com/%s/-/blob/%s" % (path, sha),
        "raw_base": "https://gitlab.com/%s/-/raw/%s" % (path, sha),
    }


FETCHERS = {"github.com": fetch_github, "gitlab.com": fetch_gitlab}


def _read_text(url):
    response = requests.get(url, headers=_HEADERS, timeout=REQUEST_TIMEOUT,
                            stream=True)
    response.raise_for_status()
    content = response.raw.read(MAX_TEXT_BYTES, decode_content=True) or b""
    return content.decode("utf-8", errors="replace")


def analyze_repo_url(raw, fetchers=None, read_text=None):
    """Fetch, read and classify one repository. Network calls are injectable
    so the whole flow is testable offline."""
    host, path = parse_repo_url(raw)
    repo = (fetchers or FETCHERS)[host](path)
    read_text = read_text or _read_text
    if not repo["files"]:
        raise RepoError("The repository has no files.", 404)

    texts, notes, skipped = {}, [], 0
    wanted = plan_repo_reads(repo["files"])
    for file_path in wanted:
        try:
            texts[file_path] = read_text(
                "%s/%s" % (repo["raw_base"], quote(file_path)))
        except Exception:
            # One unreadable file skips its own evidence and nothing else.
            skipped += 1
    if skipped:
        print("Repository evidence reads skipped: %d" % skipped)
    if repo["truncated"]:
        notes.append("The repository is large; only the first %d files were "
                     "looked at." % len(repo["files"]))

    groups, suggestions, more_notes = analyze_repo_tree(
        repo["files"], texts, repo)
    notes += more_notes
    counts = {key: len(value) for key, value in groups.items()}
    print("Repository analysis: host=%s files=%d read=%d candidates=%s"
          % (repo["host"], len(repo["files"]), len(texts), counts))
    return {
        # Every record path is relative to this, exactly as a paper's are to
        # its file-server folder: the curator's form stores it as the
        # record's file server path, so each file links to this commit.
        "root": repo["files_base"],
        "repo": {key: repo[key] for key in (
            "host", "path", "name", "url", "branch", "commit", "version",
            "files_base")},
        "counts": dict(counts, files=len(repo["files"])),
        "truncated": repo["truncated"],
        "warnings": notes,
        "candidates": groups,
        "suggestions": suggestions,
    }


@csrf_protect
def analyze_repo(body):
    """
    Inventory and classify a GitHub or GitLab repository
    Handler for POST: /api/curation/analyze-repo

    Read-only: nothing is stored, published, or logged beyond counts.
    """
    if not get_current_user():
        return {"error": "authentication required"}, 401
    try:
        return analyze_repo_url((body or {}).get("url")), 200
    except RepoError as e:
        return {"error": str(e)}, e.status
    except requests.exceptions.RequestException as e:
        print("Repository analysis failed: %s" % type(e).__name__)
        return {"error": "The repository could not be read. Check the link "
                         "and try again."}, 502
