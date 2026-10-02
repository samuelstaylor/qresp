import { Fragment, useContext } from "react";
import Link from "next/link";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import { Article, EditNote, Favorite, Logout } from "@mui/icons-material";

import SEO from "../components/seo";
import AccountLayout from "../components/Account/AccountLayout";
import AuthContext from "../Context/Auth/authContext";


const StatCard = ({ icon, label, value, href }) => (
  <Paper
    variant="outlined"
    component={href ? Link : "div"}
    href={href}
    sx={{
      p: 2.5,
      borderRadius: 3,
      display: "flex",
      alignItems: "center",
      gap: 2,
      textDecoration: "none",
      color: "inherit",
      transition: "box-shadow 0.18s, border-color 0.18s",
      ...(href
        ? {
            "&:hover": {
              boxShadow: 3,
              borderColor: "#800000",
            },
          }
        : {}),
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        bgcolor: "rgba(128,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#800000",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h6" fontWeight={700} lineHeight={1.1}>
        {value ?? "—"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  </Paper>
);

const providerLabel = (p) =>
  p === "google" ? "Google" : p === "microsoft" ? "Microsoft" : p === "github" ? "GitHub" : p || "unknown";

const AccountPage = () => {
  const { loading, authenticated, user, logout } = useContext(AuthContext);

  let content;

  if (loading) {
    content = (
      <Typography color="text.secondary" sx={{ mt: 4 }}>
        Checking sign-in…
      </Typography>
    );
  } else if (!authenticated) {
    content = (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, maxWidth: 440 }}>
        <Typography variant="h6" gutterBottom>
          Sign in to view your account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use &ldquo;Sign in&rdquo; in the header to access your profile,
          published records, favorites and drafts.
        </Typography>
      </Paper>
    );
  } else {
    const initials = (user.name || user.email || "?")
      .split(/\s+/)
      .map((w) => w[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase();

    content = (
      <Fragment>
        {/* ── Identity card ─────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 2.5 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: "#800000",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" fontWeight={700}>
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
        <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Quick access
        </Typography>
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<Article />}
              label="Published records"
              value={null}
              href="/account/records"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<Favorite />}
              label="Favorites"
              value={null}
              href="/account/favorites"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<EditNote />}
              label="Drafts"
              value={null}
              href="/account/drafts"
            />
          </Grid>
        </Grid>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <SEO
        title="Qresp | Profile"
        description="Your Qresp account profile"
        author="Qresp Team"
      />
      <AccountLayout pageTitle="Profile">{content}</AccountLayout>
    </Fragment>
  );
};

export default AccountPage;
