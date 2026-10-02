import { Fragment, useContext, useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Computer, Delete, DriveFileRenameOutline, PlayArrow } from "@mui/icons-material";

import SEO from "../../components/seo";
import AccountLayout from "../../components/Account/AccountLayout";
import AuthContext from "../../Context/Auth/authContext";
import { clearBrowserDraft, summarizeBrowserDraft } from "../../Utils/browserDraft";
import { deleteServerDraft, listServerDrafts, updateServerDraft } from "../../Utils/serverDrafts";

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
};

const DraftsPage = () => {
  const { loading, authenticated } = useContext(AuthContext);
  const [drafts, setDrafts] = useState(null);
  const [draftError, setDraftError] = useState("");
  const [localDraft, setLocalDraft] = useState(null);
  const [draftDialog, setDraftDialog] = useState(null);
  const [draftSaving, setDraftSaving] = useState(false);

  useEffect(() => {
    setLocalDraft(summarizeBrowserDraft());
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    listServerDrafts()
      .then((items) => { if (!cancelled) setDrafts(items); })
      .catch(() => {
        if (!cancelled) { setDrafts([]); setDraftError("Could not load your drafts."); }
      });
    return () => { cancelled = true; };
  }, [authenticated]);

  const closeDialog = () => { setDraftDialog(null); setDraftSaving(false); };

  const confirmDelete = () => {
    const id = draftDialog.id;
    setDraftSaving(true);
    setDraftError("");
    deleteServerDraft(id)
      .then(() => {
        setDrafts((items) => (items || []).filter((d) => d.id !== id));
        closeDialog();
      })
      .catch(() => { setDraftError("Could not delete this draft. Please try again."); closeDialog(); });
  };

  const confirmRename = () => {
    const { id, title } = draftDialog;
    const nextTitle = (title || "").trim() || "Untitled draft";
    setDraftSaving(true);
    setDraftError("");
    updateServerDraft(id, { title: nextTitle })
      .then((updated) => {
        setDrafts((items) =>
          (items || []).map((d) =>
            d.id === id ? { ...d, title: updated.title, updated_at: updated.updated_at } : d
          )
        );
        closeDialog();
      })
      .catch(() => { setDraftError("Could not rename this draft. Please try again."); closeDialog(); });
  };

  let content;
  if (loading) {
    content = <Typography color="text.secondary">Checking sign-in…</Typography>;
  } else if (!authenticated) {
    content = (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, maxWidth: 440 }}>
        <Typography variant="h6" gutterBottom>Sign in to view your drafts</Typography>
        <Typography variant="body2" color="text.secondary">
          Use &ldquo;Sign in&rdquo; in the header to access your saved drafts.
        </Typography>
      </Paper>
    );
  } else {
    content = (
      <Fragment>
        {/* ── Server drafts ─────────────────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Account drafts</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            component={Link}
            href="/curator"
          >
            New draft
          </Button>
        </Box>

        {draftError && <Typography color="error" sx={{ mb: 2 }}>{draftError}</Typography>}

        {drafts === null ? (
          <Typography color="text.secondary">Loading drafts…</Typography>
        ) : drafts.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No account drafts yet. Use &ldquo;Save Draft&rdquo; in the Curator to keep incomplete work here.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
            {drafts.map((draft) => (
              <Paper
                key={draft.id}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2.5, borderLeft: "3px solid #800000", display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap>{draft.title || "Untitled draft"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated {formatDate(draft.updated_at) || "recently"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrow fontSize="inherit" />}
                    component={Link}
                    href={`/curator?draft=${encodeURIComponent(draft.id)}`}
                    sx={{ bgcolor: "#800000", "&:hover": { bgcolor: "#600000" } }}
                  >
                    Resume
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DriveFileRenameOutline fontSize="inherit" />}
                    onClick={() => setDraftDialog({ type: "rename", id: draft.id, title: draft.title || "" })}
                  >
                    Rename
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Delete fontSize="inherit" />}
                    onClick={() => setDraftDialog({ type: "delete", id: draft.id, title: draft.title || "Untitled draft" })}
                  >
                    Delete
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* ── Local recovery draft ─────────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Computer fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography variant="h6" fontWeight={700}>Local recovery draft</Typography>
        </Box>
        {localDraft ? (
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2.5, borderLeft: "3px dashed #bbb", display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={600} noWrap>{localDraft.title || "Untitled"}</Typography>
              {localDraft.sections.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Contains: {localDraft.sections.join(", ")}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block">
                Stored only in this browser — save as an account draft from the Curator to keep it.
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrow fontSize="inherit" />}
                component={Link}
                href="/curator?resumeDraft=1"
                sx={{ bgcolor: "#800000", "&:hover": { bgcolor: "#600000" } }}
              >
                Resume
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => { clearBrowserDraft(); setLocalDraft(null); }}
              >
                Clear
              </Button>
            </Box>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              No local recovery draft saved in this browser.
            </Typography>
          </Paper>
        )}

        {/* Dialogs */}
        <Dialog open={Boolean(draftDialog)} onClose={closeDialog} fullWidth maxWidth="xs">
          {draftDialog?.type === "rename" ? (
            <Fragment>
              <DialogTitle>Rename draft</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  label="Draft name"
                  value={draftDialog.title}
                  onChange={(e) => setDraftDialog((cur) => ({ ...cur, title: e.target.value }))}
                  fullWidth
                  margin="dense"
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDialog}>Cancel</Button>
                <Button onClick={confirmRename} variant="contained" disabled={draftSaving}>Save</Button>
              </DialogActions>
            </Fragment>
          ) : draftDialog ? (
            <Fragment>
              <DialogTitle>Delete this draft?</DialogTitle>
              <DialogContent>
                <Typography color="text.secondary">
                  &ldquo;{draftDialog.title}&rdquo; will be permanently deleted. This cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDialog}>Cancel</Button>
                <Button onClick={confirmDelete} variant="contained" color="error" disabled={draftSaving}>Delete</Button>
              </DialogActions>
            </Fragment>
          ) : null}
        </Dialog>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <SEO
        title="Qresp | Drafts"
        description="Your Qresp curator drafts"
        author="Qresp Team"
      />
      <AccountLayout pageTitle="Drafts">{content}</AccountLayout>
    </Fragment>
  );
};

export default DraftsPage;
