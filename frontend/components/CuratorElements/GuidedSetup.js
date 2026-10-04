import { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  LinearProgress,
  Paper,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AutoAwesome,
  CheckCircle,
  Description,
  Psychology,
  ExpandMore,
  FolderOpen,
  InsertPhoto,
  PictureAsPdf,
  Search,
} from "@mui/icons-material";

import CuratorContext from "../../Context/Curator/curatorContext";
import AuthContext from "../../Context/Auth/authContext";
import ServerContext from "../../Context/Servers/serverContext";
import SourceTreeContext from "../../Context/SourceTree/SourceTreeContext";
import { getList } from "../../Utils/Scraper";
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

const ModelNote = ({ models }) =>
  models && models.length ? (
    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
      {`Suggested by ${models.join(", ")}`}
    </Typography>
  ) : null;

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
    resetVersion,
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
    // On sign-in and after every reset (Start Fresh, a new form), never on
    // ordinary edits: a curator who clears a field is not overridden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authenticated, user && user.email, resetVersion]);

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

  // Choosing the folder here: paste/type an address, or browse the file
  // server with the same picker the full form uses.
  const { httpServers, setSelectedHttp } = useContext(ServerContext) || {};
  const {
    setTree,
    openSelector,
    setSaveMethod,
    setConfirmLabel,
    setMultiple,
  } = useContext(SourceTreeContext) || {};
  const [editingFolder, setEditingFolder] = useState(false);
  const [folderInput, setFolderInput] = useState("");
  const [folderError, setFolderError] = useState("");
  const [pendingFolder, setPendingFolder] = useState(null);
  const [browsing, setBrowsing] = useState(false);

  // The file server to browse, chosen from the configured list (RCC by
  // default) or typed in. Defaults to the server the saved folder is on.
  const serverOptions = (httpServers || []).filter((server) => server && server.value);
  const serverFor = (path) =>
    serverOptions
      .map((server) => server.value)
      .filter((value) => String(path || "").startsWith(value))
      .sort((a, b) => b.length - a.length)[0] ||
    (serverOptions[0] && serverOptions[0].value) ||
    "";
  const [serverRoot, setServerRoot] = useState("");
  useEffect(() => {
    if (!serverRoot) setServerRoot(serverFor(fileServerPath));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverOptions.length, fileServerPath]);

  const startEditingFolder = () => {
    setServerRoot(serverFor(fileServerPath));
    setFolderInput(fileServerPath || "");
    setFolderError("");
    setPendingFolder(null);
    setEditingFolder(true);
  };

  const commitFolder = (raw, { force = false } = {}) => {
    const folder = String(raw || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^\s]+$/i.test(folder)) {
      setFolderError("Enter the folder's full address, starting with https://");
      return;
    }
    const current = collectDraftState();
    // Every figure, dataset and script path is relative to this folder, so
    // moving it re-points them all. Same warning as the full form.
    if (!force && (current.charts || []).length && current.fileServerPath &&
        current.fileServerPath !== folder) {
      setPendingFolder(folder);
      return;
    }
    apply({ fileServerPath: folder });
    setFolderError("");
    setPendingFolder(null);
    setEditingFolder(false);
  };

  const browseFolders = () => {
    const root = String(serverRoot || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^\s]+$/i.test(root)) {
      setFolderError("Choose a file server to browse, or enter its address starting with https://");
      return;
    }
    if (!openSelector || !setTree || !setSaveMethod) {
      setFolderError("Browsing is not available here. Paste the folder address instead.");
      return;
    }
    setSaveMethod((picked) => {
      setFolderInput(picked);
      commitFolder(picked);
    });
    if (setMultiple) setMultiple(false);
    if (setConfirmLabel) setConfirmLabel("Use folder");
    setBrowsing(true);
    setFolderError("");
    getList(root, "http", true, null)
      .then((listing) => {
        if (setSelectedHttp) setSelectedHttp(listing.details);
        setTree(listing.files);
        openSelector();
      })
      .catch(() =>
        setFolderError("That file server could not be listed. Check the address, or paste the folder address instead.")
      )
      .finally(() => setBrowsing(false));
  };

  const showFolderEditor = editingFolder || (!fileServerPath && !locating);

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

  // 5. Captions from the paper's LaTeX ------------------------------------------
  const [srcMode, setSrcMode] = useState("arxiv");
  const [arxivInput, setArxivInput] = useState("");
  const [latexBusy, setLatexBusy] = useState(false);
  const [latexError, setLatexError] = useState("");
  const [latexResult, setLatexResult] = useState(null);
  const [captionSkip, setCaptionSkip] = useState({});
  const [captionsApplied, setCaptionsApplied] = useState(null);
  const arxivSearchedFor = useRef("");

  // Look the paper up on arXiv once its title is known, and offer the id.
  useEffect(() => {
    const title = (referenceInfo.title || "").trim();
    if (!title || !authenticated || arxivSearchedFor.current === title) return;
    arxivSearchedFor.current = title;
    axios
      .post("/api/curation/find-arxiv", { title })
      .then((res) => {
        const data = res.data || {};
        if (data.found && data.arxiv) setArxivInput((current) => current || data.arxiv);
      })
      .catch(() => {});
  }, [referenceInfo.title, authenticated]);

  const runLatex = (payload) => {
    setLatexBusy(true);
    setLatexError("");
    setLatexResult(null);
    setCaptionsApplied(null);
    axios
      .post("/api/curation/latex-captions", {
        ...payload,
        charts: charts.map(({ id, imageFile, number }) => ({ id, imageFile, number })),
      })
      .then((res) => {
        const data = res.data || {};
        setLatexResult(data);
        const skip = {};
        (data.matches || []).forEach((match) => {
          const record = charts.find((chart) => chart.id === match.id);
          // A caption the curator already wrote is only replaced on request.
          if (record && String(record.caption || "").trim()) skip[match.id] = true;
        });
        setCaptionSkip(skip);
      })
      .catch((err) => {
        const response = err && err.response;
        setLatexError(
          (response && response.data && response.data.error) ||
            (response && response.status === 404
              ? "This Qresp server cannot read LaTeX yet. If it was just updated, the backend needs a restart."
              : "The LaTeX source could not be read.")
        );
      })
      .finally(() => setLatexBusy(false));
  };

  const onLatexFile = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setLatexError("That file is larger than 10 MB. Upload just the .tex files, or a .zip without the images.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      runLatex({ filename: file.name, content_b64: result.slice(result.indexOf(",") + 1) });
    };
    reader.onerror = () => setLatexError("The file could not be read.");
    reader.readAsDataURL(file);
  };

  const captionMatches = ((latexResult && latexResult.matches) || []).filter((match) => {
    const record = charts.find((chart) => chart.id === match.id);
    return record && String(record.caption || "").trim() !== match.caption;
  });
  const captionChosen = captionMatches.filter((match) => !captionSkip[match.id]);

  const applyCaptions = () => {
    captionChosen.forEach((match) => {
      const record = charts.find((chart) => chart.id === match.id);
      if (!record) return;
      edit("chart", {
        ...record,
        caption: match.caption,
        number: String(record.number || "").trim() ? record.number : match.number,
      });
    });
    setCaptionsApplied(captionChosen.length);
    setLatexResult(null);
  };

  const chartFileName = (id) => {
    const record = charts.find((chart) => chart.id === id);
    return String((record && record.imageFile) || id).split("/").filter(Boolean).pop();
  };
  const uncaptioned = charts.filter((chart) => !String(chart.caption || "").trim()).length;

  // 6. AI assistant (optional) --------------------------------------------------
  const [aiConsent, setAiConsent] = useState(false);
  const [aiBusy, setAiBusy] = useState("");
  const [aiError, setAiError] = useState("");
  const [kwResult, setKwResult] = useState(null);
  const [kwSkip, setKwSkip] = useState({});
  const [linkResult, setLinkResult] = useState(null);
  const [linkSkip, setLinkSkip] = useState({});
  const [aiApplied, setAiApplied] = useState("");

  const aiErrorFrom = (err) => {
    const response = err && err.response;
    const message = (response && response.data && response.data.error) || "";
    if (response && response.status === 503 && /not configured/i.test(message)) {
      return "AI suggestions are not set up on this server. An administrator can turn them on with QRESP_GEMINI_ENABLED and QRESP_GEMINI_API_KEY.";
    }
    if (response && response.status === 404) {
      return "This Qresp server does not have AI suggestions yet. If it was just updated, the backend needs a restart.";
    }
    return (response && response.data && response.data.error) || "The AI suggestions could not be loaded.";
  };

  const paperForAi = () => ({
    title: referenceInfo.title || "",
    abstract: referenceInfo.abstract || "",
    keywords: (paperInfo.tags || []).filter(Boolean),
  });
  const sameList = (a, b) =>
    (a || []).map((x) => String(x).toLowerCase()).join("|") ===
    (b || []).map((x) => String(x).toLowerCase()).join("|");

  const suggestKeywords = () => {
    setAiBusy("keywords");
    setAiError("");
    setAiApplied("");
    setKwResult(null);
    axios
      .post("/api/curation/suggest-figure-keywords", {
        consent: aiConsent,
        paper: paperForAi(),
        figures: charts.map(({ id, number, caption }) => ({ id, number, caption })),
      })
      .then((res) => {
        const data = res.data || {};
        setKwResult(data);
        const skip = {};
        (data.figures || []).forEach(({ id }) => {
          const record = charts.find((chart) => chart.id === id);
          const current = (record && record.properties) || [];
          // Keywords the curator wrote are kept unless they opt in; the
          // paper-tag defaults from the import are replaced.
          if (current.length && !sameList(current, paperTags)) skip[id] = true;
        });
        setKwSkip(skip);
      })
      .catch((err) => setAiError(aiErrorFrom(err)))
      .finally(() => setAiBusy(""));
  };

  const applyKeywords = () => {
    let count = 0;
    ((kwResult && kwResult.figures) || []).forEach(({ id, keywords }) => {
      if (kwSkip[id]) return;
      const record = charts.find((chart) => chart.id === id);
      if (!record) return;
      edit("chart", { ...record, properties: keywords });
      count += 1;
    });
    const paperKeywords = (kwResult && kwResult.paper_keywords) || [];
    let paperNote = "";
    if (!kwSkip.__paper && paperKeywords.length && !paperTags.length) {
      const current = collectDraftState();
      apply({ paperInfo: { ...current.paperInfo, tags: paperKeywords } });
      paperNote = " and the paper's keywords";
    }
    setAiApplied(`Updated keywords on ${plural(count, "figure", "figures")}${paperNote}.`);
    setKwResult(null);
  };

  const suggestLinks = () => {
    setAiBusy("links");
    setAiError("");
    setAiApplied("");
    setLinkResult(null);
    const name = (record) =>
      String((record.files || [])[0] || record.id).split("/").filter(Boolean).pop();
    axios
      .post("/api/curation/suggest-links", {
        consent: aiConsent,
        path: fileServerPath,
        paper: paperForAi(),
        figures: charts.map(({ id, number, caption }) => ({ id, number, caption })),
        scripts: scripts.map((record) => ({ id: record.id, files: record.files || [], description: record.readme || "" })),
        datasets: datasets.map((record) => ({ id: record.id, name: name(record), files: record.files || [] })),
        existing_links: ((metadata.workflow || {}).edges || [])
          .map((edge) => (Array.isArray(edge) ? { from: edge[0], to: edge[1] } : { from: edge.from, to: edge.to })),
      })
      .then((res) => {
        const data = res.data || {};
        setLinkResult(data);
        const skip = {};
        (data.links || []).forEach((link) => {
          if (link.confidence === "low") skip[`${link.from}>${link.to}`] = true;
        });
        setLinkSkip(skip);
      })
      .catch((err) => setAiError(aiErrorFrom(err)))
      .finally(() => setAiBusy(""));
  };

  const applyLinks = () => {
    const chosen = ((linkResult && linkResult.links) || []).filter(
      (link) => !linkSkip[`${link.from}>${link.to}`]
    );
    importBundle([], chosen.map(({ from, to, type }) => ({ from, to, type })));
    setAiApplied(`Added ${plural(chosen.length, "link", "links")}.`);
    setLinkResult(null);
  };

  const recordLabel = (id) => {
    const lists = { c: charts, s: scripts, d: datasets, t: tools };
    const record = (lists[id[0]] || []).find((item) => item.id === id);
    if (!record) return id;
    if (id[0] === "c") {
      const file = String(record.imageFile || id).split("/").filter(Boolean).pop();
      return record.number ? `${file} (${/^Table/.test(record.number) ? record.number : `Figure ${record.number}`})` : file;
    }
    return String((record.files || [])[0] || record.packageName || id).split("/").filter(Boolean).pop();
  };
  const figuresWithoutKeywords = charts.filter((chart) => !(chart.properties || []).length).length;

  // 7. Finish ----------------------------------------------------------------
  const needing = recordsNeedingDetails(metadata);
  const missingPI = !(
    paperInfo.PIs && String(paperInfo.PIs).trim() &&
    (!Array.isArray(paperInfo.PIs) || paperInfo.PIs.length)
  );
  const missingOptional = [
    !(paperInfo.collections && paperInfo.collections.length) && "collections",
    !(paperInfo.tags && paperInfo.tags.length) && "keywords",
  ].filter(Boolean);
  // Collections and keywords may publish empty; a P.I. may not.
  const [skipOptional, setSkipOptional] = useState(false);
  const paperMissing = [
    missingPI && "principal investigator",
    ...(skipOptional ? [] : missingOptional),
  ].filter(Boolean);
  const lastAuthor = String(referenceInfo.authors || "")
    .split(",")
    .map((name) => name.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .pop();
  const applyLastAuthorAsPI = () => {
    const current = collectDraftState();
    apply({ paperInfo: { ...current.paperInfo, PIs: lastAuthor } });
  };

  // ---- status ----
  const steps = {
    you: curatorIsComplete(curatorInfo),
    paper: Boolean(referenceInfo.title),
    folder: Boolean(fileServerPath),
    import: artifactCount > 0,
    captions: charts.length > 0 && uncaptioned === 0,
    ai: charts.length > 0 && figuresWithoutKeywords === 0,
    finish: artifactCount > 0 && needing.length === 0 && paperMissing.length === 0,
  };
  const done = Object.values(steps).filter(Boolean).length;
  const STEP_KEYS = ["you", "paper", "folder", "import", "captions", "ai", "finish"];
  const firstOpen = STEP_KEYS.findIndex((k) => !steps[k]);

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
          <Typography variant="caption" color="text.secondary">{`${done} of ${STEP_KEYS.length} done`}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Qresp fills in what it can from your profile, the paper's DOI and its
          project folder. You review it and add what only you know.
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(done / STEP_KEYS.length) * 100}
          sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: "rgba(128,0,0,0.08)" }}
        />
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stepper orientation="vertical" nonLinear activeStep={firstOpen === -1 ? STEP_KEYS.length : firstOpen}>
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
              {fileServerPath && !editingFolder ? (
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
                    <Button size="small" onClick={startEditingFolder} sx={{ textTransform: "none" }}>
                      Change
                    </Button>
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
              ) : locating && !editingFolder ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Looking for the paper's folder on the research computing server…
                  </Typography>
                </Box>
              ) : null}

              {showFolderEditor && (
                <Box>
                  {!editingFolder && locateResult && !locateResult.found && !locateResult.error && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      No folder named after this DOI was found. Paste its address or browse for it.
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={serverOptions}
                      getOptionLabel={(option) => (typeof option === "string" ? option : option.label || option.value)}
                      value={serverOptions.find((server) => server.value === serverRoot) || serverRoot || null}
                      onChange={(_event, value) =>
                        setServerRoot(typeof value === "string" ? value : value ? value.value : "")
                      }
                      onInputChange={(_event, value, reason) => {
                        if (reason === "input") setServerRoot(value);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="File server" placeholder="https://notebook.rcc.uchicago.edu/files" />
                      )}
                      sx={{ flex: "1 1 320px" }}
                    />
                    <Button
                      variant="contained"
                      disableElevation
                      onClick={browseFolders}
                      disabled={browsing || !String(serverRoot || "").trim()}
                      startIcon={browsing ? <CircularProgress size={16} color="inherit" /> : <FolderOpen />}
                      sx={{ textTransform: "none", minHeight: 40 }}
                    >
                      Browse…
                    </Button>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap", mt: 1.5 }}>
                    <TextField
                      size="small"
                      label="Or paste the folder address"
                      placeholder={`${(serverRoot || "https://notebook.rcc.uchicago.edu/files").replace(/\/+$/, "")}/your-paper-folder`}
                      value={folderInput}
                      onChange={(e) => {
                        setFolderInput(e.target.value);
                        setFolderError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitFolder(folderInput);
                        }
                      }}
                      sx={{ flex: "1 1 320px" }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => commitFolder(folderInput)}
                      disabled={!folderInput.trim()}
                      sx={{ textTransform: "none", minHeight: 40 }}
                    >
                      Use this folder
                    </Button>
                    {editingFolder && (
                      <Button
                        onClick={() => {
                          setEditingFolder(false);
                          setPendingFolder(null);
                          setFolderError("");
                        }}
                        sx={{ textTransform: "none", minHeight: 40 }}
                      >
                        Cancel
                      </Button>
                    )}
                  </Box>
                  {folderError && <Alert severity="warning" sx={{ mt: 1 }}>{folderError}</Alert>}
                  {pendingFolder && (
                    <Alert
                      severity="warning"
                      sx={{ mt: 1 }}
                      action={
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Button size="small" onClick={() => setPendingFolder(null)}>
                            Keep current
                          </Button>
                          <Button
                            size="small"
                            color="warning"
                            onClick={() => commitFolder(pendingFolder, { force: true })}
                          >
                            Change anyway
                          </Button>
                        </Box>
                      }
                    >
                      {`This record already has ${plural(charts.length, "figure", "figures")}. Their paths are relative to the folder, so changing it can break their images.`}
                    </Alert>
                  )}
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
                    Zenodo record?{" "}
                    <SectionLink target="curate-fileserver">Use the full form</SectionLink>
                  </Typography>
                </Box>
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

          {/* 5. Captions */}
          <Step completed={steps.captions} expanded>
            {stepLabel("captions", "Figure captions", "Copied from the paper's LaTeX source")}
            <StepContent>
              {!charts.length ? (
                <Typography variant="body2" color="text.secondary">
                  Available once figures are in the record.
                </Typography>
              ) : !authenticated ? (
                <Typography variant="body2" color="text.secondary">
                  Sign in to read captions from the paper's source.
                </Typography>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Your paper's LaTeX already contains every figure's caption.
                    Point Qresp at the source and it copies each{" "}
                    <Box component="code" sx={{ fontSize: "0.85em" }}>\caption{"{…}"}</Box>{" "}
                    onto the matching figure: the paper's exact words, no AI,
                    and nothing is stored.
                  </Typography>

                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={srcMode}
                    onChange={(_event, value) => value && setSrcMode(value)}
                    sx={{ mb: 1.5, flexWrap: "wrap" }}
                  >
                    <ToggleButton value="arxiv" sx={{ textTransform: "none" }}>arXiv</ToggleButton>
                    <ToggleButton value="upload" sx={{ textTransform: "none" }}>Upload .tex / .zip</ToggleButton>
                    <ToggleButton value="overleaf" sx={{ textTransform: "none" }}>Overleaf</ToggleButton>
                  </ToggleButtonGroup>

                  {srcMode === "arxiv" && (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <TextField
                        size="small"
                        label="arXiv ID or link"
                        placeholder="2409.00246 or https://arxiv.org/abs/2409.00246"
                        value={arxivInput}
                        onChange={(e) => setArxivInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && arxivInput.trim()) {
                            e.preventDefault();
                            runLatex({ arxiv: arxivInput.trim() });
                          }
                        }}
                        sx={{ flex: "1 1 280px" }}
                        disabled={latexBusy}
                      />
                      <Button
                        variant="contained"
                        disableElevation
                        onClick={() => runLatex({ arxiv: arxivInput.trim() })}
                        disabled={latexBusy || !arxivInput.trim()}
                        startIcon={latexBusy ? <CircularProgress size={16} color="inherit" /> : <Description />}
                        sx={{ textTransform: "none", minHeight: 40 }}
                      >
                        Get captions
                      </Button>
                    </Box>
                  )}

                  {(srcMode === "upload" || srcMode === "overleaf") && (
                    <Box>
                      {srcMode === "overleaf" && (
                        <Box component="ol" sx={{ m: 0, mb: 1.5, pl: 2.5, color: "text.secondary", typography: "body2" }}>
                          <li>Open the project in Overleaf.</li>
                          <li>Choose <strong>Menu → Download → Source</strong> to get a .zip.</li>
                          <li>Upload that .zip below.</li>
                        </Box>
                      )}
                      <Button
                        variant="contained"
                        disableElevation
                        component="label"
                        disabled={latexBusy}
                        startIcon={latexBusy ? <CircularProgress size={16} color="inherit" /> : <Description />}
                        sx={{ textTransform: "none" }}
                      >
                        {srcMode === "overleaf" ? "Upload the Overleaf .zip" : "Choose a file…"}
                        <input
                          hidden
                          type="file"
                          accept=".tex,.ltx,.zip,.tar,.gz,.tgz"
                          onChange={onLatexFile}
                          data-testid="latex-file"
                        />
                      </Button>
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
                        {srcMode === "overleaf"
                          ? "Overleaf projects are private, so Qresp cannot read them from a link."
                          : "A single .tex file, or a .zip / .tar.gz of the whole project (up to 10 MB; the images are not needed)."}
                      </Typography>
                    </Box>
                  )}

                  {latexError && <Alert severity="warning" sx={{ mt: 1.5 }}>{latexError}</Alert>}

                  {captionsApplied !== null && !latexResult && (
                    <Alert severity="success" sx={{ mt: 1.5 }}>
                      {captionsApplied
                        ? `Added ${plural(captionsApplied, "caption", "captions")}.`
                        : "No captions were changed."}
                      {uncaptioned ? ` ${plural(uncaptioned, "figure still needs", "figures still need")} a caption.` : ""}
                    </Alert>
                  )}

                  {latexResult && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {`Read ${latexResult.source} · ${plural((latexResult.figures || []).length, "figure or table", "figures and tables")} found · `}
                        <strong>{`${plural((latexResult.matches || []).length, "matches a figure", "match figures")} in this record`}</strong>
                      </Typography>
                      {captionMatches.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {(latexResult.matches || []).length
                            ? "Those captions are already on their figures."
                            : "None of them could be matched to this record's figures by file name or figure number."}
                        </Typography>
                      ) : (
                        <Box>
                          <Box sx={{ maxHeight: 340, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                            {captionMatches.map((match) => {
                              const record = charts.find((chart) => chart.id === match.id);
                              const replaces = record && String(record.caption || "").trim();
                              return (
                                <Box
                                  key={match.id}
                                  sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}
                                >
                                  <Checkbox
                                    size="small"
                                    checked={!captionSkip[match.id]}
                                    onChange={(e) => setCaptionSkip((x) => ({ ...x, [match.id]: !e.target.checked }))}
                                    slotProps={{ input: { "aria-label": `Caption for ${chartFileName(match.id)}` } }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                                      {`${chartFileName(match.id)} · ${/^Table/.test(match.number) ? match.number : `Figure ${match.number}`}`}
                                      <Typography component="span" variant="caption" color="text.secondary">
                                        {match.how === "file" ? "  · matched by file name" : "  · matched by number"}
                                      </Typography>
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                                    >
                                      {match.caption}
                                    </Typography>
                                    {replaces && (
                                      <Typography variant="caption" color="warning.main" component="div">
                                        Replaces the caption already on this figure.
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                          <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                            <Button
                              variant="contained"
                              disableElevation
                              onClick={applyCaptions}
                              disabled={!captionChosen.length}
                              sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                              {`Apply ${plural(captionChosen.length, "caption", "captions")}`}
                            </Button>
                            <Button onClick={() => setLatexResult(null)} sx={{ textTransform: "none" }}>
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </StepContent>
          </Step>

          {/* 6. AI assistant */}
          <Step completed={steps.ai} expanded>
            {stepLabel("ai", "AI assistant (optional)", "Keywords, and links Qresp could not find on its own")}
            <StepContent>
              {!charts.length ? (
                <Typography variant="body2" color="text.secondary">
                  Available once figures are in the record.
                </Typography>
              ) : !authenticated ? (
                <Typography variant="body2" color="text.secondary">
                  Sign in to use the AI assistant.
                </Typography>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Qresp has already matched everything it can from file names,
                    folders and the paper's LaTeX. The AI assistant fills the
                    gaps: keywords for each figure, and which scripts and data
                    produced which figures. Every suggestion comes with a reason
                    and nothing is applied until you choose it.
                  </Typography>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={aiConsent} onChange={(e) => setAiConsent(e.target.checked)} />}
                    label={
                      <Typography variant="body2">
                        Send the paper's title, abstract and figure captions, and the
                        start of each script in the project folder, to Google Gemini.
                        Nothing is stored.
                      </Typography>
                    }
                    sx={{ alignItems: "flex-start", mb: 1, "& .MuiCheckbox-root": { pt: 0.25 } }}
                  />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant="contained"
                      disableElevation
                      onClick={suggestKeywords}
                      disabled={!aiConsent || Boolean(aiBusy) || !charts.some((chart) => String(chart.caption || "").trim())}
                      startIcon={aiBusy === "keywords" ? <CircularProgress size={16} color="inherit" /> : <Psychology />}
                      sx={{ textTransform: "none" }}
                    >
                      Suggest keywords
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={suggestLinks}
                      disabled={!aiConsent || Boolean(aiBusy) || !(scripts.length || datasets.length)}
                      startIcon={aiBusy === "links" ? <CircularProgress size={16} /> : <Psychology />}
                      sx={{ textTransform: "none" }}
                    >
                      Suggest missing links
                    </Button>
                  </Box>
                  {!charts.some((chart) => String(chart.caption || "").trim()) && (
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
                      Keywords are suggested from captions, so add the captions first.
                    </Typography>
                  )}

                  {aiError && <Alert severity="warning" sx={{ mt: 1.5 }}>{aiError}</Alert>}
                  {aiApplied && <Alert severity="success" sx={{ mt: 1.5 }}>{aiApplied}</Alert>}

                  {kwResult && (
                    <Box sx={{ mt: 1.5 }}>
                      {kwResult.incomplete && (
                        <Alert severity="info" sx={{ mb: 1 }}>
                          {`The AI service was busy for part of the request, so only ${plural((kwResult.figures || []).length, "figure has", "figures have")} suggestions. Apply these, then run Suggest keywords again for the rest.`}
                        </Alert>
                      )}
                      <Box sx={{ maxHeight: 340, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                        {(kwResult.paper_keywords || []).length > 0 && !paperTags.length && (
                          <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
                            <Checkbox
                              size="small"
                              checked={!kwSkip.__paper}
                              onChange={(e) => setKwSkip((x) => ({ ...x, __paper: !e.target.checked }))}
                              slotProps={{ input: { "aria-label": "Paper keywords" } }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>The paper</Typography>
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.25 }}>
                                {kwResult.paper_keywords.map((k) => <Chip key={k} size="small" label={k} />)}
                              </Box>
                            </Box>
                          </Box>
                        )}
                        {(kwResult.figures || []).map(({ id, keywords }) => {
                          const record = charts.find((chart) => chart.id === id) || {};
                          const current = record.properties || [];
                          return (
                            <Box key={id} sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                              <Checkbox
                                size="small"
                                checked={!kwSkip[id]}
                                onChange={(e) => setKwSkip((x) => ({ ...x, [id]: !e.target.checked }))}
                                slotProps={{ input: { "aria-label": `Keywords for ${recordLabel(id)}` } }}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{recordLabel(id)}</Typography>
                                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.25 }}>
                                  {keywords.map((k) => <Chip key={k} size="small" color="primary" variant="outlined" label={k} />)}
                                </Box>
                                {current.length > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    {`Replaces: ${current.join(", ")}`}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                      <ModelNote models={kwResult.models} />
                      <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                        <Button variant="contained" disableElevation onClick={applyKeywords} sx={{ textTransform: "none", fontWeight: 600 }}>
                          Apply selected keywords
                        </Button>
                        <Button onClick={() => setKwResult(null)} sx={{ textTransform: "none" }}>Cancel</Button>
                      </Box>
                    </Box>
                  )}

                  {linkResult && (
                    <Box sx={{ mt: 1.5 }}>
                      {(linkResult.links || []).length === 0 ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            The AI found no further links it could support with evidence.
                          </Typography>
                          <ModelNote models={linkResult.models} />
                        </Box>
                      ) : (
                        <Box>
                          <Box sx={{ maxHeight: 340, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                            {linkResult.links.map((link) => {
                              const key = `${link.from}>${link.to}`;
                              return (
                                <Box key={key} sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                                  <Checkbox
                                    size="small"
                                    checked={!linkSkip[key]}
                                    onChange={(e) => setLinkSkip((x) => ({ ...x, [key]: !e.target.checked }))}
                                    slotProps={{ input: { "aria-label": `${recordLabel(link.from)} to ${recordLabel(link.to)}` } }}
                                  />
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                      {`${recordLabel(link.from)} ${link.type === "generates" ? "generates" : "supplies"} ${recordLabel(link.to)}`}
                                      <Chip
                                        size="small"
                                        label={link.confidence}
                                        color={link.confidence === "high" ? "success" : link.confidence === "medium" ? "default" : "warning"}
                                        variant="outlined"
                                        sx={{ ml: 1, height: 18 }}
                                      />
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">{link.reason}</Typography>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                          <ModelNote models={linkResult.models} />
                          <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                            <Button variant="contained" disableElevation onClick={applyLinks} sx={{ textTransform: "none", fontWeight: 600 }}>
                              Add selected links
                            </Button>
                            <Button onClick={() => setLinkResult(null)} sx={{ textTransform: "none" }}>Cancel</Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </StepContent>
          </Step>

          {/* 7. Finish */}
          <Step completed={steps.finish} expanded>
            {stepLabel("finish", "Finish the details", "Captions and anything only you know")}
            <StepContent>
              {!artifactCount ? (
                <Typography variant="body2" color="text.secondary">
                  Available once figures are in the record.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {missingPI && (
                    <Alert
                      severity="warning"
                      action={
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {lastAuthor && (
                            <Button size="small" onClick={applyLastAuthorAsPI} sx={{ textTransform: "none" }}>
                              {`Use last author: ${lastAuthor}`}
                            </Button>
                          )}
                          <SectionLink target="curate-paperinfo">Open</SectionLink>
                        </Box>
                      }
                    >
                      A principal investigator is required to publish.
                    </Alert>
                  )}
                  {missingOptional.length > 0 && !skipOptional && (
                    <Alert
                      severity="info"
                      action={
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Button size="small" onClick={() => setSkipOptional(true)} sx={{ textTransform: "none" }}>
                            Skip, leave blank
                          </Button>
                          <SectionLink target="curate-paperinfo">Open</SectionLink>
                        </Box>
                      }
                    >
                      {`Optional paper details are empty: ${missingOptional.join(" and ")}. They help readers find the paper, but you can publish without them.`}
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
