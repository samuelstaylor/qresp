import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("axios");
jest.mock("next/router", () => ({
  __esModule: true,
  default: { push: jest.fn() },
  useRouter: () => ({ pathname: "/account/records", query: {} }),
}));
import axios from "axios";

import RecordsPage from "../pages/account/records";
import PermissionNotice from "../components/Paper/PermissionNotice";
import AuthContext from "../Context/Auth/authContext";

const auth = {
  loading: false,
  authenticated: true,
  user: { email: "owner@example.com", name: "Owner", is_admin: false },
};

const paper = (overrides = {}) => ({
  id: "p1",
  title: "My Paper",
  authors: "A. Author",
  year: 2020,
  is_active: true,
  role: "owner",
  ...overrides,
});

const renderRecords = (papers) => {
  axios.get.mockImplementation((url) =>
    url === "/api/account/papers"
      ? Promise.resolve({ data: { count: papers.length, papers } })
      : Promise.reject(new Error(`Unexpected URL: ${url}`))
  );
  return render(
    <AuthContext.Provider value={auth}>
      <RecordsPage />
    </AuthContext.Provider>
  );
};

describe("private records on My Records", () => {
  afterEach(() => jest.resetAllMocks());

  it("marks a private record and counts who it is shared with", async () => {
    renderRecords([
      paper({ is_private: true, viewer_emails: ["a@x.org", "b@x.org"] }),
    ]);
    expect(
      await screen.findByText(/private · shared with 2/i)
    ).toBeInTheDocument();
  });

  it("makes a record private and shares it through the Sharing dialog", async () => {
    axios.put.mockResolvedValue({
      data: { id: "p1", is_private: true, viewer_emails: ["a@x.org", "b@x.org"] },
    });
    const user = userEvent.setup();
    renderRecords([paper()]);
    await screen.findByText(/my paper/i);
    expect(screen.queryByTestId("record-private-chip")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("record-sharing"));
    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByTestId("record-viewers-input");
    expect(input).toBeDisabled();
    await user.click(within(dialog).getByTestId("record-private-switch"));
    expect(input).toBeEnabled();
    await user.type(input, "a@x.org, b@x.org");
    await user.click(within(dialog).getByTestId("record-sharing-save"));

    expect(axios.put).toHaveBeenCalledWith("/api/paper/p1/visibility", {
      is_private: true,
      viewer_emails: ["a@x.org", "b@x.org"],
    });
    expect(
      await screen.findByText(/private · shared with 2/i)
    ).toBeInTheDocument();
  });

  it("shows the backend error inline when sharing fails", async () => {
    axios.put.mockRejectedValue({
      response: { data: { error: "invalid viewer email: nope" } },
    });
    const user = userEvent.setup();
    renderRecords([paper({ is_private: true })]);
    await screen.findByText(/my paper/i);
    await user.click(screen.getByTestId("record-sharing"));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByTestId("record-viewers-input"), "nope");
    await user.click(within(dialog).getByTestId("record-sharing-save"));
    expect(
      await within(dialog).findByText(/invalid viewer email: nope/i)
    ).toBeInTheDocument();
  });

  it("gives a viewer a read-only row: View only, no edit or manage", async () => {
    renderRecords([
      paper({ role: "viewer", is_private: true, owner_email: "someone@x.org" }),
    ]);
    await screen.findByText(/my paper/i);
    expect(screen.getByText(/shared with you/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /edit in curator/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("record-sharing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("record-delete")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /editors/i })
    ).not.toBeInTheDocument();
  });

  it("never offers Sharing to an editor", async () => {
    renderRecords([paper({ role: "editor" })]);
    await screen.findByText(/my paper/i);
    expect(screen.queryByTestId("record-sharing")).not.toBeInTheDocument();
  });
});

describe("private records on the record page", () => {
  afterEach(() => jest.resetAllMocks());

  const renderNotice = (perm) => {
    axios.get.mockResolvedValue({ data: perm });
    return render(
      <AuthContext.Provider value={{ authenticated: true, loading: false }}>
        <PermissionNotice paperId="abc123" server="https://localhost:8443" />
      </AuthContext.Provider>
    );
  };

  it("tells a viewer the private record was shared with them", async () => {
    renderNotice({
      can_edit: false,
      can_manage: false,
      authenticated: true,
      is_active: true,
      is_private: true,
      role: "viewer",
    });
    expect(
      await screen.findByText(/has been shared with you/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("paper-sharing")).not.toBeInTheDocument();
  });

  it("lets the owner make the record public again", async () => {
    const perm = {
      can_edit: true,
      can_manage: true,
      reason: "owner",
      authenticated: true,
      is_active: true,
      is_private: true,
      role: "owner",
      viewer_emails: ["a@x.org"],
    };
    renderNotice(perm);
    axios.put.mockResolvedValue({ data: { is_private: false } });
    const user = userEvent.setup();
    expect(await screen.findByTestId("private-notice")).toBeInTheDocument();

    await user.click(screen.getByTestId("paper-sharing"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByTestId("paper-viewers-input")).toHaveValue(
      "a@x.org"
    );
    axios.get.mockResolvedValue({ data: { ...perm, is_private: false } });
    await user.click(within(dialog).getByTestId("paper-private-switch"));
    await user.click(within(dialog).getByTestId("paper-sharing-save"));

    expect(axios.put).toHaveBeenCalledWith("/api/paper/abc123/visibility", {
      is_private: false,
      viewer_emails: ["a@x.org"],
    });
    await waitFor(() =>
      expect(screen.queryByTestId("private-notice")).not.toBeInTheDocument()
    );
  });
});
