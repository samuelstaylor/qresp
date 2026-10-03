import { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  LinearProgress,
  Paper,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AutoAwesome,
  CheckCircle,
  ExpandMore,
  FolderOpen,
  InsertPhoto,
  PictureAsPdf,
  Search,
} from "@mui/icons-material";

import CuratorContext from "../../Context/Curator/curatorContext";
import AuthContext from "../../Context/Auth/authContext";
import { doiUtil } from "../../Utils/doi";
import { buildFileUrl, isPdfFile } from "../../Utils/fileServerUrl";
import { initialsOf } from "../Profile/ProfileLinks";
import { labelFor } from "../../Utils/artifactFields";
import {
  LISTS,
  buildImportPlan,
  countByList,
  curatorFromProfile,
  curatorIsBlank,
  curatorIsComplete,
  recordsNeedingDetails,
  referenceFromCrossref,
} from "../../Utils/autoCurate";

export const scrollToSection = (id) => {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const Summary = ({ children }) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: 2,
      bgcolor: "rgba(0,0,0,0.02)",
      border: "1px solid",
      borderColor: "divider",
    }}
  >
    {children}
  </Box>
);

const SectionLink = ({ target, children }) => (
  <Button size="small" onClick={() => scrollToSection(target)} sx={{ textTransform: "none" }}>
    {children}
  </Button>
);

// ---- step 5: one table for every required field still empty ---------------

const DetailField = ({ record, field, type, multiline, onSave, placeholder }) => {
  const initial = Array.isArray(record[field]) ? record[field].join(", ") : record[field] || "";
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return (
    <TextField
      size="small"
      fullWidth
      multiline={multiline}
      minRows={multiline ? 1 : undefined}
      maxRows={multiline ? 4 : undefined}
      label={labelFor(type, field)}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) onSave(field, value);
      }}
    />
  );
};

const Thumb = ({ server, file }) => {
  const [failed, setFailed] = useState(false);
  const url = buildFileUrl(server, file);
  const box = {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: 1,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "#fafafa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
  if (!url || failed || isPdfFile(file)) {
    return (
      <Box sx={box} component={url ? "a" : "div"} href={url || undefined} target="_blank" rel="noopener noreferrer">
        {isPdfFile(file) ? (
          <PictureAsPdf sx={{ color: "#800000" }} />
        ) : (
          <InsertPhoto sx={{ color: "text.disabled" }} />
        )}
      </Box>
    );
  }
  return (
    <Box sx={box}>
      <img src={url} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} onError={() => setFailed(true)} />
    </Box>
  );
};

