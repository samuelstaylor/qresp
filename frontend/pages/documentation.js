import { Fragment } from "react";

import NextLink from "next/link";
import {
  Box,
  Container,
  Divider,
  Link as MuiLink,
  Typography,
} from "@mui/material";

import SEO from "../components/seo";

// Qresp documentation, in the app.
//
// The reference documentation lives at qresp.org and still does — it is linked
// below. What belongs HERE is the part a curator needs while they are
// curating: how to lay a project out before pointing Qresp at it.
//
// There is exactly ONE folder layout on this site, and it is the Qresp Folder
// Standard v1 at /documentation/folder-standard. This page used to carry a
// second, general research-package template as well (project/, data/raw/,
// data/processed/, figures/) with its own copy button. Two copyable structures
// side by side asked a reader to pick, and the one they were most likely to
// pick was the one on this page — which the RCC analyzer does not read. It is
// gone rather than relabelled: a caveat under a copy button is not a match for
// the button.
//
// Legacy folder names (data, Figures_Tables, Plot_Scripts, doc) are still
// recognized by the analyzer exactly as before. Removing a suggestion from the
// documentation changes nothing about what Qresp can READ — that is the whole
// reason it was safe to remove.

const DOCUMENTATION_SITE = "https://qresp.org";
const FOLDER_STANDARD_PATH = "/documentation/folder-standard";

// Shown once, so `rel="noopener noreferrer"` and the new-tab note cannot be
// forgotten. `noopener` denies the opened page a handle on this one;
// `noreferrer` keeps the referring URL out of the request.
const ExternalLink = ({ href, children }) => (
  <MuiLink href={href} target="_blank" rel="noopener noreferrer" underline="hover">
    {children}
    <Box
      component="span"
      sx={{
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
      }}
    >
      {" (opens in a new tab)"}
    </Box>
  </MuiLink>
);

const Documentation = () => (
  <Fragment>
    <SEO
      title="Qresp | Documentation"
      description="How to organize a research project before curating it with Qresp, following the Qresp Folder Standard v1."
    />

    <Container maxWidth="md">
      <Box sx={{ my: 6 }}>

        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
          Documentation
        </Typography>

        {/* Intro callout */}
        <Box
          sx={{
            borderLeft: "4px solid #800000",
            pl: 3,
            py: 1.5,
            mb: 5,
            backgroundColor: "rgba(128,0,0,0.04)",
            borderRadius: "0 8px 8px 0",
          }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            The full Qresp reference documentation is at{" "}
            <ExternalLink href={DOCUMENTATION_SITE}>qresp.org</ExternalLink>. This
            page covers the part that comes first: how to lay a project out
            before you curate it.
          </Typography>
        </Box>

        {/* Section heading */}
        <Typography
          variant="h5"
          component="h2"
          sx={{ fontWeight: 700, color: "#800000", mb: 1 }}
        >
          Organizing a research project
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.75 }}>
          Qresp curates whatever structure you already have, and never renames
          anything on your file server. But there is one layout it{" "}
          <strong>reads</strong>: the Qresp Folder Standard v1. A folder that
          follows it is proposed as charts, datasets, scripts, and tools
          automatically, instead of being left for you to sort out by hand.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 5, lineHeight: 1.75 }}>
          It is the recommended contract for accurate automatic analysis, not a
          rule about where your files may live. Existing folders — including
          ones using older names such as <code>data</code>,{" "}
          <code>Figures_Tables</code>, or <code>Plot_Scripts</code> — keep
          working exactly as they do today.
        </Typography>

        {/* Folder Standard callout — upgraded */}
        <Box
          sx={{ border: "2px solid #800000", borderRadius: 2, overflow: "hidden" }}
          data-testid="folder-standard-callout"
        >
          <Box sx={{ backgroundColor: "#800000", px: 3, py: 2 }}>
            <Typography variant="h6" component="h3" sx={{ color: "white", fontWeight: 700 }}>
              Qresp Folder Standard v1
            </Typography>
          </Box>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
              The full standard — the canonical folder tree, what each
              sub-folder means to the analyzer, and a copyable version of the
              structure you can drop into any project.
            </Typography>
            <MuiLink
              component={NextLink}
              href={FOLDER_STANDARD_PATH}
              underline="hover"
              data-testid="folder-standard-link"
              sx={{ color: "#800000", fontWeight: 600, fontSize: "0.95rem" }}
            >
              Read the Qresp Folder Standard v1 →
            </MuiLink>
          </Box>
        </Box>

      </Box>
    </Container>
  </Fragment>
);

export { DOCUMENTATION_SITE, FOLDER_STANDARD_PATH };
export default Documentation;
