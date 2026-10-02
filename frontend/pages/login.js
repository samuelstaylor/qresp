import { useContext, useEffect, useState } from "react";

import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/router";

import SEO from "../components/seo";
import { RegularStyledButton } from "../components/button";
import AuthContext from "../Context/Auth/authContext";
import safeNext, { providerHref } from "../Utils/safeNext";

const QrespLogo = () => (
  <svg
    viewBox="-20 0 350 105"
    width="150"
    height="45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Qresp"
    role="img"
    style={{ userSelect: "none" }}
  >
    <circle cx="40" cy="40" r="35" stroke="white" strokeWidth="8" />
    <path d="M 17 35 Q 21 18 38 17" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M 63 72 L 78 93" stroke="white" strokeWidth="10" strokeLinecap="round" fill="none" />
    <g transform="translate(92, 51) scale(1.262)">
      <rect x="-4" y="-23" width="8" height="7" rx="2" fill="none" stroke="white" strokeWidth="2.5" />
      <line x1="-5" y1="-16" x2="5" y2="-16" stroke="rgba(255,255,255,0.50)" strokeWidth="1.5" />
      <rect x="-4" y="-16" width="8" height="25" fill="none" stroke="white" strokeWidth="2.5" />
      <polygon points="-4,9 4,9 0,19" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
    <path d="M 97 31 C 104 22 113 22 120 31" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
    <text x="122" y="75" fontFamily="'Nunito', Arial, sans-serif" fontSize="104" fontWeight="200" fill="white">esp</text>
  </svg>
);

const LoginPage = () => {
  const router = useRouter();
  const { loading, authenticated, localLogin, register } = useContext(AuthContext);

  const requested = safeNext(router && router.query && router.query.next, "");
  const next = requested || "/";

  const [mode, setMode] = useState("signin"); // "signin" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && authenticated && router) {
      router.replace(
        requested && requested !== "/login" ? requested : "/account"
      );
    }
  }, [loading, authenticated, requested, router]);

  if (loading || authenticated) {
    return (
      <Container maxWidth="sm">
        <Typography variant="h6" color="secondary" sx={{ mt: 6 }}>
          {loading ? "Checking sign-in…" : "You are signed in — redirecting…"}
        </Typography>
      </Container>
    );
  }

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    setSubmitting(true);
    const result =
      mode === "signin"
        ? await localLogin(email, password)
        : await register(email, password, name);
    setSubmitting(false);

    if (result.ok) {
      router.replace(requested && requested !== "/login" ? requested : "/account");
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
  };

  const isRegister = mode === "register";

  return (
    <Container maxWidth="sm">
      <SEO title={isRegister ? "Create account" : "Sign in"} />
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
        }}
      >
        <Paper
          elevation={6}
          sx={{ width: "100%", maxWidth: 420, borderRadius: 3, overflow: "hidden" }}
        >
          {/* Branded maroon header */}
          <Box
            sx={{
              backgroundColor: "#800000",
              py: 4,
              px: 3,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <QrespLogo />
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.75)", fontStyle: "italic", letterSpacing: "0.03em" }}
            >
              Curation and Exploration of Reproducible Scientific Papers
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700, color: "#800000", mb: 2, textAlign: "center" }}>
              Sign in to Qresp
            </Typography>

            {/* Mode toggle */}
            <Box sx={{ display: "flex", borderRadius: 1, overflow: "hidden", mb: 3, border: "1px solid #800000" }}>
              <Box
                component="button"
                onClick={() => switchMode("signin")}
                sx={{
                  flex: 1,
                  py: 1,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  backgroundColor: mode === "signin" ? "#800000" : "transparent",
                  color: mode === "signin" ? "#fff" : "#800000",
                  transition: "background 0.15s",
                  "&:hover": { backgroundColor: mode === "signin" ? "#800000" : "rgba(128,0,0,0.08)" },
                }}
              >
                Sign in
              </Box>
              <Box
                component="button"
                onClick={() => switchMode("register")}
                sx={{
                  flex: 1,
                  py: 1,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  backgroundColor: mode === "register" ? "#800000" : "transparent",
                  color: mode === "register" ? "#fff" : "#800000",
                  transition: "background 0.15s",
                  "&:hover": { backgroundColor: mode === "register" ? "#800000" : "rgba(128,0,0,0.08)" },
                }}
              >
                Create account
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Email / password form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {isRegister && (
                <TextField
                  label="Name (optional)"
                  type="text"
                  fullWidth
                  size="small"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  sx={{ mb: 1.5 }}
                  autoComplete="name"
                />
              )}
              <TextField
                label="Email address"
                type="email"
                fullWidth
                required
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 1.5 }}
                autoComplete="email"
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                size="small"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: isRegister ? 1.5 : 2 }}
                autoComplete={isRegister ? "new-password" : "current-password"}
                helperText={isRegister ? "At least 8 characters" : undefined}
              />
              {isRegister && (
                <TextField
                  label="Confirm password"
                  type="password"
                  fullWidth
                  required
                  size="small"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={{ mb: 2 }}
                  autoComplete="new-password"
                />
              )}
              <RegularStyledButton
                type="submit"
                fullWidth
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {submitting
                  ? isRegister ? "Creating account…" : "Signing in…"
                  : isRegister ? "Create account with email" : "Sign in with email"}
              </RegularStyledButton>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">
                or continue with
              </Typography>
            </Divider>

            {/* OAuth providers */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box>
                <RegularStyledButton fullWidth component="a" href={providerHref("microsoft", next)}>
                  Continue with Microsoft
                </RegularStyledButton>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Use your work or school account — most institutions issue one.
                </Typography>
              </Box>
              <Box>
                <RegularStyledButton fullWidth component="a" href={providerHref("google", next)}>
                  Continue with Google
                </RegularStyledButton>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Personal or institutional Google account.
                </Typography>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3, lineHeight: 1.6 }}>
              Qresp receives only your name and email address, used solely to
              attribute the records you publish. All sign-in methods that share
              the same email address access the same account.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
