// CLOSE EVERY SECTION after a draft is loaded or the curator comes back
// from the preview, so the record arrives as a tidy list of headings.
//
// Sections keep remounting for a moment after a load -- a saved section
// swaps its form for its summary as the draft fills in -- so this is a
// short-lived MODE, not a single event: every section that opens while it
// is on starts closed. It ends at the curator's first click or key press,
// after which sections behave normally again (Edit opens its form, etc.).

let collapsing = false;
const listeners = new Set();
let armed = false;
let timer = null;
// Long enough for a draft to finish filling in; short enough that a curator
// who has not touched anything yet is not surprised later.
const MAX_MS = 4000;

const end = () => {
  collapsing = false;
  armed = false;
  if (timer) clearTimeout(timer);
  timer = null;
  document.removeEventListener("pointerdown", end, true);
  document.removeEventListener("keydown", end, true);
};

export const collapseAllSections = () => {
  if (typeof document === "undefined") return;
  collapsing = true;
  listeners.forEach((listener) => listener());
  if (timer) clearTimeout(timer);
  timer = setTimeout(end, MAX_MS);
  if (!armed) {
    armed = true;
    // After the current event, so the click that asked for the load does
    // not count as the first interaction after it.
    setTimeout(() => {
      document.addEventListener("pointerdown", end, true);
      document.addEventListener("keydown", end, true);
    }, 0);
  }
};

// ONE SECTION, CLOSED BY HAND AND SAVED: its form is replaced by its saved
// summary, which is a new section mounting -- and it must stay closed.
let nextClosedUntil = 0;
export const startNextSectionClosed = () => {
  nextClosedUntil = Date.now() + 1000;
};
export const cancelNextSectionClosed = () => {
  nextClosedUntil = 0;
};
const takeNextClosed = () => {
  if (Date.now() < nextClosedUntil) {
    nextClosedUntil = 0;
    return true;
  }
  return false;
};

/** True while freshly mounted sections should start closed. */
export const sectionsCollapsing = () => collapsing;

/** For a section mounting now: should it start closed? (Consumes a one-off.) */
export const shouldStartClosed = () => collapsing || takeNextClosed();

/** Called whenever collapseAllSections runs; returns an unsubscribe. */
export const onCollapseSections = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Tests only.
export const resetSectionCollapse = () => {
  if (typeof document !== "undefined") end();
  collapsing = false;
  nextClosedUntil = 0;
};
