import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("axios");
import axios from "axios";

jest.mock("../Utils/Scraper", () => ({ getList: jest.fn() }));
import { getList } from "../Utils/Scraper";
import ServerContext from "../Context/Servers/serverContext";
import SourceTreeContext from "../Context/SourceTree/SourceTreeContext";

import GuidedSetup from "../components/CuratorElements/GuidedSetup";
import AuthContext from "../Context/Auth/authContext";
import CuratorContext from "../Context/Curator/curatorContext";

const blankState = {
  curatorInfo: { firstName: "", middleName: "", lastName: "", emailId: "", affiliation: "" },
  referenceInfo: { doi: "", title: "" },
  paperInfo: { tags: [], collections: [], PIs: "" },
  fileServerPath: "",
  charts: [],
  datasets: [],
  scripts: [],
  tools: [],
  heads: [],
  workflow: { nodes: [], edges: [] },
};

const renderSetup = ({ state = blankState, auth = {}, resetVersion = 0 } = {}) => {
  const curator = {
    ...state,
    resetVersion,
    metadata: state,
    prefillCuratorInfo: jest.fn(),
    collectDraftState: jest.fn(() => state),
    setAll: jest.fn(),
    remountForms: jest.fn(),
    importBundle: jest.fn(),
    cacheRccAnalysis: jest.fn(),
    edit: jest.fn(),
  };
  const tree = (value) => (
    <AuthContext.Provider value={{ loading: false, authenticated: false, user: null, ...auth }}>
      <CuratorContext.Provider value={value}>
        <GuidedSetup />
      </CuratorContext.Provider>
    </AuthContext.Provider>
  );
  const { rerender } = render(tree(curator));
  curator.rerenderWith = (changes) => rerender(tree({ ...curator, ...changes }));
  return curator;
};

