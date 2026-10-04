import { useState } from "react";
import PropTypes from "prop-types";

import { Box, Tooltip } from "@mui/material";
import { DragIndicator } from "@mui/icons-material";

// A LIST WHOSE ORDER MEANS SOMETHING -- authors, above all -- reordered by
// dragging a row's handle, or by focusing the handle and pressing the arrow
// keys. Only the handle drags, so selecting text in a row's inputs still
// works. No library: the browser's own drag and drop, and the caller's
// `onMove(from, to)` (react-hook-form's useFieldArray `move`) does the rest.
const SortableRows = ({ items, getKey, onMove, renderRow, noun = "item" }) => {
  const [dragFrom, setDragFrom] = useState(null);
  // Insertion point while dragging: 0 = before the first row, n = after the last.
  const [dropAt, setDropAt] = useState(null);

  const reset = () => {
    setDragFrom(null);
    setDropAt(null);
  };

  const commit = () => {
    if (dragFrom !== null && dropAt !== null) {
      const to = dropAt > dragFrom ? dropAt - 1 : dropAt;
      if (to !== dragFrom) onMove(dragFrom, to);
    }
    reset();
  };

  const marker = (position) =>
    dragFrom !== null && dropAt === position ? (
      <Box
        aria-hidden="true"
        data-testid="sortable-drop-marker"
        sx={{ height: 3, borderRadius: 2, bgcolor: "#800000", my: -0.25 }}
      />
    ) : null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((item, index) => (
        <Box key={getKey(item, index)} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {marker(index)}
          <Box
            data-sortable-row
            data-testid={`sortable-row-${index}`}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const after = e.clientY > rect.top + rect.height / 2;
              setDropAt(after ? index + 1 : index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              commit();
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              opacity: dragFrom === index ? 0.4 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <Tooltip
              title={`Drag to reorder, or use the arrow keys`}
              placement="left"
              arrow
            >
              <Box
                role="button"
                tabIndex={0}
                draggable
                aria-label={`Move ${noun} ${index + 1} of ${items.length}`}
                data-testid={`sortable-handle-${index}`}
                onDragStart={(e) => {
                  setDragFrom(index);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                  const row = e.currentTarget.closest("[data-sortable-row]");
                  if (row && e.dataTransfer.setDragImage) {
                    e.dataTransfer.setDragImage(row, 24, 24);
                  }
                }}
                onDragEnd={reset}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" && index > 0) {
                    e.preventDefault();
                    onMove(index, index - 1);
                  } else if (e.key === "ArrowDown" && index < items.length - 1) {
                    e.preventDefault();
                    onMove(index, index + 1);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 1,
                  color: "text.secondary",
                  cursor: dragFrom === null ? "grab" : "grabbing",
                  "&:hover": { bgcolor: "rgba(128,0,0,0.06)", color: "#800000" },
                  "&:focus-visible": { outline: "2px solid #800000", outlineOffset: 1 },
                }}
              >
                <DragIndicator fontSize="small" />
              </Box>
            </Tooltip>
            <Box sx={{ flex: 1, minWidth: 0 }}>{renderRow(item, index)}</Box>
          </Box>
        </Box>
      ))}
      {marker(items.length)}
    </Box>
  );
};

SortableRows.propTypes = {
  items: PropTypes.array.isRequired,
  getKey: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  renderRow: PropTypes.func.isRequired,
  noun: PropTypes.string,
};

export default SortableRows;