const FinishDetails = ({ needing, fileServerPath, paperTags, edit }) => {
  const save = (type, record) => (field, raw) => {
    const listField = ["properties", "keywords", "files"].includes(field);
    const value = listField
      ? String(raw || "").split(",").map((s) => s.trim()).filter(Boolean)
      : raw;
    edit(type, { ...record, [field]: value });
  };

  const chartsMissingKeywords = needing.filter(
    (n) => n.type === "chart" && n.missing.includes("properties")
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {chartsMissingKeywords.length > 0 && paperTags.length > 0 && (
        <Alert
          severity="info"
          action={
            <Button
              size="small"
              onClick={() =>
                chartsMissingKeywords.forEach(({ record }) =>
                  edit("chart", { ...record, properties: paperTags })
                )
              }
            >
              Apply
            </Button>
          }
        >
          {`Use the paper's keywords (${paperTags.join(", ")}) for ${plural(
            chartsMissingKeywords.length,
            "figure",
            "figures"
          )} without keywords?`}
        </Alert>
      )}
      {needing.map(({ type, record, missing }) => (
        <Paper key={`${type}-${record.id}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            {type === "chart" ? (
              <Thumb server={fileServerPath} file={record.imageFile} />
            ) : null}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Chip size="small" label={LISTS.find((l) => l.type === type).noun} sx={{ textTransform: "capitalize" }} />
                <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                  {String(record.imageFile || (record.files || [])[0] || record.packageName || record.id)
                    .split("/")
                    .filter(Boolean)
                    .pop()}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: { xs: "1fr", sm: type === "chart" ? "110px 1fr" : "1fr" },
                }}
              >
                {missing
                  .filter((field) => field !== "imageFile" && field !== "files")
                  .map((field) => (
                    <Box
                      key={field}
                      sx={
                        field === "caption" || field === "readme" || field === "properties"
                          ? { gridColumn: { sm: "1 / -1" } }
                          : undefined
                      }
                    >
                      <DetailField
                        record={record}
                        field={field}
                        type={type}
                        multiline={field === "caption" || field === "readme"}
                        placeholder={
                          field === "number"
                            ? "e.g. 2 or S1"
                            : field === "properties"
                            ? "comma separated"
                            : undefined
                        }
                        onSave={save(type, record)}
                      />
                    </Box>
                  ))}
                {missing.some((f) => f === "imageFile" || f === "files") && (
                  <Typography variant="caption" color="error">
                    Choose its file in the record section below.
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

// ---- the setup ------------------------------------------------------------

const GuidedSetup = () => {
  const ctx = useContext(CuratorContext);
  const {
    metadata,
    curatorInfo,
    referenceInfo,
    paperInfo,
    fileServerPath,
    charts,
    datasets,
    scripts,
    tools,
    prefillCuratorInfo,
    collectDraftState,
    setAll,
    remountForms,
    importBundle,
    cacheRccAnalysis,
    edit,
  } = ctx;
  const { loading: authLoading, authenticated, user } = useContext(AuthContext);

  // Apply programmatic changes without losing anything typed into open
  // forms: snapshot every open form, merge, then remount so they re-seed.
  const apply = (patch) => {
    setAll({ ...collectDraftState(), ...patch });
    remountForms();
  };

  // 1. You -------------------------------------------------------------------
  useEffect(() => {
    if (authLoading || !authenticated || !user) return;
    if (curatorIsBlank(curatorInfo)) {
      const info = curatorFromProfile(user);
      if (info && (info.emailId || info.firstName)) prefillCuratorInfo(info);
    }
    // Only when the signed-in identity changes; a curator who clears the
    // form afterwards is not overridden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authenticated, user && user.email]);

  // 2. Paper -----------------------------------------------------------------
  const [doi, setDoi] = useState(referenceInfo.doi || "");
  const [doiBusy, setDoiBusy] = useState(false);
  const [doiError, setDoiError] = useState("");
  const [changingPaper, setChangingPaper] = useState(false);
  useEffect(() => {
    if (referenceInfo.doi) setDoi(referenceInfo.doi);
  }, [referenceInfo.doi]);

  const lookUpDoi = () => {
    const bare = doiUtil.normalize(doi);
    if (!doiUtil.isValid(bare)) {
      setDoiError("That does not look like a DOI. Example: 10.1038/s41524-025-01558-w");
      return;
    }
    setDoiBusy(true);
    setDoiError("");
    doiUtil
      .get(bare)
      .then((record) => {
        const current = collectDraftState();
        apply({ referenceInfo: referenceFromCrossref(record, { ...current.referenceInfo, doi: bare }) });
        setChangingPaper(false);
        locate(bare);
      })
      .catch(() =>
        setDoiError("No publication was found for that DOI. Check it, or fill in the paper details below.")
      )
      .finally(() => setDoiBusy(false));
  };

  // 3. Folder ----------------------------------------------------------------
  const [locating, setLocating] = useState(false);
  const [locateResult, setLocateResult] = useState(null);
  const locatedFor = useRef("");

  const locate = (rawDoi) => {
    const bare = doiUtil.normalize(rawDoi || referenceInfo.doi || "");
    if (!bare || !authenticated || locatedFor.current === bare) return;
    locatedFor.current = bare;
    setLocating(true);
    setLocateResult(null);
    axios
      .post("/api/curation/locate-folder", { doi: bare })
      .then((res) => {
        const data = res.data || {};
        setLocateResult(data);
        if (data.found && data.path && !collectDraftState().fileServerPath) {
          apply({ fileServerPath: data.path });
        }
      })
      .catch(() => setLocateResult({ found: false, error: true }))
      .finally(() => setLocating(false));
  };

  useEffect(() => {
    if (!fileServerPath && referenceInfo.doi && authenticated) locate(referenceInfo.doi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceInfo.doi, authenticated, fileServerPath]);

  // 4. Import ----------------------------------------------------------------
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [scannedPath, setScannedPath] = useState("");
  const [excluded, setExcluded] = useState({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [added, setAdded] = useState(null);

  const scan = () => {
    if (!fileServerPath) return;
    setScanning(true);
    setScanError("");
    setAdded(null);
    axios
      .post("/api/curation/analyze-folder", { path: fileServerPath })
      .then((res) => {
        setAnalysis(res.data || {});
        setScannedPath(fileServerPath);
        setExcluded({});
        if (cacheRccAnalysis) cacheRccAnalysis(fileServerPath, res.data || {});
      })
      .catch((err) =>
        setScanError(
          (err && err.response && err.response.data && err.response.data.error) ||
            "The folder could not be read."
        )
      )
      .finally(() => setScanning(false));
  };

  const artifactCount = charts.length + datasets.length + scripts.length + tools.length;

  // A different (or cleared) folder or paper makes earlier results stale --
  // this is also how Start Fresh resets the setup.
  useEffect(() => {
    if (fileServerPath !== scannedPath) {
      setAnalysis(null);
      setAdded(null);
      setScanError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileServerPath]);
  useEffect(() => {
    if (!referenceInfo.doi) {
      locatedFor.current = "";
      setLocateResult(null);
      setDoi("");
    }
  }, [referenceInfo.doi]);
  // Scan once, automatically, as soon as there is a folder and nothing yet.
  useEffect(() => {
    if (fileServerPath && authenticated && !artifactCount && scannedPath !== fileServerPath && !scanning) {
      scan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileServerPath, authenticated]);

  const paperTags = (paperInfo.tags || []).filter(Boolean);
  const plan = useMemo(
    () =>
      analysis
        ? buildImportPlan(analysis, { state: metadata, paperTags })
        : { items: [], links: [] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis, artifactCount]
  );
  const isIncluded = (item) => !item.duplicate && !excluded[item.key];
  const chosen = plan.items.filter(isIncluded);
  const chosenKeys = new Set(chosen.map((item) => item.key));
  const chosenLinks = plan.links.filter(
    (link) => chosenKeys.has(link.from) && chosenKeys.has(link.to) && !excluded[`${link.from}>${link.to}`]
  );
  const counts = countByList(chosen);
  const labels = Object.fromEntries(plan.items.map((item) => [item.key, item.label]));

  const addAll = () => {
    importBundle(
      chosen.map(({ key, list, value }) => ({ key, list, value })),
      chosenLinks.map(({ from, to, type }) => ({ from, to, type }))
    );
    setAdded({ counts, links: chosenLinks.length });
    setReviewOpen(false);
  };

  // 5. Finish ----------------------------------------------------------------
  const needing = recordsNeedingDetails(metadata);
  const paperMissing = [
    !(paperInfo.PIs && String(paperInfo.PIs).trim() && (!Array.isArray(paperInfo.PIs) || paperInfo.PIs.length)) && "principal investigators",
    !(paperInfo.collections && paperInfo.collections.length) && "collections",
    !(paperInfo.tags && paperInfo.tags.length) && "keywords",
  ].filter(Boolean);

  // ---- status ----
  const steps = {
    you: curatorIsComplete(curatorInfo),
    paper: Boolean(referenceInfo.title),
    folder: Boolean(fileServerPath),
    import: artifactCount > 0,
    finish: artifactCount > 0 && needing.length === 0 && paperMissing.length === 0,
  };
  const done = Object.values(steps).filter(Boolean).length;
  const firstOpen = ["you", "paper", "folder", "import", "finish"].findIndex((k) => !steps[k]);

  const stepLabel = (key, title, subtitle) => (
    <StepLabel
      optional={<Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      slotProps={{ label: { sx: { fontWeight: 700 } } }}
    >
      {title}
    </StepLabel>
  );

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", mb: 4 }} data-testid="guided-setup">
      <Box sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: "rgba(128,0,0,0.04)", borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesome sx={{ color: "#800000" }} fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            Guided setup
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">{`${done} of 5 done`}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Qresp fills in what it can from your profile, the paper's DOI and its
          project folder. You review it and add what only you know.
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(done / 5) * 100}
          sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: "rgba(128,0,0,0.08)" }}
        />
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stepper orientation="vertical" nonLinear activeStep={firstOpen === -1 ? 5 : firstOpen}>
          {/* 1. You */}
          <Step completed={steps.you} expanded>
            {stepLabel("you", "Who is curating", "From your Qresp profile")}
            <StepContent>
              {curatorIsComplete(curatorInfo) ? (
                <Summary>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={user && typeof user.avatar_b64 === "string" && user.avatar_b64.startsWith("data:image/") ? user.avatar_b64 : undefined}
                      sx={{ bgcolor: "#800000", width: 40, height: 40, fontSize: "0.95rem", fontWeight: 700 }}
                    >
                      {initialsOf(`${curatorInfo.firstName} ${curatorInfo.lastName}`, curatorInfo.emailId)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {[curatorInfo.firstName, curatorInfo.middleName, curatorInfo.lastName].filter(Boolean).join(" ")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ overflowWrap: "anywhere" }}>
                        {[curatorInfo.emailId, curatorInfo.affiliation].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <SectionLink target="curate-curator">Edit</SectionLink>
                  </Box>
                </Summary>
              ) : authenticated ? (
                <Typography variant="body2" color="text.secondary">
                  Your profile has no full name yet.{" "}
                  <Link href="/account" style={{ color: "#800000" }}>Add it to your profile</Link>{" "}
                  or <SectionLink target="curate-curator">fill it in below</SectionLink>.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  <Link href="/login?next=%2Fcurator" style={{ color: "#800000" }}>Sign in</Link>{" "}
                  to fill this from your profile and to look up the project folder.
                </Typography>
              )}
            </StepContent>
          </Step>

          {/* 2. Paper */}
          <Step completed={steps.paper} expanded>
            {stepLabel("paper", "The paper", "Looked up from its DOI")}
            <StepContent>
              {referenceInfo.title && !changingPaper ? (
                <Summary>
                  <Typography variant="body2" fontWeight={700}>{referenceInfo.title}</Typography>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
                    {[referenceInfo.authors, referenceInfo.year].filter(Boolean).join(" · ")}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
                    {referenceInfo.doi && <Chip size="small" variant="outlined" label={`DOI ${referenceInfo.doi}`} />}
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" onClick={() => setChangingPaper(true)} sx={{ textTransform: "none" }}>
                      Use a different DOI
                    </Button>
                    <SectionLink target="curate-reference">Edit details</SectionLink>
                  </Box>
                </Summary>
              ) : (
                <Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <TextField
                      size="small"
                      label="Paper DOI"
                      placeholder="10.1038/s41524-025-01558-w"
                      value={doi}
                      onChange={(e) => setDoi(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          lookUpDoi();
                        }
                      }}
                      sx={{ flex: "1 1 260px" }}
                      disabled={doiBusy}
                    />
                    <Button
                      variant="contained"
                      disableElevation
                      onClick={lookUpDoi}
                      disabled={doiBusy || !doi.trim()}
                      startIcon={doiBusy ? <CircularProgress size={16} color="inherit" /> : <Search />}
                      sx={{ textTransform: "none", minHeight: 40 }}
                    >
                      Look up
                    </Button>
                    {changingPaper && (
                      <Button onClick={() => setChangingPaper(false)} sx={{ textTransform: "none", minHeight: 40 }}>
                        Cancel
                      </Button>
                    )}
                  </Box>
                  {doiError && <Alert severity="warning" sx={{ mt: 1 }}>{doiError}</Alert>}
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
                    Fills in title, authors, journal, year and abstract. No DOI?{" "}
                    <SectionLink target="curate-reference">Enter the details by hand</SectionLink>
                  </Typography>
                </Box>
              )}
            </StepContent>
          </Step>

          {/* 3. Folder */}
          <Step completed={steps.folder} expanded>
            {stepLabel("folder", "Project folder", "Where the figures, data and scripts are stored")}
            <StepContent>
              {fileServerPath ? (
                <Summary>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FolderOpen sx={{ color: "#800000" }} fontSize="small" />
                    <Typography
                      component="a"
                      href={fileServerPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ color: "#800000", overflowWrap: "anywhere", flex: 1 }}
                    >
                      {fileServerPath}
                    </Typography>
                    <SectionLink target="curate-fileserver">Change</SectionLink>
                  </Box>
                  {locateResult && locateResult.found && locateResult.path === fileServerPath && (
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                      Found automatically from the DOI
                      {locateResult.folders && locateResult.folders.length
                        ? ` · contains ${locateResult.folders.join(", ")}`
                        : ""}
                    </Typography>
                  )}
                </Summary>
              ) : locating ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Looking for the paper's folder on the research computing server…
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {locateResult && !locateResult.found && !locateResult.error
                    ? "No folder named after this DOI was found on the file server. "
                    : !authenticated
                    ? "Sign in to find the folder automatically, or "
                    : referenceInfo.doi
                    ? ""
                    : "Look up the paper first and Qresp will look for its folder, or "}
                  <SectionLink target="curate-fileserver">choose the folder</SectionLink>
                </Typography>
              )}
            </StepContent>
          </Step>

          {/* 4. Import */}
          <Step completed={steps.import} expanded>
            {stepLabel("import", "Figures, data & scripts", "Read from the project folder")}
            <StepContent>
              {!fileServerPath ? (
                <Typography variant="body2" color="text.secondary">
                  Available once the project folder is set.
                </Typography>
              ) : scanning ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Reading the project folder… large folders can take a minute.
                  </Typography>
                  <LinearProgress />
                </Box>
              ) : scanError ? (
                <Alert
                  severity="warning"
                  action={<Button size="small" onClick={scan}>Try again</Button>}
                >
                  {scanError}
                </Alert>
              ) : added ? (
                <Alert severity="success" icon={<CheckCircle fontSize="inherit" />}>
                  {`Added ${LISTS.map(({ key, noun, plural: many }) =>
                    added.counts[key] ? plural(added.counts[key], noun, many) : null
                  )
                    .filter(Boolean)
                    .join(", ")}${added.links ? ` and ${plural(added.links, "link", "links")} between them` : ""}.`}{" "}
                  <SectionLink target="curate-figures">Review them</SectionLink>
                </Alert>
              ) : analysis ? (
                plan.items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nothing importable was found in this folder.{" "}
                    <SectionLink target="curate-figures">Add items by hand</SectionLink>
                  </Typography>
                ) : (
                  <Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                      {LISTS.map(({ key, noun, plural: many }) =>
                        counts[key] ? (
                          <Chip key={key} label={plural(counts[key], noun, many)} color="primary" variant="outlined" />
                        ) : null
                      )}
                      {chosenLinks.length > 0 && (
                        <Chip label={plural(chosenLinks.length, "link found", "links found")} variant="outlined" />
                      )}
                    </Box>
                    {plan.items.some((item) => item.duplicate) && (
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
                        Items already in this record are skipped.
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                      <Button
                        variant="contained"
                        disableElevation
                        onClick={addAll}
                        disabled={!chosen.length}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        {`Add ${plural(chosen.length, "item", "items")} to the record`}
                      </Button>
                      <Button
                        onClick={() => setReviewOpen((v) => !v)}
                        endIcon={<ExpandMore sx={{ transform: reviewOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
                        sx={{ textTransform: "none" }}
                      >
                        {reviewOpen ? "Hide list" : "Review the list"}
                      </Button>
                    </Box>
                    <Collapse in={reviewOpen} unmountOnExit>
                      <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {LISTS.map(({ key, plural: many }) => {
                          const group = plan.items.filter((item) => item.list === key && !item.duplicate);
                          if (!group.length) return null;
                          return (
                            <Box key={key}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                {many}
                              </Typography>
                              {group.map((item) => (
                                <Box key={item.key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Checkbox
                                    size="small"
                                    checked={!excluded[item.key]}
                                    onChange={(e) => setExcluded((x) => ({ ...x, [item.key]: !e.target.checked }))}
                                    slotProps={{ input: { "aria-label": item.label } }}
                                  />
                                  <Typography variant="body2" sx={{ overflowWrap: "anywhere", flex: 1 }}>
                                    {item.label}
                                    {item.type === "chart" && item.value.number ? (
                                      <Typography component="span" variant="caption" color="text.secondary">{`  · Figure ${item.value.number}`}</Typography>
                                    ) : null}
                                  </Typography>
                                  {item.missing.length > 0 && (
                                    <Tooltip title={`Still needs: ${item.missing.map((f) => labelFor(item.type, f)).join(", ")}`}>
                                      <Chip size="small" label={`${item.missing.length} to fill`} sx={{ height: 20 }} />
                                    </Tooltip>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          );
                        })}
                        {plan.links.length > 0 && (
                          <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              Links
                            </Typography>
                            {plan.links.map((link) => {
                              const id = `${link.from}>${link.to}`;
                              return (
                                <Box key={id + link.type} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Checkbox
                                    size="small"
                                    checked={!excluded[id]}
                                    onChange={(e) => setExcluded((x) => ({ ...x, [id]: !e.target.checked }))}
                                    slotProps={{ input: { "aria-label": `${labels[link.from]} to ${labels[link.to]}` } }}
                                  />
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                      {`${labels[link.from]} → ${labels[link.to]}`}
                                      {link.confidence === "medium" && (
                                        <Chip size="small" label="likely" sx={{ ml: 1, height: 18 }} />
                                      )}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">{link.reason}</Typography>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      Need finer control over what becomes a figure?{" "}
                      <SectionLink target="curate-figures">Use the detailed import</SectionLink>
                    </Typography>
                  </Box>
                )
              ) : artifactCount ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="body2" color="text.secondary">
                    {`This record has ${[
                      charts.length && plural(charts.length, "figure", "figures"),
                      datasets.length && plural(datasets.length, "dataset", "datasets"),
                      scripts.length && plural(scripts.length, "script", "scripts"),
                      tools.length && plural(tools.length, "tool", "tools"),
                    ]
                      .filter(Boolean)
                      .join(", ")}.`}
                  </Typography>
                  <Button size="small" onClick={scan} sx={{ textTransform: "none" }}>
                    Scan the folder for more
                  </Button>
                </Box>
              ) : (
                <Button variant="outlined" onClick={scan} sx={{ textTransform: "none" }}>
                  Scan the project folder
                </Button>
              )}
            </StepContent>
          </Step>

          {/* 5. Finish */}
          <Step completed={steps.finish} expanded>
            {stepLabel("finish", "Finish the details", "Captions and anything only you know")}
            <StepContent>
              {!artifactCount ? (
                <Typography variant="body2" color="text.secondary">
                  Available once figures are in the record.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {paperMissing.length > 0 && (
                    <Alert severity="info" action={<SectionLink target="curate-paperinfo">Open</SectionLink>}>
                      {`Paper details still need: ${paperMissing.join(", ")}.`}
                    </Alert>
                  )}
                  {needing.length > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {`${plural(needing.length, "item needs", "items need")} details. Changes save as you leave each field.`}
                      </Typography>
                      <FinishDetails
                        needing={needing}
                        fileServerPath={fileServerPath}
                        paperTags={paperTags}
                        edit={edit}
                      />
                    </>
                  ) : paperMissing.length === 0 ? (
                    <Alert
                      severity="success"
                      action={<SectionLink target="curate-publish">Go to publish</SectionLink>}
                    >
                      Everything required is filled in. Review the record below, then publish.
                    </Alert>
                  ) : null}
                </Box>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </Box>
    </Paper>
  );
};

export default GuidedSetup;
