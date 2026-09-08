import {
  CHART,
  CONSUMES,
  DATASET,
  GENERATES,
  LINKS_TO,
  SCRIPT,
  fromStoredEdge,
  prefixOf,
} from "./workflowGraph";

// WHAT ONE SCRIPT SAYS ABOUT ITS OWN FILES.
//
// The backend parses each script and notebook and reports plain facts: this
// file calls this I/O function with this literal path, at this line. It knows
// nothing about artifacts. This turns those facts into what a curator is
// asked about, for ONE script at a time -- the script whose row they pressed.
//
// Nothing here compares names. `dos.py` and `dos.png` are not related by both
// being called `dos`; they are related when `dos.py` contains
// `plt.savefig("dos.png")`. A resemblance is not evidence, and a suggested
// arrow that a curator accepts becomes part of a published record.

const clean = (value) => String(value == null ? "" : value).trim();

// Files this can do something with. `.py` and `.ipynb` are PARSED -- their
// literal paths become the certain suggestions below.
//
// `.sh` holds no such path of its own: a shell line builds its arguments at
// run time. What it does hold is what it literally RUNS, and `sourceClosure`
// follows that -- `python scripts/plot.py` and the rest -- to the Python or
// notebook that does the reading and writing. So a Script whose only file is
// a shell script has a source and its row's action stays live: the answer
// comes from one line down, attributed to the wrapper that was pressed.
//
// Where a line does not state what it runs, that is the end of it. Nothing
// guesses at the rest.
const PARSED_SUFFIXES = [".py", ".ipynb"];
const SHELL_SUFFIXES = [".sh"];
const SOURCE_SUFFIXES = PARSED_SUFFIXES.concat(SHELL_SUFFIXES);

// A Script record may legitimately list many files, and a conservative bound
// keeps one pathological record from turning a review into a wall. Anything
// past it is REPORTED by name rather than dropped: choosing the first few
// quietly is exactly the behaviour this replaced.
export const MAX_SOURCES = 20;

// Following a wrapper is bounded twice: how deep, and how many files in
// total. A pipeline that runs a pipeline that runs a pipeline is real; one
// that does it forty times deep is a reason to stop and say so.
export const MAX_SHELL_HOPS = 4;
export const MAX_CLOSURE = 30;

export const SKIP_SOURCE_CAP = "source_cap";
export const SKIP_HOP_CAP = "hop_cap";
export const SKIP_CLOSURE_CAP = "closure_cap";
// Not a file that could not be READ -- a file whose OWNER cannot be decided,
// because two artifacts in this draft store the same path. Reported through
// the same channel, because from the curator's side it is the same fact:
// this line of code was understood, and no proposal could be made from it.
export const SKIP_AMBIGUOUS = "ambiguous_path";

/**
 * EVERY RCC source file of a Script artifact, in a stable order.
 *
 * A Script typed in by hand has no `files` at all, and one whose files are a
 * Fortran program or a shell script has nothing this can parse. Both are
 * ordinary, and both mean there is nothing to detect.
 *
 * All of them, not the first one. A script recorded as two files -- the
 * driver and the notebook it was refactored out of, or a pipeline split in
 * two -- had everything after the first silently ignored, so a figure
 * generated in the second file simply did not exist as far as this was
 * concerned.
 */
