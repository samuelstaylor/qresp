import { useState, useContext, Fragment } from "react";

import {
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  GetApp,
  RestartAlt,
  SaveOutlined,
  UploadFile,
  Visibility,
} from "@mui/icons-material";

import axios from "axios";

import { useRouter } from "next/router";

import { convertStateToViewSchema } from "../../Utils/model";

import { getServer } from "../../Utils/utils";
import { RegularStyledButton } from "../button";

import CuratorContext from "../../Context/Curator/curatorContext";
import AlertContext from "../../Context/Alert/alertContext";
import ServerContext from "../../Context/Servers/serverContext";
import AuthContext from "../../Context/Auth/authContext";

const preview = (metadata, setAlert, router) => {
  axios
    .post(getServer() + "/api/preview", convertStateToViewSchema(metadata))
    .then((res) => res.data)
    .then((res) =>
      router.push("/paperdetails/[id]", {
        pathname: `/paperdetails/${res}`,
        query: { server: getServer() },
      })
    )
    .catch((err) => {
      console.error(err);
      setAlert(
        "Error",
        "There was an error generating your preview, please talk to the administrators if the issue persists",
        null
      );
    });
};

const TopActions = () => {
  const {
    metadata,
    setAll,
    resetAll,
    hasMeaningfulDraft,
    getDraftTitle,
    saveDraftToServer,
  } = useContext(CuratorContext);
  const { setAlert, unsetAlert } = useContext(AlertContext);
  const { setSelectedHttp, selectedHttp } = useContext(ServerContext);
  const { authenticated } = useContext(AuthContext);
  const [mdata, setMdata] = useState("");
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [draftDialog, setDraftDialog] = useState({
    open: false,
    mode: "save",
    title: "",
  });

  const router = useRouter();
  const dialogButtonSx = {
    minWidth: { xs: "100%", sm: 0 },
    whiteSpace: "nowrap",
  };

  const openDraftDialog = (mode = "save") => {
    setDraftDialog({
      open: true,
      mode,
      title:
        (getDraftTitle && getDraftTitle()) ||
        (metadata.referenceInfo && metadata.referenceInfo.title) ||
        "Untitled draft",
    });
  };

  const closeDraftDialog = () =>
    setDraftDialog((current) => ({ ...current, open: false }));

  const saveNamedDraft = () => {
    const title = draftDialog.title.trim() || "Untitled draft";
    saveDraftToServer(title)
      .then(() => {
        closeDraftDialog();
        if (draftDialog.mode === "scratch") {
          resetAll({ preserveDraft: false });
          unsetAlert();
          return;
        }
        setAlert(
          "Draft saved",
          "Your draft was saved to your account. Resume it any time from Account > My drafts.",
          null
        );
      })
      .catch(() => {
        setAlert(
          "Error",
          "Your draft could not be saved. Please check that you are still signed in and try again.",
          null
        );
      });
  };

  const onClicks = {
    saveDraft: () => {
      if (!authenticated) {
        setAlert(
          "Sign in required",
          "Sign in to save drafts to your account. Account drafts can be resumed from any browser via the Account page.",
          null
        );
        return;
      }
      openDraftDialog("save");
    },
    resume: () => {
      setResumeDialogOpen(true);
    },
    scratch: () => {
      const hasCurrentWork = hasMeaningfulDraft ? hasMeaningfulDraft() : false;
      const discardAndReset = () => {
        resetAll({ preserveDraft: false });
        unsetAlert();
      };
      const saveAndReset = () => {
        unsetAlert();
        openDraftDialog("scratch");
      };
      setAlert(
        "Start from scratch?",
        hasCurrentWork
          ? authenticated
            ? "Save this work as a draft in your account before clearing the form, or discard it and start fresh."
            : "This will clear the current curator form. Sign in first if you want to save this work as an account draft."
          : "This will clear the current curator form.",
        <Fragment>
          <RegularStyledButton sx={dialogButtonSx} onClick={unsetAlert}>
            Cancel
          </RegularStyledButton>
          {authenticated && hasCurrentWork ? (
            <RegularStyledButton sx={dialogButtonSx} onClick={saveAndReset}>
              Save Draft and Start Fresh
            </RegularStyledButton>
          ) : null}
          <RegularStyledButton sx={dialogButtonSx} onClick={discardAndReset}>
            Discard and Start Fresh
          </RegularStyledButton>
        </Fragment>,
        { hideDismiss: true }
      );
    },
    download: (metadata) => {
      return { ...metadata, selectedHttp: selectedHttp };
    },
    preview: (e) => {
      e.preventDefault();
      preview(metadata, setAlert, router);
    },
  };


  const onFileUpload = async (e) => {
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setMdata(ev.target.result);
    };
    reader.readAsText(e.target.files[0]);
  };

  const useMetadata = () => {
    try {
      const values = JSON.parse(mdata);
      setSelectedHttp(values.selectedHttp);
      delete values.selectedHttp;
      setAll(values);
      setResumeDialogOpen(false);
    } catch (e) {
      console.error(e);
      setAlert(
        "Error",
        " There was an error parsing your file, please provide a valid json file.",
        null
      );
    }
  };

  return (
    <Fragment>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        {/* Left group — draft workflow */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mr: 0.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: { xs: "none", sm: "block" } }}
        >
          Draft
        </Typography>

        <Tooltip title="Save this work as a named draft in your account">
          <Button
            variant="outlined"
            size="small"
            startIcon={<SaveOutlined />}
            onClick={onClicks.saveDraft}
            sx={{ borderColor: "#800000", color: "#800000", "&:hover": { borderColor: "#800000", bgcolor: "rgba(128,0,0,0.06)" } }}
          >
            Save Draft
          </Button>
        </Tooltip>

        <Tooltip title="Load a previously exported metadata JSON file">
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFile />}
            onClick={onClicks.resume}
            sx={{ color: "text.secondary", borderColor: "divider" }}
          >
            Upload Metadata
          </Button>
        </Tooltip>

        <Tooltip title="Clear the form and start a fresh submission">
          <Button
            variant="text"
            size="small"
            startIcon={<RestartAlt />}
            onClick={onClicks.scratch}
            color="error"
            sx={{ ml: 0.5 }}
          >
            Start Fresh
          </Button>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />

        {/* Right group — view/export */}
        <Tooltip title="Export the current metadata as a JSON file">
          <Button
            variant="outlined"
            size="small"
            startIcon={<GetApp />}
            href={`data:text/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(onClicks.download(metadata), null, 2)
            )}`}
            download="metadata.json"
            sx={{ color: "text.secondary", borderColor: "divider" }}
          >
            Export
          </Button>
        </Tooltip>

        <Tooltip title="Preview how this paper will look when published">
          <Button
            variant="contained"
            size="small"
            startIcon={<Visibility />}
            onClick={onClicks.preview}
            sx={{ bgcolor: "#800000", "&:hover": { bgcolor: "#9a0000" } }}
          >
            Preview
          </Button>
        </Tooltip>
      </Box>
      <Dialog
        open={resumeDialogOpen}
        onClose={() => setResumeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Load Metadata JSON</DialogTitle>
        <DialogContent dividers>
          <input
            accept="application/json"
            id="uploadJSON"
            type="file"
            style={{ display: "none" }}
            onChange={onFileUpload}
          />
          <label htmlFor="uploadJSON">
            <RegularStyledButton
              variant="contained"
              color="primary"
              component="span"
              fullWidth
            >
              Upload
            </RegularStyledButton>
          </label>
          <TextField
            value={mdata}
            label="Metadata"
            placeholder="Paste your metadata here"
            variant="outlined"
            multiline
            rows={24}
            fullWidth
            style={{ marginTop: "1em" }}
            onChange={(e) => setMdata(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <RegularStyledButton onClick={useMetadata}>
            Use this metadata
          </RegularStyledButton>
          <RegularStyledButton onClick={() => setResumeDialogOpen(false)}>
            Cancel
          </RegularStyledButton>
        </DialogActions>
      </Dialog>
      <Dialog
        open={draftDialog.open}
        onClose={closeDraftDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {draftDialog.mode === "scratch"
            ? "Save draft before starting fresh"
            : "Save draft"}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            label="Draft name"
            value={draftDialog.title}
            onChange={(event) =>
              setDraftDialog((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            fullWidth
            helperText="Drafts can be incomplete. Required fields are checked when you publish."
          />
        </DialogContent>
        <DialogActions>
          <RegularStyledButton onClick={closeDraftDialog}>
            Cancel
          </RegularStyledButton>
          <RegularStyledButton onClick={saveNamedDraft}>
            {draftDialog.mode === "scratch"
              ? "Save Draft and Start Fresh"
              : "Save Draft"}
          </RegularStyledButton>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
};

export { preview };
export default TopActions;
