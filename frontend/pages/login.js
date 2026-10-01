import { useContext, useEffect } from "react";

import { Box, Container, Paper, Typography } from "@mui/material";
import { useRouter } from "next/router";

import SEO from "../components/seo";
import { RegularStyledButton } from "../components/button";
import AuthContext from "../Context/Auth/authContext";
import safeNext, { providerHref } from "../Utils/safeNext";

// The single public sign-in page. Two providers, nothing else: no dev-login,
// no provider configuration, no error internals. Each button is a plain
// full-page navigation into the existing backend flow, which redirects to the
// provider and back to the validated same-origin `next`.

const LoginPage = () => {
  const router = useRouter();
  const { loading, authenticated } = useContext(AuthContext);

  // An empty fallback distinguishes "no next was asked for" from "next is /".
  const requested = safeNext(router && router.query && router.query.next, "");
  const next = requested || "/";

  // Already signed in? Nothing to choose — go where they were headed, or to
  // their account when they arrived here directly.
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

  return (
    <Container maxWidth="sm">
      <SEO title="Sign in" />
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
            <svg
              viewBox="0 0 350 105"
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
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.75)", fontStyle: "italic", letterSpacing: "0.03em" }}
            >
              Curation and Exploration of Reproducible Scientific Papers
            </Typography>
          </Box>

          {/* Sign-in options */}
          <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: "#800000", mb: 0.5 }}>
              Sign in to continue
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
              Signing in lets you curate and publish records, save drafts, and
              edit the records you own.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <RegularStyledButton fullWidth component="a" href={providerHref("microsoft", next)}>
                  Continue with Microsoft
                </RegularStyledButton>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                  Work or school account — most institutions issue one.
                </Typography>
              </Box>

              <Box>
                <RegularStyledButton fullWidth component="a" href={providerHref("google", next)}>
                  Continue with Google
                </RegularStyledButton>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                  Personal or institutional Google account.
                </Typography>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 4, lineHeight: 1.6 }}>
              Qresp receives only your name and email address, used solely to
              attribute the records you publish.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