describe("GuidedSetup", () => {
  afterEach(() => jest.resetAllMocks());

  it("fills the curator from the signed-in profile", () => {
    const curator = renderSetup({
      auth: {
        authenticated: true,
        user: { name: "Ada Lovelace", email: "ada@example.edu", affiliation: "Analytical Engines" },
      },
    });
    expect(curator.prefillCuratorInfo).toHaveBeenCalledWith({
      firstName: "Ada",
      middleName: "",
      lastName: "Lovelace",
      emailId: "ada@example.edu",
      affiliation: "Analytical Engines",
    });
  });

  it("fills the curator again after Start Fresh clears the form", () => {
    const profile = { name: "Ada Lovelace", email: "ada@example.edu" };
    const filled = { firstName: "Ada", middleName: "", lastName: "Lovelace", emailId: "ada@example.edu", affiliation: "" };
    const curator = renderSetup({
      state: { ...blankState, curatorInfo: filled },
      auth: { authenticated: true, user: profile },
    });
    expect(curator.prefillCuratorInfo).not.toHaveBeenCalled();

    // Start Fresh: the form is blank again and resetVersion moves on.
    curator.rerenderWith({ curatorInfo: blankState.curatorInfo, resetVersion: 1 });
    expect(curator.prefillCuratorInfo).toHaveBeenCalledWith(filled);
  });

  it("never overwrites curator details that are already there", () => {
    const curator = renderSetup({
      state: { ...blankState, curatorInfo: { ...blankState.curatorInfo, firstName: "Kept" } },
      auth: { authenticated: true, user: { name: "Other Person", email: "o@x.org" } },
    });
    expect(curator.prefillCuratorInfo).not.toHaveBeenCalled();
  });

  it("asks anonymous users to sign in and makes no requests", () => {
    renderSetup();
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("shows each step's summary once it is done", () => {
    axios.post.mockResolvedValue({ data: { candidates: {}, suggestions: {} } });
    renderSetup({
      state: {
        ...blankState,
        curatorInfo: { firstName: "Ada", middleName: "", lastName: "Lovelace", emailId: "ada@example.edu", affiliation: "" },
        referenceInfo: { doi: "10.1038/x.1", title: "A paper title", authors: "A B", year: 2025 },
        fileServerPath: "https://notebook.rcc.uchicago.edu/files/10.1038.x.1",
      },
      auth: { authenticated: true, user: { name: "Ada Lovelace", email: "ada@example.edu" } },
    });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("A paper title")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://notebook.rcc.uchicago.edu/files/10.1038.x.1" })
    ).toBeInTheDocument();
    // A folder and no artifacts yet: the folder is scanned automatically.
    expect(axios.post).toHaveBeenCalledWith("/api/curation/analyze-folder", {
      path: "https://notebook.rcc.uchicago.edu/files/10.1038.x.1",
    });
  });
});

describe("GuidedSetup project folder", () => {
  afterEach(() => jest.resetAllMocks());

  const withPaper = {
    ...blankState,
    referenceInfo: { doi: "10.1038/x.1", title: "A paper title" },
  };

  it("lets the folder be pasted in and used without leaving the setup", async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({ data: { found: false, tried: [] } });
    const curator = renderSetup({
      state: withPaper,
      auth: { authenticated: true, user: { name: "Ada Lovelace", email: "ada@example.edu" } },
    });
    const field = await screen.findByLabelText(/folder address/i);
    await user.type(field, "https://notebook.rcc.uchicago.edu/files/my.folder/");
    await user.click(screen.getByRole("button", { name: /use this folder/i }));
    expect(curator.setAll).toHaveBeenCalledWith(
      expect.objectContaining({ fileServerPath: "https://notebook.rcc.uchicago.edu/files/my.folder" })
    );
    expect(curator.remountForms).toHaveBeenCalled();
  });

  it("refuses an address that is not a web address", async () => {
    const user = userEvent.setup();
    const curator = renderSetup({ state: withPaper });
    await user.type(screen.getByLabelText(/folder address/i), "my folder");
    await user.click(screen.getByRole("button", { name: /use this folder/i }));
    expect(screen.getByText(/starting with https/i)).toBeInTheDocument();
    expect(curator.setAll).not.toHaveBeenCalled();
  });

  it("opens the change editor in place instead of scrolling away", async () => {
    const user = userEvent.setup();
    renderSetup({
      state: { ...withPaper, fileServerPath: "https://notebook.rcc.uchicago.edu/files/a" },
    });
    await user.click(screen.getByRole("button", { name: /^change$/i }));
    expect(screen.getByLabelText(/folder address/i)).toHaveValue(
      "https://notebook.rcc.uchicago.edu/files/a"
    );
    expect(screen.getByRole("button", { name: /browse/i })).toBeInTheDocument();
  });
});

describe("GuidedSetup file server", () => {
  afterEach(() => jest.resetAllMocks());

  const RCC = "https://notebook.rcc.uchicago.edu/files";

  it("browses the chosen file server and uses the picked folder", async () => {
    const user = userEvent.setup();
    getList.mockResolvedValue({ details: { root: RCC }, files: [{ id: "x" }] });
    const tree = {
      setTree: jest.fn(),
      openSelector: jest.fn(),
      setSaveMethod: jest.fn(),
      setConfirmLabel: jest.fn(),
      setMultiple: jest.fn(),
    };
    const curator = {
      ...blankState,
      metadata: blankState,
      resetVersion: 0,
      prefillCuratorInfo: jest.fn(),
      collectDraftState: jest.fn(() => blankState),
      setAll: jest.fn(),
      remountForms: jest.fn(),
      importBundle: jest.fn(),
      cacheRccAnalysis: jest.fn(),
      edit: jest.fn(),
    };
    render(
      <AuthContext.Provider value={{ loading: false, authenticated: false, user: null }}>
        <ServerContext.Provider
          value={{ httpServers: [{ value: RCC, label: "RCC (" + RCC + ")" }], setSelectedHttp: jest.fn() }}
        >
          <SourceTreeContext.Provider value={tree}>
            <CuratorContext.Provider value={curator}>
              <GuidedSetup />
            </CuratorContext.Provider>
          </SourceTreeContext.Provider>
        </ServerContext.Provider>
      </AuthContext.Provider>
    );

    // RCC is the default server.
    expect(screen.getByLabelText(/file server/i)).toHaveValue("RCC (" + RCC + ")");
    await user.click(screen.getByRole("button", { name: /browse/i }));
    expect(getList).toHaveBeenCalledWith(RCC, "http", true, null);
    expect(tree.openSelector).toHaveBeenCalled();

    // The picker hands back a folder; it is applied straight away.
    const save = tree.setSaveMethod.mock.calls[0][0];
    save(RCC + "/10.1038.x.1");
    expect(curator.setAll).toHaveBeenCalledWith(
      expect.objectContaining({ fileServerPath: RCC + "/10.1038.x.1" })
    );
  });

  it("has no Find-from-DOI button", () => {
    renderSetup({ state: { ...blankState, referenceInfo: { doi: "10.1/x", title: "T" } } });
    expect(screen.queryByRole("button", { name: /find it from the doi/i })).toBeNull();
  });
});

