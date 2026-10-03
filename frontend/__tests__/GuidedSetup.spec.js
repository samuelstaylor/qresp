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
