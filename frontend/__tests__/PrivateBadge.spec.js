import { render, screen } from "@testing-library/react";

import Summary from "../components/Paper/Summary";
import { TableSearchContext } from "../components/Table/TableSearch";
import AuthContext from "../Context/Auth/authContext";

const row = (overrides = {}) => ({
  _Search__id: "p1",
  _Search__title: "My Paper",
  _Search__authors: "A. Author",
  _Search__tags: [],
  _Search__publication: "",
  _Search__doi: "",
  _Search__year: 2020,
  _Search__server: "https://localhost:8444",
  _Search__sources: [],
  ...overrides,
});

const card = (overrides) =>
  render(
    <AuthContext.Provider value={{ authenticated: false, loading: false }}>
      <TableSearchContext.Provider value={{ query: "", setQuery: () => {} }}>
        <Summary rowdata={row(overrides)} />
      </TableSearchContext.Provider>
    </AuthContext.Provider>
  );

describe("private badge on an explorer card", () => {
  it("marks a private record the reader can open", () => {
    card({ _Search__is_private: true });
    expect(screen.getByTestId("record-private-badge")).toHaveTextContent("Private");
  });

  it("shows nothing on a public record or one from an older server", () => {
    card({ _Search__is_private: false });
    expect(screen.queryByTestId("record-private-badge")).not.toBeInTheDocument();
  });
});
