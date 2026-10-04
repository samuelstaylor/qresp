import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import SortableRows from "../components/Form/SortableRows";

// Order matters for authors: a row is moved by dragging its handle, or with
// the arrow keys on the handle.
const List = ({ initial = ["Somjit", "Davidsson", "Jin", "Galli"] }) => {
  const [names, setNames] = useState(initial);
  const move = (from, to) =>
    setNames((was) => {
      const next = [...was];
      const [picked] = next.splice(from, 1);
      next.splice(to, 0, picked);
      return next;
    });
  return (
    <>
      <SortableRows
        items={names}
        getKey={(name) => name}
        onMove={move}
        noun="author"
        renderRow={(name) => <span>{name}</span>}
      />
      <output data-testid="order">{names.join(",")}</output>
    </>
  );
};

const order = () => screen.getByTestId("order").textContent;
const dataTransfer = () => ({
  effectAllowed: "",
  setData: () => {},
  setDragImage: () => {},
});

// jsdom has no layout: every row is a 0-height box at y=0, so a pointer at
// y=1 is in the row's lower half (drop AFTER it) and y=-1 its upper half.
describe("reordering authors", () => {
  it("drags the last author to the front", () => {
    render(<List />);
    fireEvent.dragStart(screen.getByTestId("sortable-handle-3"), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(screen.getByTestId("sortable-row-0"), { clientY: -1 });
    expect(screen.getByTestId("sortable-drop-marker")).toBeInTheDocument();
    fireEvent.drop(screen.getByTestId("sortable-row-0"));
    expect(order()).toBe("Galli,Somjit,Davidsson,Jin");
  });

  it("drags the first author below the second", () => {
    render(<List />);
    fireEvent.dragStart(screen.getByTestId("sortable-handle-0"), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(screen.getByTestId("sortable-row-1"), { clientY: 1 });
    fireEvent.drop(screen.getByTestId("sortable-row-1"));
    expect(order()).toBe("Davidsson,Somjit,Jin,Galli");
  });

  it("drops where it started without changing anything", () => {
    render(<List />);
    fireEvent.dragStart(screen.getByTestId("sortable-handle-1"), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(screen.getByTestId("sortable-row-1"), { clientY: -1 });
    fireEvent.drop(screen.getByTestId("sortable-row-1"));
    expect(order()).toBe("Somjit,Davidsson,Jin,Galli");
  });

  it("moves with the arrow keys on the handle", () => {
    render(<List />);
    fireEvent.keyDown(screen.getByTestId("sortable-handle-2"), { key: "ArrowUp" });
    expect(order()).toBe("Somjit,Jin,Davidsson,Galli");
    fireEvent.keyDown(screen.getByTestId("sortable-handle-0"), { key: "ArrowUp" });
    expect(order()).toBe("Somjit,Jin,Davidsson,Galli");
    fireEvent.keyDown(screen.getByTestId("sortable-handle-3"), { key: "ArrowDown" });
    expect(order()).toBe("Somjit,Jin,Davidsson,Galli");
  });

  it("names each handle for a screen reader", () => {
    render(<List />);
    expect(screen.getByRole("button", { name: "Move author 1 of 4" })).toBeInTheDocument();
  });
});
