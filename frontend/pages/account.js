import { Fragment, useContext, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Article, Bookmark, CameraAlt, Edit, EditNote, Language, Logout, School } from "@mui/icons-material";

import SEO from "../components/seo";
import AccountLayout from "../components/Account/AccountLayout";
import AuthContext from "../Context/Auth/authContext";

const providerLabel = (p) =>
  p === "google" ? "Google"
  : p === "microsoft" ? "Microsoft"
  : p === "github" ? "GitHub"
  : p || "unknown";

const StatCard = ({ icon, label, href }) => (
  <Link href={href} style={{ textDecoration: "none" }}>
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 0.18s",
        "&:hover": { borderColor: "#800000" },
      }}
    >
      <Box sx={{ color: "#800000", mb: 0.5, lineHeight: 1 }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
  </Link>
);

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

const AccountPage = () => {
  const { loading, authenticated, user, logout, refresh } = useContext(AuthContext);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [fields, setFields] = useState({});
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileRef = useRef(null);

  const initials = (user?.name || user?.email || "?")
    .split(/\s+/).map((w) => w[0] || "").slice(0, 2).join("").toUpperCase();

  const avatarSrc = avatarPreview || user?.avatar_b64 || "";

  const startEdit = () => {
    setFields({
      name: user.name || "",
      affiliation: user.affiliation || "",
      bio: user.bio || "",
      orcid_id: user.orcid_id || "",
      google_scholar_url: user.google_scholar_url || "",
      website_url: user.website_url || "",
    });
    setAvatarPreview("");
    setSaveError("");
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setSaveError(""); setAvatarPreview(""); };

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const onAvatarPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 512000) { setSaveError("Photo must be under 512 KB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const name = fields.name.trim();
    if (!name) { setSaveError("Name cannot be empty."); return; }

    const orcid = fields.orcid_id.trim();
    if (orcid && !ORCID_RE.test(orcid)) {
      setSaveError("ORCID iD must be in the format 0000-0000-0000-0000.");
      return;
    }

    const gScholar = fields.google_scholar_url.trim();
    const website = fields.website_url.trim();
    if (gScholar && !gScholar.startsWith("http")) { setSaveError("Google Scholar URL must start with http:// or https://"); return; }
    if (website && !website.startsWith("http")) { setSaveError("Website URL must start with http:// or https://"); return; }

    setSaving(true);
    setSaveError("");
    try {
      const body = {
        name,
        affiliation: fields.affiliation.trim(),
        bio: fields.bio.trim(),
        orcid_id: orcid,
        google_scholar_url: gScholar,
        website_url: website,
      };
      if (avatarPreview) body.avatar_b64 = avatarPreview;
      await axios.patch("/api/auth/profile", body);
      await refresh();
      setEditing(false);
      setAvatarPreview("");
    } catch (err) {
      setSaveError(
        (err.response && err.response.data && err.response.data.error) ||
        "Failed to save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Fragment>
        <SEO title="Qresp | Profile" />
        <AccountLayout pageTitle="Profile">
          <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
            <CircularProgress />
          </Box>
        </AccountLayout>
      </Fragment>
    );
  }

  if (!authenticated) {
    return (
      <Fragment>
        <SEO title="Qresp | Profile" />
        <AccountLayout pageTitle="Profile">
          <Typography color="text.secondary">
            Please sign in to view your account.{" "}
            <Link href="/login" style={{ color: "#800000" }}>Sign in</Link>
          </Typography>
        </AccountLayout>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <SEO title="Qresp | Profile" />
      <AccountLayout pageTitle="Profile">

        {/* ── Identity card ──────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.5, mb: 2.5 }}>

            {/* Avatar */}
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={editing ? (avatarPreview || avatarSrc) : avatarSrc}
                sx={{ width: 88, height: 88, bgcolor: "#800000", fontSize: "1.9rem", fontWeight: 700 }}
              >
                {initials}
              </Avatar>
              {editing && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={onAvatarPick}
                  />
                  <Tooltip title="Upload photo">
                    <Box
                      onClick={() => fileRef.current && fileRef.current.click()}
                      sx={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 26, height: 26, borderRadius: "50%",
                        bgcolor: "#800000", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", boxShadow: 2,
                        "&:hover": { bgcolor: "#600000" },
                      }}
                    >
                      <CameraAlt sx={{ fontSize: 14 }} />
                    </Box>
                  </Tooltip>
                </>
              )}
            </Box>

            {/* Info / form */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <Box>
                  <Grid container spacing={1.5}>
                    <Grid size={12}>
                      <TextField label="Name" value={fields.name} onChange={set("name")}
                        size="small" fullWidth required disabled={saving} autoFocus />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Affiliation (optional)" value={fields.affiliation} onChange={set("affiliation")}
                        size="small" fullWidth disabled={saving}
                        placeholder="e.g. Dept. of Physics, University of Chicago" />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Short bio (optional)" value={fields.bio} onChange={set("bio")}
                        size="small" fullWidth multiline minRows={2} maxRows={4} disabled={saving}
                        placeholder="A sentence or two about your research."
                        inputProps={{ maxLength: 500 }}
                        helperText={`${(fields.bio || "").length}/500`} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="ORCID iD (optional)" value={fields.orcid_id} onChange={set("orcid_id")}
                        size="small" fullWidth disabled={saving}
                        placeholder="0000-0000-0000-0000" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Personal website (optional)" value={fields.website_url} onChange={set("website_url")}
                        size="small" fullWidth disabled={saving}
                        placeholder="https://yoursite.edu" />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Google Scholar URL (optional)" value={fields.google_scholar_url} onChange={set("google_scholar_url")}
                        size="small" fullWidth disabled={saving}
                        placeholder="https://scholar.google.com/citations?user=..." />
                    </Grid>
                  </Grid>

                  {saveError && (
                    <Alert severity="error" sx={{ mt: 1.5 }}>{saveError}</Alert>
                  )}

                  <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <Button size="small" variant="contained" onClick={save} disabled={saving}
                      sx={{ bgcolor: "#800000", "&:hover": { bgcolor: "#600000" } }}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button size="small" variant="outlined" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="h5" fontWeight={700}>{user.name || user.email}</Typography>
                    {user.is_admin && <Chip label="Admin" size="small" color="primary" />}
                  </Box>

                  {user.affiliation && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {user.affiliation}
                    </Typography>
                  )}

                  {user.bio && (
                    <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 560, lineHeight: 1.55 }}>
                      {user.bio}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 0.75, alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    {user.orcid_id && (
                      <Tooltip title="ORCID iD">
                        <Typography component="a"
                          href={`https://orcid.org/${user.orcid_id}`}
                          target="_blank" rel="noopener noreferrer"
                          variant="caption"
                          sx={{ color: "#a6ce39", textDecoration: "none", display: "flex", alignItems: "center", gap: 0.4, "&:hover": { textDecoration: "underline" } }}>
                          <svg width="14" height="14" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="#a6ce39">
                            <path d="M128 0C57.4 0 0 57.4 0 128s57.4 128 128 128 128-57.4 128-128S198.6 0 128 0zm-21.8 194.3H85.5V98.4h20.7v95.9zM95.9 83.9c-6.6 0-12-5.4-12-12s5.4-12 12-12 12 5.4 12 12-5.4 12-12 12zm100.7 110.4h-20.7v-46.5c0-11.1-.2-25.3-15.4-25.3-15.4 0-17.8 12-17.8 24.5v47.3h-20.7V98.4h19.9v13.1h.3c2.8-5.2 9.5-10.7 19.5-10.7 20.9 0 24.7 13.7 24.7 31.6v61.9z"/>
                          </svg>
                          {user.orcid_id}
                        </Typography>
                      </Tooltip>
                    )}
                    {user.website_url && (
                      <Tooltip title="Personal website">
                        <Typography component="a" href={user.website_url} target="_blank" rel="noopener noreferrer"
                          variant="caption"
                          sx={{ color: "text.secondary", textDecoration: "none", display: "flex", alignItems: "center", gap: 0.4, "&:hover": { textDecoration: "underline" } }}>
                          <Language sx={{ fontSize: 13 }} />{new URL(user.website_url).hostname}
                        </Typography>
                      </Tooltip>
                    )}
                    {user.google_scholar_url && (
                      <Tooltip title="Google Scholar">
                        <Typography component="a" href={user.google_scholar_url} target="_blank" rel="noopener noreferrer"
                          variant="caption"
                          sx={{ color: "text.secondary", textDecoration: "none", display: "flex", alignItems: "center", gap: 0.4, "&:hover": { textDecoration: "underline" } }}>
                          <School sx={{ fontSize: 13 }} />Scholar
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Signed in with {providerLabel(user.provider)}
                  </Typography>

                  <Box sx={{ mt: 1.5 }}>
                    <Button size="small" variant="outlined" startIcon={<Edit fontSize="small" />}
                      onClick={startEdit} sx={{ textTransform: "none" }}>
                      Edit profile
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />
          <Button variant="outlined" color="error" size="small" startIcon={<Logout fontSize="small" />} onClick={logout}>
            Sign out
          </Button>
        </Paper>

        {/* ── Quick-access stat cards ────────────────────────────── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard icon={<Article sx={{ fontSize: 28 }} />} label="My Records" href="/account/records" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard icon={<Bookmark sx={{ fontSize: 28 }} />} label="Favorites" href="/account/favorites" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard icon={<EditNote sx={{ fontSize: 28 }} />} label="Drafts" href="/account/drafts" />
          </Grid>
        </Grid>

      </AccountLayout>
    </Fragment>
  );
};

export default AccountPage;
