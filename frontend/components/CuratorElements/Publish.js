import { useContext, useState, Fragment } from "react";
import axios from "axios";
import Router from "next/router";
import { Box, Button, Paper, Typography } from "@mui/material";
import { Save, Visibility } from "@mui/icons-material";

import Ajv from "ajv";

import { RegularStyledButton } from "../button";
import { convertStatetoReqSchema } from "../../Utils/model";
import { getServer } from "../../Utils/utils";
import { deleteServerDraft } from "../../Utils/serverDrafts";

import Schema from "../../public/schema_v1.2.json";
import CuratorContext from "../../Context/Curator/curatorContext";
import CuratorHelperContext from "../../Context/CuratorHelpers/curatorHelperContext";
import ServerContext from "../../Context/Servers/serverContext";
import AlertContext from "../../Context/Alert/alertContext";
import LoadingContext from "../../Context/Loading/loadingContext";
import { saveThenPreview } from "./TopActions";

const variableTotext = {
  curatorInfo: "Curator Information",
  paperInfo: "Qresp Curation Information",
  fileServerPathInfo: "File Server Information",
  referenceInfo: "Publication Information for This Paper",
  documentationInfo: "Documentation Information",
  licenseInfo: "License Information",
  workflowInfo: "Workflow Graph",
};

// `$id`/`id` anchors removed; property schemas NAMED "id" are kept (their
// value is an object, an anchor's is a string).
export const stripSchemaIds = (node) => {
  if (Array.isArray(node)) return node.map(stripSchemaIds);
  if (!node || typeof node !== "object") return node;
  const out = {};
  Object.entries(node).forEach(([key, value]) => {
    if ((key === "$id" || key === "id") && typeof value === "string") return;
    out[key] = stripSchemaIds(value);
  });
  return out;
};

let compiledSchema;
export const publishSchemaValidator = () => {
  if (compiledSchema === undefined) {
    try {
      compiledSchema = new Ajv({ strict: false, allErrors: true }).compile(
        stripSchemaIds(Schema)
      );
    } catch (e) {
      // Leave it to the server; never block or crash the curator over this.
      compiledSchema = null;
    }
  }
  return compiledSchema;
};

const validate = (editing, metadata) => {
  /*
  Validate before sending a publish request
    1. Check if any of the sections are in edit mode 
    2. Check if there any charts and datasets
    3. Use the json schema validator for sanity check (each individual section was fixed before only) 
  */

  const errors = [];
  const { charts, datasets } = metadata;

  const incomplete = Object.keys(editing)
    .map((el) => (editing[el] ? el : null))
    .filter((el) => el != null && el != "documentationInfo");

  if (incomplete.length > 0) {
    errors.push(
      <Fragment>
        <strong>
          The following required sections are not saved, please complete them
          (if not already) and save them:
        </strong>
        <ul>
          {incomplete.map((el, i) => (
            <li key={i}>{variableTotext[el]}</li>
          ))}
        </ul>
      </Fragment>
    );
  }

  if (charts.length == 0 || datasets.length == 0) {
    let str = "";
    if (errors.length == 0) {
      str += "Also, you ";
    } else {
      str += "You ";
    }
    str +=
      "need at least one item in each of the sections below to publish on Qresp:";
    errors.push(
      <Fragment>
        <strong>{str}</strong>
        <ul>
          {charts.length == 0 && <li>Charts</li>}
          {datasets.length == 0 && <li>Datasets</li>}
        </ul>
      </Fragment>
    );
  }
  if (errors.length > 0) return { valid: false, errors: errors };

  // The same schema the server checks. Its draft-04-era `$id` anchors are
  // duplicated (e.g. "#/properties/collections/items" twice), which Ajv 8
  // refuses to compile -- so they are stripped from a copy first. If it
  // still cannot compile, the server re-validates every publish anyway.
  const check = publishSchemaValidator();
  if (check) {
    if (!check(metadata)) {
      return {
        valid: false,
        errors: [
          <Fragment key="schema">
            <strong>The record does not match the publishing format:</strong>
            <ul>
              {(check.errors || []).slice(0, 8).map((error, i) => (
                <li key={i}>
                  {`${error.instancePath || "record"} ${error.message}`}
                </li>
              ))}
            </ul>
          </Fragment>,
        ],
      };
    }
  }

  return { valid: true, errors: errors };
};

// Reused by the edit flow (EditMode.js) so create and edit validate alike.
export { validate };

const getPublishErrorMessage = (err) => {
  const data = err && err.response && err.response.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    if (data.msg) return data.msg;
    if (data.error) return data.error;
    if (data.message) return data.message;
    return JSON.stringify(data);
  }
  if (err && err.message) return err.message;
  return "Please try again.";
};

export { getPublishErrorMessage };

