from unittest import mock

from project import repoanalysis as ra
from project.tests.test_curation import CurationTestBase

SHA = "a" * 40

# A small scientific code base, laid out the usual way.
FILES = [
    "README.md",
    "run_all.py",
    "setup.py",
    "requirements.txt",
    "mycode/__init__.py",
    "mycode/solver.py",
    "src/fastpart/kernel.c",
    "examples/si_bands/run.py",
    "examples/si_bands/input.in",
    "examples/quick.py",
    "scripts/plot_bands.py",
    "data/bands/si.dat",
    "data/lattice.csv",
    "figures/bands.png",
    "figures/logo.png",
    "docs/conf.py",
    "docs/index.rst",
    "tests/test_solver.py",
    ".github/workflows/ci.yml",
    "node_modules/x/index.js",
    "docker/build.sh",
]

TEXTS = {
    "requirements.txt": "numpy==1.26.4\nscipy>=1.10\nmatplotlib==3.8.0\n",
    "scripts/plot_bands.py": (
        '"""Plot the silicon band structure."""\n'
        "import numpy as np\n"
        "import mycode\n"
        "data = np.loadtxt('si.dat')\n"
        "savefig('bands.png')\n"),
    "examples/quick.py": "import matplotlib.pyplot as plt\n",
}

REPO = {"name": "mycode", "version": "v1.2.0",
        "url": "https://github.com/org/mycode"}


def labels(groups, kind):
    return [c["label"] for c in groups[kind]]


class TestParseRepoUrl(CurationTestBase):
    def test_usual_ways_of_writing_a_repository(self):
        for raw in ("https://github.com/org/mycode",
                    "github.com/org/mycode/tree/main/src",
                    "https://www.github.com/org/mycode.git",
                    "git@github.com:org/mycode.git"):
            self.assertEqual(("github.com", "org/mycode"),
                             ra.parse_repo_url(raw), raw)
        self.assertEqual(("gitlab.com", "group/sub/proj"),
                         ra.parse_repo_url(
                             "https://gitlab.com/group/sub/proj/-/tree/main"))

    def test_other_hosts_and_unsafe_paths_are_refused(self):
        for raw in ("", "https://example.org/org/repo", "https://github.com/org",
                    "https://user:pw@github.com/org/repo",
                    "https://github.com:8443/org/repo",
                    "https://github.com/org/re po",
                    "https://gitlab.com/../etc/-/tree"):
            with self.assertRaises(ra.RepoError, msg=raw):
                ra.parse_repo_url(raw)


class TestRepoBoundaries(CurationTestBase):
    def setUp(self):
        super().setUp()
        self.groups, self.suggestions, self.notes = ra.analyze_repo_tree(
            FILES, TEXTS, REPO)

    def test_scripts_people_run_are_one_record_each(self):
        scripts = labels(self.groups, "scripts")
        self.assertIn("run_all.py", scripts)
        self.assertIn("examples/si_bands/", scripts)
        self.assertIn("examples/quick.py", scripts)
        self.assertIn("scripts/plot_bands.py", scripts)

    def test_library_code_is_one_record_per_package(self):
        scripts = labels(self.groups, "scripts")
        self.assertIn("mycode/ (source code)", scripts)
        self.assertIn("src/fastpart/ (source code)", scripts)

    def test_tooling_tests_docs_and_setup_are_left_out(self):
        paths = [p for kind in self.groups.values() for c in kind
                 for p in c["paths"]]
        for left_out in ("setup.py", "docs/conf.py", "tests/test_solver.py",
                         ".github/workflows/ci.yml",
                         "node_modules/x/index.js", "docker/build.sh"):
            self.assertNotIn(left_out, paths, left_out)
        self.assertTrue(any("test file" in note for note in self.notes))

    def test_data_and_figures_folders_are_read_like_a_paper_folder(self):
        self.assertEqual(["data/bands/", "lattice.csv"],
                         labels(self.groups, "datasets"))
        # A decorative image is never a figure.
        self.assertEqual(["bands.png"], labels(self.groups, "charts"))

    def test_the_repository_itself_is_a_tool_with_its_release(self):
        tool = self.groups["tools"][0]["proposal"]
        self.assertEqual(("software", "mycode", "v1.2.0",
                          "https://github.com/org/mycode"),
                         (tool["kind"], tool["packageName"], tool["version"],
                          tool["urls"]))

    def test_only_pinned_dependencies_become_tools(self):
        self.assertEqual(["mycode v1.2.0", "numpy 1.26.4", "matplotlib 3.8.0"],
                         labels(self.groups, "tools"))

    def test_workflow_links(self):
        ids = {c["label"]: c["id"] for kind in self.groups.values()
               for c in kind}
        links = {(l["from"], l["to"], l["type"])
                 for l in self.suggestions["links"]}
        plot = ids["scripts/plot_bands.py"]
        # The script reads the data and writes the figure.
        self.assertIn((ids["data/bands/"], plot, "consumes"), links)
        self.assertIn((plot, ids["bands.png"], "generates"), links)
        # Tools are linked to the scripts that use them.
        self.assertIn((ids["mycode v1.2.0"], plot, "uses_tool"), links)
        self.assertIn((ids["numpy 1.26.4"], plot, "uses_tool"), links)
        self.assertIn((ids["matplotlib 3.8.0"], ids["examples/quick.py"],
                       "uses_tool"), links)
        # Library source is the repository, not a user of it.
        self.assertNotIn((ids["mycode v1.2.0"], ids["mycode/ (source code)"],
                          "uses_tool"), links)

    def test_no_release_leaves_the_version_to_the_curator(self):
        groups, _s, _n = ra.analyze_repo_tree(
            FILES, TEXTS, dict(REPO, version=""))
        tool = groups["tools"][0]
        self.assertEqual("", tool["proposal"]["version"])
        self.assertIn("version", tool["needs_input"])

    def test_unparseable_constraints_are_not_tools(self):
        texts = dict(TEXTS, **{"requirements.txt": "scipy!=1.5.0,!=1.5.1\n"})
        groups, _s, _n = ra.analyze_repo_tree(FILES, texts, REPO)
        self.assertEqual(["mycode v1.2.0"], labels(groups, "tools"))

    def test_reads_manifests_first_and_stays_bounded(self):
        plan = ra.plan_repo_reads(FILES, limit=5)
        self.assertEqual("requirements.txt", plan[0])
        self.assertLessEqual(len(plan), 5)
        self.assertNotIn("tests/test_solver.py", ra.plan_repo_reads(FILES))