describe("GuidedSetup captions from LaTeX", () => {
  afterEach(() => jest.resetAllMocks());

  const withFigures = {
    ...blankState,
    curatorInfo: { firstName: "Ada", middleName: "", lastName: "Lovelace", emailId: "ada@example.edu", affiliation: "" },
    referenceInfo: { doi: "10.1038/x.1", title: "An NV- center in MgO" },
    fileServerPath: "https://notebook.rcc.uchicago.edu/files/10.1038.x.1",
    charts: [
      { id: "c0", imageFile: "/Figures_Tables/Figure1.pdf", number: "1", caption: "", properties: ["DFT"] },
      { id: "c1", imageFile: "/Figures_Tables/Figure2.pdf", number: "", caption: "", properties: ["DFT"] },
    ],
  };

  it("finds the arXiv id, reads the captions and applies them to the figures", async () => {
    const user = userEvent.setup();
    axios.post.mockImplementation((url, body) => {
      if (url === "/api/curation/find-arxiv") {
        return Promise.resolve({ data: { found: true, arxiv: "2409.00246" } });
      }
      if (url === "/api/curation/latex-captions") {
        return Promise.resolve({
          data: {
            source: "arXiv:2409.00246",
            figures: [{}, {}],
            matches: [
              { id: "c0", caption: "Screening of spin defects.", number: "1", how: "file" },
              { id: "c1", caption: "Ground state properties.", number: "2", how: "file" },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    const curator = renderSetup({
      state: withFigures,
      auth: { authenticated: true, user: { name: "Ada Lovelace", email: "ada@example.edu" } },
    });

    const field = await screen.findByLabelText(/arxiv id or link/i);
    await screen.findByDisplayValue("2409.00246");
    expect(field).toHaveValue("2409.00246");

    await user.click(screen.getByRole("button", { name: /get captions/i }));
    expect(axios.post).toHaveBeenCalledWith("/api/curation/latex-captions", {
      arxiv: "2409.00246",
      charts: [
        { id: "c0", imageFile: "/Figures_Tables/Figure1.pdf", number: "1" },
        { id: "c1", imageFile: "/Figures_Tables/Figure2.pdf", number: "" },
      ],
    });

    await user.click(await screen.findByRole("button", { name: /apply 2 captions/i }));
    expect(curator.edit).toHaveBeenCalledWith(
      "chart",
      expect.objectContaining({ id: "c0", caption: "Screening of spin defects.", number: "1" })
    );
    // A missing figure number is filled from LaTeX too.
    expect(curator.edit).toHaveBeenCalledWith(
      "chart",
      expect.objectContaining({ id: "c1", caption: "Ground state properties.", number: "2" })
    );
  });

  it("explains how to get an Overleaf project's source", async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({ data: { found: false } });
    renderSetup({
      state: withFigures,
      auth: { authenticated: true, user: { name: "Ada Lovelace", email: "ada@example.edu" } },
    });
    await user.click(screen.getByRole("button", { name: /overleaf/i }));
    expect(screen.getByText(/download → source/i)).toBeInTheDocument();
    expect(screen.getByText(/upload the overleaf \.zip/i)).toBeInTheDocument();
  });
});

describe("GuidedSetup AI assistant", () => {
  afterEach(() => jest.resetAllMocks());

  const state = {
    ...blankState,
    curatorInfo: { firstName: "Ada", middleName: "", lastName: "Lovelace", emailId: "ada@example.edu", affiliation: "" },
    referenceInfo: { doi: "10.1038/x.1", title: "An NV- center in MgO", abstract: "We identify a defect." },
    paperInfo: { tags: ["DFT"], collections: [], PIs: "" },
    fileServerPath: "https://notebook.rcc.uchicago.edu/files/10.1038.x.1",
    charts: [
      { id: "c0", imageFile: "/F/Figure1.pdf", number: "1", caption: "Screening of spin defects.", properties: ["DFT"] },
      { id: "c1", imageFile: "/F/Figure2.pdf", number: "2", caption: "Defect levels.", properties: ["hand written"] },
    ],
    scripts: [{ id: "s0", files: ["/Scripts/plot.py"], readme: "" }],
    datasets: [],
  };
  const auth = { authenticated: true, user: { name: "Ada Lovelace", email: "ada@example.edu" } };

  it("does nothing until the curator consents", () => {
    axios.post.mockResolvedValue({ data: { found: false } });
    renderSetup({ state, auth });
    expect(screen.getByRole("button", { name: /suggest keywords/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /suggest missing links/i })).toBeDisabled();
  });

  it("suggests and applies keywords, keeping hand-written ones unless chosen", async () => {
    const user = userEvent.setup();
    axios.post.mockImplementation((url) =>
      Promise.resolve({
        data:
          url === "/api/curation/suggest-figure-keywords"
            ? {
                figures: [
                  { id: "c0", keywords: ["spin defects", "screening"] },
                  { id: "c1", keywords: ["defect levels"] },
                ],
                paper_keywords: ["spin qubit"],
              }
            : { found: false },
      })
    );
    const curator = renderSetup({ state, auth });
    await user.click(screen.getByRole("checkbox", { name: /send the paper's title/i }));
    await user.click(screen.getByRole("button", { name: /suggest keywords/i }));
    expect(axios.post).toHaveBeenCalledWith(
      "/api/curation/suggest-figure-keywords",
      expect.objectContaining({ consent: true })
    );
    await user.click(await screen.findByRole("button", { name: /apply selected keywords/i }));
    // One change: c0 had only the paper-tag default, so it is replaced;
    // c1's own keywords stay.
    const written = curator.setAll.mock.calls[curator.setAll.mock.calls.length - 1][0];
    expect(written.charts.find((c) => c.id === "c0").properties).toEqual(["spin defects", "screening"]);
    expect(written.charts.find((c) => c.id === "c1").properties).toEqual(["hand written"]);
  });

  it("suggests links with reasons and adds the chosen ones", async () => {
    const user = userEvent.setup();
    axios.post.mockImplementation((url) =>
      Promise.resolve({
        data:
          url === "/api/curation/suggest-links"
            ? {
                links: [
                  { from: "s0", to: "c0", type: "generates", confidence: "high", reason: "Plots the screening." },
                  { from: "s0", to: "c1", type: "generates", confidence: "low", reason: "Maybe." },
                ],
              }
            : { found: false },
      })
    );
    const curator = renderSetup({ state, auth });
    await user.click(screen.getByRole("checkbox", { name: /send the paper's title/i }));
    await user.click(screen.getByRole("button", { name: /suggest missing links/i }));
    expect(await screen.findByText("Plots the screening.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /add selected links/i }));
    // Low-confidence suggestions start unticked.
    expect(curator.importBundle).toHaveBeenCalledWith([], [{ from: "s0", to: "c0", type: "generates" }]);
  });

  it("says when AI is not set up on the server", async () => {
    const user = userEvent.setup();
    axios.post.mockImplementation((url) =>
      url === "/api/curation/suggest-figure-keywords"
        ? Promise.reject({ response: { status: 503, data: { error: "AI suggestions are not configured on this server." } } })
        : Promise.resolve({ data: { found: false } })
    );
    renderSetup({ state, auth });
    await user.click(screen.getByRole("checkbox", { name: /send the paper's title/i }));
    await user.click(screen.getByRole("button", { name: /suggest keywords/i }));
    expect(await screen.findByText(/QRESP_GEMINI_ENABLED/)).toBeInTheDocument();
  });

  it("shows the provider's own reason when Gemini is busy or rate limited", async () => {
    const user = userEvent.setup();
    axios.post.mockImplementation((url) =>
      url === "/api/curation/suggest-figure-keywords"
        ? Promise.reject({ response: { status: 429, data: { error: "You have reached the AI usage limit." } } })
        : Promise.resolve({ data: { found: false } })
    );
    renderSetup({ state, auth });
    await user.click(screen.getByRole("checkbox", { name: /send the paper's title/i }));
    await user.click(screen.getByRole("button", { name: /suggest keywords/i }));
    expect(await screen.findByText("You have reached the AI usage limit.")).toBeInTheDocument();
  });
});

describe("GuidedSetup finish step", () => {
  afterEach(() => jest.resetAllMocks());

  const done = {
    ...blankState,
    curatorInfo: { firstName: "Ada", middleName: "", lastName: "Lovelace", emailId: "ada@example.edu", affiliation: "" },
    referenceInfo: { doi: "10.1/x", title: "T", authors: "Vrindaa  Somjit, Giulia  Galli" },
    fileServerPath: "https://notebook.rcc.uchicago.edu/files/x",
    charts: [{ id: "c0", imageFile: "a.png", number: "1", caption: "C", properties: ["k"] }],
    paperInfo: { PIs: "", collections: [], tags: [] },
  };

  it("offers the last author as P.I. and lets optional details be skipped", async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({ data: { found: false } });
    const curator = renderSetup({ state: done });
    await user.click(screen.getByRole("button", { name: "Use last author: Giulia Galli" }));
    expect(curator.setAll).toHaveBeenCalledWith(
      expect.objectContaining({ paperInfo: expect.objectContaining({ PIs: "Giulia Galli" }) })
    );
    expect(screen.getByText(/optional paper details are empty/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /skip, leave blank/i }));
    expect(screen.queryByText(/optional paper details are empty/i)).not.toBeInTheDocument();
  });
});

describe("GuidedSetup AI folder curation", () => {
  afterEach(() => jest.resetAllMocks());

  const state = {
    ...blankState,
    curatorInfo: { firstName: "Ada", middleName: "", lastName: "Lovelace", emailId: "ada@example.edu", affiliation: "" },
    referenceInfo: { doi: "10.1/x", title: "T", abstract: "A" },
    paperInfo: { tags: [], collections: [], PIs: "" },
    fileServerPath: "https://notebook.rcc.uchicago.edu/files/x",
    charts: [{ id: "c0", imageFile: "Figures/Figure1.pdf", number: "1", caption: "C", properties: ["k"] }],
  };
  const auth = { authenticated: true, user: { name: "Ada Lovelace", email: "ada@example.edu" } };

  it("proposes what Qresp missed and adds the chosen items with their links", async () => {
    const user = userEvent.setup();
    axios.post.mockImplementation((url) =>
      Promise.resolve({
        data:
          url === "/api/curation/ai-curate"
            ? {
                proposal: {
                  charts: [{ key: "n1", imageFile: "plots/fig_energy.png", number: "2", keywords: ["energy"], reason: "A results figure." }],
                  datasets: [{ key: "n2", files: ["raw"], description: "Raw runs.", reason: "Read by the script." }],
                  scripts: [{ key: "n3", files: ["code/plot.py"], description: "Plots it.", reason: "Saves fig_energy.png." }],
                  tools: [],
                },
                links: [
                  { from: "n3", to: "n1", type: "generates", confidence: "high", reason: "Saves it." },
                  { from: "n3", to: "c0", type: "generates", confidence: "medium", reason: "Plots figure 1 too." },
                ],
                models: ["gemini-3.8-flash"],
              }
            : { found: false },
      })
    );
    const curator = renderSetup({ state, auth });
    await user.click(screen.getByRole("checkbox", { name: /send the paper's title/i }));
    await user.click(screen.getByRole("button", { name: /curate the whole folder with ai/i }));
    expect(axios.post).toHaveBeenCalledWith(
      "/api/curation/ai-curate",
      expect.objectContaining({
        consent: true,
        path: "https://notebook.rcc.uchicago.edu/files/x",
        existing: expect.objectContaining({ charts: [expect.objectContaining({ id: "c0" })] }),
      })
    );
    expect(await screen.findByText("A results figure.")).toBeInTheDocument();
    expect(screen.getByText("Suggested by gemini-3.8-flash")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /add selected/i }));
    const [records, links] = curator.importBundle.mock.calls[0];
    expect(records.map((r) => [r.key, r.list])).toEqual([["n1", "charts"], ["n2", "datasets"], ["n3", "scripts"]]);
    expect(records[0].value).toEqual(expect.objectContaining({ imageFile: "plots/fig_energy.png", number: "2", properties: ["energy"] }));
    expect(records[2].value).toEqual(expect.objectContaining({ files: ["code/plot.py"], readme: "Plots it." }));
    expect(links).toEqual([
      { from: "n3", to: "n1", type: "generates" },
      { from: "n3", to: "c0", type: "generates" },
    ]);
  });
});


describe("GuidedSetup keyword apply keeps every change", () => {
  afterEach(() => jest.resetAllMocks());

  it("writes figure keywords and paper keywords together, in one change", async () => {
    const user = userEvent.setup();
    const state = {
      ...blankState,
      curatorInfo: { firstName: "Ada", middleName: "", lastName: "Lovelace", emailId: "ada@example.edu", affiliation: "" },
      referenceInfo: { doi: "10.1/x", title: "T", abstract: "A" },
      paperInfo: { tags: [], collections: [], PIs: "" },
      fileServerPath: "https://notebook.rcc.uchicago.edu/files/x",
      charts: [
        { id: "c0", imageFile: "a.pdf", number: "1", caption: "Cap 1", properties: [] },
        { id: "c1", imageFile: "b.pdf", number: "2", caption: "Cap 2", properties: [] },
      ],
    };
    axios.post.mockImplementation((url) =>
      Promise.resolve({
        data:
          url === "/api/curation/suggest-figure-keywords"
            ? {
                figures: [
                  { id: "c0", keywords: ["screening"] },
                  { id: "c1", keywords: ["defect levels"] },
                ],
                paper_keywords: ["spin qubit"],
                models: ["gemini-3.8-flash"],
              }
            : { found: false },
      })
    );
    const curator = renderSetup({
      state,
      auth: { authenticated: true, user: { name: "Ada Lovelace", email: "ada@example.edu" } },
    });
    await user.click(screen.getByRole("checkbox", { name: /send the paper's title/i }));
    await user.click(screen.getByRole("button", { name: /suggest keywords/i }));
    await user.click(await screen.findByRole("button", { name: /apply selected keywords/i }));

    // Nothing is written piecemeal that a later snapshot could undo.
    expect(curator.edit).not.toHaveBeenCalled();
    expect(curator.setAll).toHaveBeenCalledTimes(1);
    const written = curator.setAll.mock.calls[0][0];
    expect(written.charts.map((c) => c.properties)).toEqual([["screening"], ["defect levels"]]);
    expect(written.paperInfo.tags).toEqual(["spin qubit"]);
  });
});