const makePublishRequest = (
  paper,
  setAlert,
  showLoader,
  hideLoader,
  draft = {}
) => {
  const { activeDraftId, clearActiveDraft } = draft;
  showLoader();
  axios
    .post(getServer() + "/api/publish", paper)
    .then((res) => {
      const verifyLink = res.data && res.data.verify_link;
      // Only safe to clear the account draft AFTER the paper is verified
      // (the verify link/email finishes publishing). So we don't auto-delete;
      // instead, when publishing from a saved draft, we offer an explicit
      // "delete that draft" action the user can take once they've verified.
      const removeDraft = () => {
        deleteServerDraft(activeDraftId)
          .then(() => {
            if (clearActiveDraft) clearActiveDraft();
            setAlert(
              "Draft removed",
              "The saved draft you published from was deleted from your account.",
              null
            );
          })
          .catch(() => {
            setAlert(
              "Error",
              "The draft could not be deleted. You can remove it from Account > My drafts.",
              null
            );
          });
      };
      const draftButton = activeDraftId ? (
        <RegularStyledButton onClick={removeDraft}>
          Delete the saved draft
        </RegularStyledButton>
      ) : null;
      setAlert(
        "Success",
        verifyLink ? (
          <p style={{ textAlign: "justify" }}>
            Queued for verification. Click this verification link to finish
            publishing.
            <br />
            <a href={verifyLink}>{verifyLink}</a>
            {activeDraftId ? (
              <Fragment>
                <br />
                <br />
                Once you have finished verifying, you can delete the saved
                draft you published from.
              </Fragment>
            ) : null}
          </p>
        ) : (
          <p style={{ textAlign: "justify" }}>
            We've sent you an email with a link to publish the paper. Check the
            email you provided, just click the link in there to publish the
            paper.
            <br /> If you have any questions or issues, please feel free to
            write to us.
            <br />
            <br /> Thank You
          </p>
        ),
        verifyLink ? (
          <Fragment>
            <RegularStyledButton component="a" href={verifyLink}>
              Open verification link
            </RegularStyledButton>
            {draftButton}
          </Fragment>
        ) : (
          draftButton
        )
      );
    })
    .catch((err) => {
      console.error(err);
      const message = getPublishErrorMessage(err);
      setAlert(
        "Error !",
        <p>
          We're very sorry but there was an error publishing the paper!, Please
          try again
          <br />
          {message && `Error Message: ${message}`}
        </p>,
        null
      );
    })
    .finally(() => hideLoader());
};

const Publish = () => {
  const {
    metadata,
    activeDraftId,
    clearActiveDraft,
    collectDraftState,
    saveDraftToServer,
    getDraftTitle,
  } = useContext(CuratorContext);

  const { editing } = useContext(CuratorHelperContext);
  const { selectedHttp } = useContext(ServerContext);
  const { setAlert } = useContext(AlertContext);
  const { showLoader, hideLoader } = useContext(LoadingContext);
  const [draftSaving, setDraftSaving] = useState(false);

  const onPreview = () =>
    saveThenPreview({
      metadata,
      collectDraftState,
      saveDraftToServer,
      getDraftTitle,
      setAlert,
      router: { push: (...args) => Router.push(...args) },
    });

  const onSaveDraft = () => {
    if (!saveDraftToServer) return;
    const title =
      (getDraftTitle && getDraftTitle()) ||
      (metadata.referenceInfo && metadata.referenceInfo.title) ||
      "Untitled draft";
    setDraftSaving(true);
    saveDraftToServer(title)
      .then(() =>
        setAlert(
          "Draft saved",
          "Your draft was saved to your account. Resume it any time from Account > My drafts.",
          null
        )
      )
      .catch(() =>
        setAlert(
          "Error",
          "Your draft could not be saved. Please check that you are still signed in and try again.",
          null
        )
      )
      .finally(() => setDraftSaving(false));
  };

  const onClick = () => {
    const paper = convertStatetoReqSchema(metadata, selectedHttp);
    const isValid = validate(editing, paper);
    if (!isValid.valid) {
      setAlert(
        "Something's missing",
        <Fragment>
          {isValid.errors.map((el, i) => (
            <div key={i}>{el}</div>
          ))}
        </Fragment>,
        null
      );
      return;
    }

    makePublishRequest(paper, setAlert, showLoader, hideLoader, {
      activeDraftId,
      clearActiveDraft,
    });
  };

  return (
    <Box sx={{ mt: 5, mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", letterSpacing: "0.12em", whiteSpace: "nowrap" }}
        >
          Ready to publish?
        </Typography>
        <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 2,
          borderColor: "rgba(128,0,0,0.25)",
          bgcolor: "rgba(128,0,0,0.02)",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          All required sections must be saved before publishing. After submitting,
          your paper will be queued for verification and you&rsquo;ll receive a
          confirmation email with a verification link.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onClick}
          sx={{
            bgcolor: "#800000",
            "&:hover": { bgcolor: "#9a0000" },
            py: 1.5,
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            borderRadius: 2,
          }}
        >
          Publish Paper
        </Button>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
            mt: 1.5,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            onClick={onPreview}
            sx={{ color: "#800000", borderColor: "rgba(128,0,0,0.5)", borderRadius: 2 }}
          >
            Save &amp; preview record
          </Button>
          <Button
            variant="outlined"
            startIcon={<Save />}
            onClick={onSaveDraft}
            disabled={draftSaving || !saveDraftToServer}
            sx={{ color: "#800000", borderColor: "rgba(128,0,0,0.5)", borderRadius: 2 }}
          >
            {draftSaving ? "Saving…" : "Save draft"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Publish;
