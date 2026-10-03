import { render, screen } from "@testing-library/react";

jest.mock("axios");
import axios from "axios";

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
