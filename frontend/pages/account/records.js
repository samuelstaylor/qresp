import { Fragment, useContext, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Edit, OpenInNew, People, ToggleOff, ToggleOn } from "@mui/icons-material";

import SEO from "../../components/seo";
import AccountLayout from "../../components/Account/AccountLayout";
import OwnerlessRecords from "../../components/Account/OwnerlessRecords";
import AllRecords from "../../components/Account/AllRecords";
import AuthContext from "../../Context/Auth/authContext";
import { getServer } from "../../Utils/utils";

const RecordsPage = () => {
  const { loading, authenticated, user } = useContext(AuthContext);
  const [papers, setPapers] = useState(null);
  const [recordDialog, setRecordDialog] = useState(null);
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordError, setRecordError] = useState("");
  const origin = typeof window === "undefined" ? "" : getServer();

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    axios
      .get("/api/account/papers")
      .then((res) => { if (!cancelled) setPapers(res.data.papers || []); })
      .catch(() => { if (!cancelled) setPapers([]); });
    return () => { cancelled = true; };
  }, [authenticated]);

  const closeDialog = () => { setRecordDialog(null); setRecordSaving(false); };

  const confirmSetActive = () => {
    const { id, type } = recordDialog;
    const active = type === "reactivate";
    setRecordSaving(true);
    setRecordError("");
    axios
      .put(`/api/paper/${encodeURIComponent(id)}/active`, { active })
      .then(() => {
        setPapers((items) =>
          (items || []).map((p) => p.id === id ? { ...p, is_active: active } : p)
        );
        closeDialog();
      })
      .catch(() => {
        setRecordError(active ? "Could not reactivate. Please try again." : "Could not deactivate. Please try again.");
        closeDialog();
      });
  };

  const confirmSetEditors = () => {
    const { id, value } = recordDialog;
    const editors = (value || "").split(",").map((e) => e.trim()).filter(Boolean);
    setRecordSaving(true);
    axios
      .put(`/api/paper/${encodeURIComponent(id)}/editors`, { editor_emails: editors })
      .then((res) => {
        setPapers((items) =>
          (items || []).map((p) => p.id === id ? { ...p, editor_emails: res.data.editor_emails } : p)
        );
        closeDialog();
      })
      .catch((err) => {
        const msg = err?.response?.data?.error || "Could not update editors. Please try again.";
        setRecordSaving(false);
        setRecordDialog((cur) => cur ? { ...cur, error: msg } : cur);
      });
  };

  let content;
  if (loading) {
    content = <Typography color="text.secondary">Checking sign-in…</Typography>;
  } else if (!authenticated) {
    content = (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, maxWidth: 440 }}>
        <Typography variant="h6" gutterBottom>Sign in to view your records</Typography>
        <Typography variant="body2" color="text.secondary">
          Use &ldquo;Sign in&rdquo; in the header to access your published records.
        </Typography>
      </Paper>
    );
  } else {
    content = (
      <Fragment>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            href="/curator"
            sx={{ bgcolor: "#800000", "&:hover": { bgcolor: "#600000" } }}
          >
            New record
          </Button>
        </Box>

        {recordError && (
          <Typography color="error" sx={{ mb: 2 }}>{recordError}</Typography>
        )}

        {papers === null ? (
          <Typography color="text.secondary">Loading records…</Typography>
        ) : papers.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <Typography variant="h6" gutterBottom>No published records yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Records you publish will appear here and can be edited or managed.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              component={Link}
              href="/curator"
            >
              Create your first record
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {papers.map((paper) => {
              const deactivated = paper.is_active === false;
              const canManage = user.is_admin || paper.role !== "editor";
              return (
                <Paper
                  key={paper.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    opacity: deactivated ? 0.65 : 1,
                    borderLeft: deactivated ? "3px solid #bbb" : "3px solid #800000",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.25 }}>
                        <Typography fontWeight={600} noWrap sx={{ maxWidth: "100%" }}>
                          {paper.title}{paper.year ? ` (${paper.year})` : ""}
                        </Typography>
                        {paper.role === "editor" && (
                          <Chip label="editor" size="small" variant="outlined" />
                        )}
                        {deactivated && (
                          <Chip label="deactivated" size="small" color="default" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {paper.authors}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>
                      {!deactivated && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<OpenInNew fontSize="inherit" />}
                          component={Link}
                          href={`/paperdetails/${encodeURIComponent(paper.id)}?server=${encodeURIComponent(origin)}`}
                        >
                          View
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit fontSize="inherit" />}
                        component={Link}
                        href={`/curator?edit=${encodeURIComponent(paper.id)}&server=${encodeURIComponent(origin)}`}
                      >
                        Edit
                      </Button>
                      {canManage && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<People fontSize="inherit" />}
                          onClick={() =>
                            setRecordDialog({
                              type: "editors",
                              id: paper.id,
                              title: paper.title || "this record",
                              value: (paper.editor_emails || []).join(", "),
                            })
                          }
                        >
                          Editors
                        </Button>
                      )}
                      {canManage && (
                        deactivated ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<ToggleOn fontSize="inherit" />}
                            onClick={() =>
                              setRecordDialog({ type: "reactivate", id: paper.id, title: paper.title || "this record" })
                            }
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<ToggleOff fontSize="inherit" />}
                            onClick={() =>
                              setRecordDialog({ type: "deactivate", id: paper.id, title: paper.title || "this record" })
                            }
                          >
                            Deactivate
                          </Button>
                        )
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}

        {/* Admin sections */}
        {user.is_admin && (
          <Fragment>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Admin — Ownerless records
            </Typography>
            <OwnerlessRecords />
            <Divider sx={{ my: 4 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Admin — All records
            </Typography>
            <AllRecords />
          </Fragment>
        )}

        {/* Dialogs */}
        <Dialog open={Boolean(recordDialog)} onClose={closeDialog} fullWidth maxWidth="xs">
          {recordDialog?.type === "editors" ? (
            <Fragment>
              <DialogTitle>Manage editors</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Editors can edit &ldquo;{recordDialog.title}&rdquo; but cannot deactivate it or change this list.
                </Typography>
                <TextField
                  autoFocus
                  label="Editor emails"
                  value={recordDialog.value || ""}
                  onChange={(e) =>
                    setRecordDialog((cur) => ({ ...cur, value: e.target.value }))
                  }
                  fullWidth
                  margin="dense"
                  helperText="Comma-separated email addresses. Leave empty to remove all editors."
                />
                {recordDialog.error && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {recordDialog.error}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDialog}>Cancel</Button>
                <Button onClick={confirmSetEditors} variant="contained" disabled={recordSaving}>Save</Button>
              </DialogActions>
            </Fragment>
          ) : recordDialog ? (
            <Fragment>
              <DialogTitle>
                {recordDialog.type === "reactivate" ? "Reactivate record?" : "Deactivate record?"}
              </DialogTitle>
              <DialogContent>
                <Typography color="text.secondary">
                  {recordDialog.type === "reactivate"
                    ? `"${recordDialog.title}" will become publicly visible again.`
                    : `"${recordDialog.title}" will be hidden from public search and the explorer. It is not deleted — you can reactivate it at any time.`}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDialog}>Cancel</Button>
                <Button
                  onClick={confirmSetActive}
                  variant="contained"
                  color={recordDialog.type === "reactivate" ? "primary" : "error"}
                  disabled={recordSaving}
                >
                  {recordDialog.type === "reactivate" ? "Reactivate" : "Deactivate"}
                </Button>
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
        title="Qresp | My Records"
        description="Manage your published Qresp records"
        author="Qresp Team"
      />
      <AccountLayout pageTitle="My Records">{content}</AccountLayout>
    </Fragment>
  );
};

export default RecordsPage;
