import { Fragment, useContext, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AccountCircle, Article, Bookmark, Edit, EditNote, Logout } from "@mui/icons-material";

import SEO from "../components/seo";
import AccountLayout from "../components/Account/AccountLayout";
import AuthContext from "../Context/Auth/authContext";

const providerLabel = (p) =>
  p === "google"
    ? "Google"
    : p === "microsoft"
    ? "Microsoft"
    : p === "github"
    ? "GitHub"
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
        "&:hover": {
          borderColor: "#800000",
        },
      }}
    >
      <Box sx={{ color: "#800000", mb: 0.5, lineHeight: 1 }}>
        {icon}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  </Link>
);

const AccountPage = () => {
  const { loading, authenticated, user, logout, refresh } = useContext(AuthContext);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [affiliationValue, setAffiliationValue] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

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
            <Link href="/login" style={{ color: "#800000" }}>
              Sign in
            </Link>
          </Typography>
        </AccountLayout>
      </Fragment>
    );
  }

  const initials = (user.name || user.email || "?")
    .split(/\s+/)
    .map((w) => w[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const startEditProfile = () => {
    setNameValue(user.name || "");
    setAffiliationValue(user.affiliation || "");
    setProfileError("");
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setProfileError("");
  };

  const saveProfile = async () => {
    const trimmedName = nameValue.trim();
    if (!trimmedName) { setProfileError("Name cannot be empty."); return; }
    if (trimmedName.length > 200) { setProfileError("Name is too long."); return; }
    const trimmedAffiliation = affiliationValue.trim();
    if (trimmedAffiliation.length > 300) { setProfileError("Affiliation is too long."); return; }
    setProfileSaving(true);
    setProfileError("");
    try {
      await axios.patch("/api/auth/profile", { name: trimmedName, affiliation: trimmedAffiliation });
      await refresh();
      setEditingProfile(false);
    } catch (err) {
      setProfileError(
        (err.response && err.response.data && err.response.data.error) ||
        "Failed to save. Please try again."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <Fragment>
      <SEO title="Qresp | Profile" />
      <AccountLayout pageTitle="Profile">
        {/* ── Identity card ─────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.5, mb: 2.5 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "#800000",
                fontSize: "1.75rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {editingProfile ? (
                <Box>
                  <TextField
                    label="Name"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") cancelEditProfile(); }}
                    size="small"
                    autoFocus
                    fullWidth
                    required
                    disabled={profileSaving}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    label="Affiliation (optional)"
                    value={affiliationValue}
                    onChange={(e) => setAffiliationValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") cancelEditProfile(); }}
                    size="small"
                    fullWidth
                    disabled={profileSaving}
                    placeholder="e.g. Dept. of Physics, University of Chicago"
                    sx={{ mb: 1.5 }}
                  />
                  {profileError && (
                    <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                      {profileError}
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={saveProfile}
                      disabled={profileSaving}
                      sx={{ bgcolor: "#800000", "&:hover": { bgcolor: "#600000" } }}
                    >
                      {profileSaving ? "Saving…" : "Save"}
                    </Button>
                    <Button size="small" variant="outlined" onClick={cancelEditProfile} disabled={profileSaving}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h5" fontWeight={700}>
                      {user.name || user.email}
                    </Typography>
                    {user.is_admin && (
                      <Chip label="Admin" size="small" color="primary" />
                    )}
                  </Box>
                  {user.affiliation && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {user.affiliation}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {user.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Signed in with {providerLabel(user.provider)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Tooltip title="Edit profile">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit fontSize="small" />}
                        onClick={startEditProfile}
                        sx={{ textTransform: "none" }}
                      >
                        Edit profile
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Logout fontSize="small" />}
            onClick={logout}
          >
            Sign out
          </Button>
        </Paper>

        {/* ── Quick-access stat cards ────────────────────────────── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<Article sx={{ fontSize: 28 }} />}
              label="My Records"
              href="/account/records"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<Bookmark sx={{ fontSize: 28 }} />}
              label="Favorites"
              href="/account/favorites"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<EditNote sx={{ fontSize: 28 }} />}
              label="Drafts"
              href="/account/drafts"
            />
          </Grid>
        </Grid>
      </AccountLayout>
    </Fragment>
  );
};

export default AccountPage;
