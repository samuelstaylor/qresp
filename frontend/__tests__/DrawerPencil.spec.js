import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Drawer from "../components/drawer";

// Every editable section carries the same pencil, whether it is showing its
// saved summary or its form.
describe("the section pencil", () => {
  it("switches a saved section to editing and opens it", async () => {
    const editor = jest.fn();
    render(<Drawer heading="Curator Information" editor={editor}>x</Drawer>);
    const pencil = screen.getByRole("button", { name: "Edit" });
    expect(pencil).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(pencil);
    expect(editor).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /curator information/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("is shown pressed on a section being edited, and only opens it", async () => {
    const editor = jest.fn();
    render(<Drawer heading="Who is Curating the paper" editing editor={editor}>x</Drawer>);
    const pencil = screen.getByRole("button", { name: "Editing" });
    expect(pencil).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(pencil);
    expect(editor).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /who is curating/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("is absent on a read-only section", () => {
    render(<Drawer heading="Charts">x</Drawer>);
    expect(screen.queryByRole("button", { name: /^edit/i })).toBeNull();
  });
});