def fake_github(path):
    return {"host": "github", "path": path, "name": "mycode",
            "url": "https://github.com/" + path, "branch": "main",
            "commit": SHA, "version": "v1.2.0", "files": FILES,
            "truncated": False,
            "files_base": "https://github.com/%s/blob/%s" % (path, SHA),
            "raw_base": "https://raw.githubusercontent.com/%s/%s" % (path, SHA)}


class TestAnalyzeRepoUrl(CurationTestBase):
    def test_pins_every_read_and_link_to_one_commit(self):
        read = []

        def read_text(url):
            read.append(url)
            return TEXTS.get(url.split(SHA + "/", 1)[1], "")

        out = ra.analyze_repo_url("https://github.com/org/mycode",
                                  fetchers={"github.com": fake_github},
                                  read_text=read_text)
        self.assertEqual("https://github.com/org/mycode/blob/" + SHA,
                         out["root"])
        self.assertEqual(SHA, out["repo"]["commit"])
        self.assertTrue(read)
        for url in read:
            self.assertTrue(url.startswith(
                "https://raw.githubusercontent.com/org/mycode/%s/" % SHA), url)
        # The same candidate format as the folder analysis.
        self.assertEqual({"charts", "datasets", "scripts", "tools"},
                         set(out["candidates"]))
        self.assertIn("links", out["suggestions"])

    def test_an_unreadable_file_costs_only_its_own_evidence(self):
        def read_text(url):
            raise RuntimeError("boom")

        out = ra.analyze_repo_url("github.com/org/mycode",
                                  fetchers={"github.com": fake_github},
                                  read_text=read_text)
        self.assertTrue(out["candidates"]["scripts"])


class TestAnalyzeRepoEndpoint(CurationTestBase):
    def post(self, url="https://github.com/org/mycode", csrf=True):
        headers = ({"X-CSRF-Token": self.csrf}
                   if csrf and getattr(self, "csrf", None) else {})
        with mock.patch.dict(ra.FETCHERS, {"github.com": fake_github}), \
                mock.patch("project.repoanalysis._read_text",
                           side_effect=lambda url: ""):
            return self.client.post("/api/curation/analyze-repo",
                                    json={"url": url}, headers=headers)

    def test_requires_sign_in(self):
        self.assertEqual(401, self.post(csrf=False).status_code)

    def test_requires_csrf(self):
        self.login()
        self.assertEqual(403, self.post(csrf=False).status_code)

    def test_analyzes_a_repository(self):
        self.login()
        response = self.post()
        self.assertEqual(200, response.status_code)
        self.assertEqual(SHA, response.json()["repo"]["commit"])

    def test_other_hosts_are_a_400_without_any_request(self):
        self.login()
        with mock.patch("project.repoanalysis.requests.get") as get:
            response = self.post(url="https://example.org/org/repo")
        self.assertEqual(400, response.status_code)
        get.assert_not_called()
