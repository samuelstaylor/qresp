// WHAT A SECTION LAST SAVED, per browser tab.
//
// A section's "saved" flag lives in React state, so it is lost whenever the
// curator page remounts -- a trip to the record preview, for one -- and the
// draft is restored a moment after the page appears. A section that decides
// from what it sees on mount then reports itself unsaved, and Publish asks
// for a second Save of something that was already saved. Remembering what
// was saved lets the section recognise it when it comes back.

const PREFIX = "qresp:saved:";

/** A stable text form of a value: object keys sorted at every level. */
export const signatureOf = (value) =>
  JSON.stringify(value, (key, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val)
          .sort()
          .reduce((out, k) => {
            out[k] = val[k];
            return out;
          }, {})
      : val
  );

export const rememberSaved = (section, signature, extra = {}) => {
  try {
    window.sessionStorage.setItem(PREFIX + section, JSON.stringify({ signature, ...extra }));
  } catch (e) {
    // Storage unavailable: the section is still saved for this visit.
  }
};

/** The remembered entry, or null. */
export const savedEntry = (section) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(PREFIX + section)) || null;
  } catch (e) {
    return null;
  }
};

export const matchesSaved = (section, signature) => {
  const entry = savedEntry(section);
  return Boolean(entry) && entry.signature === signature;
};