export const sourcesOf = (artifact) => {
  const files = ((artifact || {}).files) || [];
  const found = files
    .map((value) => clean(value).replace(/^\.\//, ""))
    .filter((path) =>
      SOURCE_SUFFIXES.some((suffix) => path.toLowerCase().endsWith(suffix))
    );
  // Deduplicated and ordered, so the same record always reads the same way.
  return Array.from(new Set(found)).sort();
};

/** The sources past the cap, named so the review can say what it skipped. */
export const cappedSources = (artifact) =>
  sourcesOf(artifact)
    .slice(MAX_SOURCES)
    .map((path) => ({ path, reason: SKIP_SOURCE_CAP }));

/** Kept for callers that only need to know WHETHER there is a source. */
export const sourceOf = (artifact) => sourcesOf(artifact)[0] || "";

/** The subset the static parser can actually read. */
export const parsedSourcesOf = (artifact) =>
  sourcesOf(artifact).filter((path) =>
    PARSED_SUFFIXES.some((suffix) => path.toLowerCase().endsWith(suffix))
  );

/** Every stored path of one artifact, normalised for exact comparison. */
const pathsOf = (artifact, id) => {
  const kind = prefixOf(id);
  const out = [];
  const push = (value) => {
    const text = clean(value).replace(/^\.\//, "");
    if (text) out.push(text);
  };
  if (kind === CHART) {
    // The figure's own image. `files` are its INPUTS -- a script writing one
    // of those has not made the figure, so it is not `generates` evidence.
    push(artifact && artifact.imageFile);
  } else {
    (((artifact || {}).files) || []).forEach(push);
  }
  return out;
};

/** Every artifact of these kinds that stores this exact path. */
export const ownersOf = (path, byId, kinds) => {
  const wanted = clean(path);
  return Object.keys(byId || {}).filter(
    (id) =>
      kinds.includes(prefixOf(id)) && pathsOf(byId[id], id).includes(wanted)
  );
};

/**
 * The artifact a path belongs to, or "" when it is not exactly one artifact's.
 *
 * Two artifacts storing the same path is a real possibility, and it makes the
 * arrow ambiguous rather than obvious. An ambiguous arrow is refused.
 *
 * Callers that need to tell "nobody has this path" from "several do" ask
 * `ownersOf` -- the difference decides whether a proposal is offered or
 * withheld, and this function cannot express it.
 */
export const ownerOf = (path, byId, kinds) => {
  const owners = ownersOf(path, byId, kinds);
  return owners.length === 1 ? owners[0] : "";
};

// What a written file is TAKEN to be, by the only thing that can say so
// without guessing: the call that wrote it. `savefig` writes an image;
// `to_csv`, `to_parquet`, `to_excel`, `numpy.save` and `numpy.savez` write
// data. The file's extension is deliberately NOT consulted -- a `.dat` from
// savefig is still a figure, and a `.png` from to_csv would be a mistake
// worth showing rather than silently reclassifying.
const FIGURE_WRITERS = ["savefig"];

const writesAnImage = (call) =>
  FIGURE_WRITERS.some((name) => String(call || "").endsWith(name));

// WHAT ONE LINE WOULD BECOME: the group it belongs to and the kind of
// artifact on the other end. Shared, so the list of proposals and the list of
// paths abstained from are always talking about the same thing.
const shapeOf = (link) => {
  if (link.mode === "read") return { group: GROUP_INPUT, kind: "dataset" };
  if (writesAnImage(link.call)) return { group: GROUP_FIGURE, kind: "chart" };
  return { group: GROUP_OUTPUT, kind: "dataset" };
};

const kindsFor = (kind) => [kind === "chart" ? CHART : DATASET];

export const GROUP_INPUT = "input_datasets";
export const GROUP_FIGURE = "output_figures";
export const GROUP_OUTPUT = "output_datasets";

export const GROUP_LABEL = {
  [GROUP_INPUT]: "Input datasets",
  [GROUP_FIGURE]: "Output figures",
  [GROUP_OUTPUT]: "Output datasets",
};

// ONE RELATIONSHIP, however many places state it. Two of a script's files
// can read the same dataset, and that is one arrow with two reasons -- not
// two identical proposals for the curator to notice are the same.
export const detectionKey = (item) => `${item.group}:${item.path}`;

/**
 * EVERY SOURCE THIS SCRIPT REACHES, and how it got to each one.
 *
 * A wrapper is usually the only file recorded as "the script", and the file
 * that actually reads a dataset is one line down:
 *
 *     pipeline.sh:4   runs scripts/plot.py
 *     scripts/plot.py:18   reads data/spectra.csv
 *
 * The backend has already read which source each shell script LITERALLY says
 * it runs -- `python scripts/plot.py`, and nothing whose target is a variable
 * or a glob. This walks that, breadth-first from the artifact's own files.
 *
 * Bounded in three ways, and every file left out is named rather than
 * dropped: a visited set (so `a.sh -> b.sh -> a.sh` reads each once and
 * stops), a hop limit, and a total limit. Deterministic: the same folder
 * gives the same closure in the same order.
 */
export const sourceClosure = (startSources, shellCalls) => {
  const byCaller = new Map();
  (shellCalls || []).forEach((call) => {
    if (!call || !call.from || !call.to) return;
    if (!byCaller.has(call.from)) byCaller.set(call.from, []);
    byCaller.get(call.from).push(call);
  });
  byCaller.forEach((calls) =>
    calls.sort((a, b) => a.line - b.line || (a.to < b.to ? -1 : 1))
  );

  const chains = new Map();
  const skipped = [];
  const order = [];
  const seen = new Set();

  const queue = (startSources || []).map((path) => ({ path, hops: 0 }));
  queue.forEach((entry) => {
    if (!seen.has(entry.path)) {
      seen.add(entry.path);
      chains.set(entry.path, []);
      order.push(entry.path);
    }
  });

  for (let index = 0; index < queue.length; index += 1) {
    const { path, hops } = queue[index];
    const calls = byCaller.get(path) || [];
    if (!calls.length) continue;
    if (hops >= MAX_SHELL_HOPS) {
      calls.forEach((call) => {
        if (!seen.has(call.to)) {
          skipped.push({ path: call.to, reason: SKIP_HOP_CAP });
        }
      });
      continue;
    }
    calls.forEach((call) => {
      // Already reached -- by a shorter route, or because it IS one of the
      // artifact's own files. A cycle ends here.
      if (seen.has(call.to)) return;
      if (order.length >= MAX_CLOSURE) {
        skipped.push({ path: call.to, reason: SKIP_CLOSURE_CAP });
        return;
      }
      seen.add(call.to);
      chains.set(call.to, (chains.get(path) || []).concat([call]));
      order.push(call.to);
      queue.push({ path: call.to, hops: hops + 1 });
    });
  }

  return { sources: order, chains, skipped };
};

/** How a source was reached, said the way a curator would follow it. */
export const describeChain = (chain) =>
  (chain || []).map(
    (call) => `${call.from}:${call.line} runs ${call.to}`
  );

/** The name to show for a file nothing in the draft has claimed yet. */
export const fileName = (path) => String(path || "").split("/").pop() || path;

/**
 * What this one script's code says, grouped the way a curator reads it.
 *
 * `links` is the backend's `code_links`; `scriptId` is the Script artifact
 * whose row was pressed; `byId` maps artifact id -> record; `edges` is the
 * stored edge list, so a relationship that already runs this way is not
 * offered again.
 *
 * Every item carries the direction the edge would be STORED in. For a file
 * the draft already holds, that is a complete edge. For one it does not, the
 * other end does not exist yet and `edge` is null -- the artifact has to be
 * made first, and it is made only if the curator asks.
 */
export const detectionsFor = (links, scriptId, byId, edges, shellCalls) => {
  const script = (byId || {})[scriptId];
  const start = sourcesOf(script).slice(0, MAX_SOURCES);
  if (!start.length) return [];
  // The artifact's own files, plus every source they literally say they run.
  const { sources: reachable, chains } = sourceClosure(start, shellCalls);
  const sources = new Set(reachable);

  const existing = new Set(
    (edges || []).map(fromStoredEdge).map((edge) => `${edge.from}>${edge.to}`)
  );
  const byKey = new Map();
  const out = [];

  (links || []).forEach((link) => {
    if (!link || !link.path || !sources.has(link.script)) return;

    const evidence = {
      script: link.script,
      line: link.line,
      cell: link.cell == null ? null : link.cell,
      call: link.call,
      // The path AS WRITTEN in the code, which is what the curator will find
      // when they open the file -- not the resolved one.
      literal: link.literal || link.path,
      // HOW THIS SCRIPT REACHES THAT FILE. Empty when the artifact's own
      // file is the one that reads it; a list of shell lines when a wrapper
      // is what the curator pressed and something further down did the work.
      // Without it, "why is this relationship on pipeline.sh?" has no answer
      // on screen.
      via: chains.get(link.script) || [],
    };

    const { group, kind } = shapeOf(link);

    const owners = ownersOf(link.path, byId, kindsFor(kind));
    // Two artifacts already store this path. Which one the arrow belongs to
    // is the curator's question, not this reader's, and proposing a third
    // artifact holding the same path is not an answer to it. The file is
    // named instead -- see `ambiguousPaths`.
    if (owners.length > 1) return;
    const existingId = owners[0] || "";

    // The arrow, in the order it will be stored. `links_to` for a dataset a
    // script produced is the generic directional edge on purpose: "this
    // script made this data" has no vocabulary of its own in Qresp, and
    // inventing one would put a word in the record nothing else understands.
    const type =
      group === GROUP_INPUT
        ? CONSUMES
        : group === GROUP_FIGURE
        ? GENERATES
        : LINKS_TO;
    const from = group === GROUP_INPUT ? existingId : scriptId;
    const to = group === GROUP_INPUT ? scriptId : existingId;

    if (existingId) {
      if (existingId === scriptId) return;
      if (existing.has(`${from}>${to}`)) return;
    }

    const item = {
      group,
      kind,
      path: link.path,
      name: fileName(link.path),
      existingId,
      direction: group === GROUP_INPUT ? "into" : "outOf",
      type,
      edge: existingId ? { from, to, type } : null,
      // EVERY place the code says it, in the order the files were read.
      // One arrow, and all the reasons a curator can go and check.
      evidences: [evidence],
    };
    const key = detectionKey(item);
    const already = byKey.get(key);
    if (already) {
      const same = already.evidences.some(
        (entry) =>
          entry.script === evidence.script &&
          entry.line === evidence.line &&
          entry.cell === evidence.cell
      );
      if (!same) already.evidences.push(evidence);
      return;
    }
    byKey.set(key, item);
    out.push(item);
  });

  // Stable however the facts arrived.
  out.forEach((item) =>
    item.evidences.sort((a, b) =>
      a.script === b.script
        ? (a.cell || 0) - (b.cell || 0) || a.line - b.line
        : a.script < b.script
        ? -1
        : 1
    )
  );
  return out;
};

/**
 * The paths this refused to propose anything for, because more than one
 * artifact in the draft already stores each of them.
 *
 * Deliberately a separate list rather than a disabled row: nothing about the
 * code is wrong, and there is no decision for the curator to make HERE. What
 * they need is the filename and the reason, in the same place they are told
 * about a source that was too large or could not be parsed.
 */
export const ambiguousPaths = (links, scriptId, byId, shellCalls) => {
  const script = (byId || {})[scriptId];
  const start = sourcesOf(script).slice(0, MAX_SOURCES);
  if (!start.length) return [];
  const { sources: reachable } = sourceClosure(start, shellCalls);
  const sources = new Set(reachable);

  const seen = new Set();
  const out = [];
  (links || []).forEach((link) => {
    if (!link || !link.path || !sources.has(link.script)) return;
    const { kind } = shapeOf(link);
    if (ownersOf(link.path, byId, kindsFor(kind)).length < 2) return;
    if (seen.has(link.path)) return;
    seen.add(link.path);
    out.push({ path: link.path, reason: SKIP_AMBIGUOUS });
  });
  return out;
};

/** The three groups, in reading order, with empty ones dropped. */
export const groupDetections = (items) =>
  [GROUP_INPUT, GROUP_FIGURE, GROUP_OUTPUT]
    .map((group) => ({
      group,
      label: GROUP_LABEL[group],
      items: (items || []).filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

/** The shortest way to point at one place: `plot.py:42`, `prep.ipynb:3:18`. */
export const evidenceAt = (evidence) =>
  evidence.cell == null
    ? `${evidence.script}:${evidence.line}`
    : `${evidence.script}:cell ${evidence.cell}:${evidence.line}`;

/** Where the evidence is, said the way a curator would look for it. */
export const describeEvidence = (evidence) => {
  const where =
    evidence.cell == null
      ? `line ${evidence.line}`
      : `cell ${evidence.cell}, line ${evidence.line}`;
  return `${evidence.script}, ${where} — ${evidence.call}("${evidence.literal}")`;
};

/** The draft a proposed artifact starts from: what the code already told us. */
export const proposalSeed = (item) =>
  item.kind === "chart"
    ? { imageFile: item.path }
    : { files: item.path };

export const SCRIPT_KIND = SCRIPT;

export default detectionsFor;
