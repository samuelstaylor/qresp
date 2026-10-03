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
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AccountCircle, Article, Bookmark, Check, Close, Edit, EditNote, Logout } from "@mui/icons-material";

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
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");

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

  const startEditName = () => {
    setNameValue(user.name || "");
    setNameError("");
    setEditingName(true);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameError("");
  };

  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) { setNameError("Name cannot be empty."); return; }
    if (trimmed.length > 200) { setNameError("Name is too long."); return; }
    setNameSaving(true);
    setNameError("");
    try {
      await axios.patch("/api/auth/profile", { name: trimmed });
      await refresh();
      setEditingName(false);
    } catch (err) {
      setNameError(
        (err.response && err.response.data && err.response.data.error) ||
        "Failed to save. Please try again."
      );
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <Fragment>
      <SEO title="Qresp | Profile" />
      <AccountLayout pageTitle="Profile">
        {/* ── Identity card ─────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 2.5 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "#800000",
                fontSize: "1.75rem",
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <TextField
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") cancelEditName();
                  }}
                  size="small"
                  autoFocus
                  fullWidth
                  error={Boolean(nameError)}
                  helperText={nameError || " "}
                  disabled={nameSaving}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Save">
                          <span>
                            <IconButton size="small" onClick={saveName} disabled={nameSaving}>
                              <Check fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton size="small" onClick={cancelEditName} disabled={nameSaving}>
                            <Close fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 0.5 }}
                />
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {user.name || user.email}
                  </Typography>
                  {user.is_admin && (
                    <Chip label="Admin" size="small" color="primary" />
                  )}
                  <Tooltip title="Edit name">
                    <IconButton size="small" onClick={startEditName} sx={{ color: "text.secondary" }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Signed in with {providerLabel(user.provider)}
              </Typography>
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
