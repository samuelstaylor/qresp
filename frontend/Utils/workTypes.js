// What a Qresp record curates. "paper" is a published paper -- every record
// and draft from before this list existed. The backend mirror is
// project.models.WORK_TYPES, and schema.json's work_type rules hold only a
// published paper to the journal / volume / page / at-least-one-figure
// contract.
//
// Labels here are what the curator reads in the chooser, the reference
// section and on the record; nothing below changes what is stored.
export const WORK_TYPES = {
  paper: {
    label: "Published paper",
    short: "Paper",
    description:
      "A journal article, conference paper or preprint. Link each figure to the data and code that made it.",
    heading: "Publication Information for This Paper",
    newHeading: "New Paper Submission",
    titleLabel: "Title",
    titleHelp: "Enter title of the paper",
    authorsLabel: "Authors",
    abstractLabel: "Abstract",
    abstractHelp: "Enter abstract",
    urlLabel: "URL",
    urlHelp: "Enter paper url",
    paperFields: true,
    needsFigures: true,
  },
  report: {
    label: "Unpublished paper or report",
    short: "Report",
    description:
      "A manuscript in preparation, technical report, thesis or white paper that has not been published.",
    heading: "About This Report",
    newHeading: "New Report Submission",
    titleLabel: "Title",
    titleHelp: "Title of the paper or report",
    authorsLabel: "Authors",
    abstractLabel: "Abstract",
    abstractHelp: "A summary of the work",
    venueLabel: "Institution or series",
    venueHelp: "Optional. Where it comes from, e.g. Argonne National Laboratory technical report",
    urlLabel: "URL",
    urlHelp: "Optional. Where the paper or report can be read",
  },
  software: {
    label: "Code repository",
    short: "Code",
    description:
      "A GitHub or GitLab repository or other code base: what it does, who wrote it, and its scripts and tools.",
    heading: "About This Code Repository",
    newHeading: "New Code Repository",
    titleLabel: "Repository or project name",
    titleHelp: "e.g. WEST or qresp-code-development/qresp",
    authorsLabel: "Developers",
    abstractLabel: "Description",
    abstractHelp: "What the code does and what it is used for",
    urlLabel: "Repository URL",
    urlHelp: "Where the code lives, e.g. https://github.com/org/repo",
    urlRequired: true,
  },
  dataset: {
    label: "Dataset",
    short: "Dataset",
    description:
      "A collection of data files: what they contain, how they were produced and where they live.",
    heading: "About This Dataset",
    newHeading: "New Dataset",
    titleLabel: "Dataset name",
    titleHelp: "A descriptive name for the data",
    authorsLabel: "Creators",
    abstractLabel: "Description",
    abstractHelp: "What the data contain and how they were produced",
    urlLabel: "Landing page URL",
    urlHelp: "Optional. A page describing the data, if it has one",
  },
  other: {
    label: "Other",
    short: "Other",
    description:
      "Anything else worth making reproducible: slides, a poster, a tutorial, a simulation campaign.",
    heading: "About This Work",
    newHeading: "New Submission",
    titleLabel: "Title",
    titleHelp: "Title of the work",
    authorsLabel: "Authors",
    abstractLabel: "Description",
    abstractHelp: "What this work is",
    urlLabel: "URL",
    urlHelp: "Optional. Where the work can be found",
  },
};

export const WORK_TYPE_KEYS = Object.keys(WORK_TYPES);

// Legacy records and drafts (no work type) and anything unknown are papers.
export const workTypeOf = (value) =>
  Object.prototype.hasOwnProperty.call(WORK_TYPES, value) ? value : "paper";

export const workTypeInfo = (value) => WORK_TYPES[workTypeOf(value)];
