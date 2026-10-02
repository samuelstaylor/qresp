import { Fragment, useContext } from "react";
import Link from "next/link";
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
  Typography,
} from "@mui/material";
import { AccountCircle, Article, Bookmark, EditNote, Logout } from "@mui/icons-material";

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
  const { loading, authenticated, user, logout } = useContext(AuthContext);

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
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  {user.name || user.email}
                </Typography>
                {user.is_admin && (
                  <Chip label="Admin" size="small" color="primary" />
                )}
              </Box>
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
