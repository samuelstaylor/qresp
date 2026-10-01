import { Fragment } from "react";
import { Global, css } from "@emotion/react";
import Link from "next/link";
import SEO from "../components/seo";
import Picture from "../components/picture";
import { Box, Typography, Container } from "@mui/material";

// @property must be top-level (cannot nest inside @media).
// --qr-x drives both the clip-path circle position and the glass overlay
// translateX — a single animatable value keeps them in perfect sync.
const btnStyles = css`
  @property --qr-x {
    syntax: "<length>";
    initial-value: -70px;
    inherits: true;
  }

  /* ── button row ─────────────────────────────────────────────────── */
  .qr-btns {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    justify-content: center;
    flex-wrap: wrap;
    padding: 0.25rem 1rem 2rem;
  }

  .qr-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    text-decoration: none;
    width: 270px;
    padding: 1.8rem 2rem 1.6rem;
    border-radius: 14px;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }

  .qr-btn:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.75);
    outline-offset: 3px;
  }

  .qr-btn:hover {
    transform: translateY(-5px);
  }

  .qr-btn-explorer {
    background: #8b0000;
    box-shadow: 0 4px 20px rgba(139, 0, 0, 0.55);
  }
  .qr-btn-explorer:hover {
    box-shadow: 0 14px 36px rgba(139, 0, 0, 0.65);
  }

  .qr-btn-curator {
    background: #1a1a2e;
    box-shadow: 0 4px 20px rgba(26, 26, 46, 0.65);
  }
  .qr-btn-curator:hover {
    box-shadow: 0 14px 36px rgba(26, 26, 46, 0.80);
  }

  .qr-btn-sub {
    font-size: 0.80rem;
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: 0.05em;
    text-align: center;
    line-height: 1.3;
  }

  /* ── EXPLORER: magnifying-glass text effect ─────────────────────── */

  /* Wrapper that the glass and zoom-text are measured against */
  .qr-explorer-wrap {
    position: relative;
    display: inline-block;
    /* Enough padding so the glass isn't clipped by the button's overflow:hidden
       when it just enters / exits the text area */
    padding: 0.6rem 0 0.3rem;
  }

  /* The normal (always visible) label */
  .qr-explorer-label {
    display: block;
    font-size: 1.72rem;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: white;
    text-transform: uppercase;
    line-height: 1;
    white-space: nowrap;
  }

  /* Zoomed copy of the same label — starts invisible (clip-path radius 0) */
  .qr-explorer-zoom {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.72rem;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: white;
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
    /* hidden by default */
    clip-path: circle(0px at -70px 50%);
    /* scale 1.65× from the lens center — transform-origin is updated
       by the animation via var(--qr-x) */
    transform: scale(1.65);
    transform-origin: -70px 50%;
  }

  /* The magnifying glass SVG that slides across */
  .qr-glass-wrap {
    position: absolute;
    /* Position so the lens circle centre aligns with x=0 of the wrapper
       when translateX is 0; left=-27 because circle cx=27 inside the SVG */
    left: -27px;
    /* Vertically: circle cy=27 inside SVG → top = 50% − 27px */
    top: calc(50% - 27px);
    width: 64px;   /* fits circle r=24 + handle */
    height: 82px;
    pointer-events: none;
    opacity: 0;    /* hidden when not hovering */
    /* default position: circle centre at --qr-x = -70px (off left) */
    transform: translateX(-70px);
    transition: opacity 0.15s ease;
  }

  /* ── CURATOR pencil icon ─────────────────────────────────────────── */
  .qr-pencil-icon {
    display: block;
    margin-bottom: 0.1rem;
    transition: transform 0.2s ease;
  }

  /* ── Animation — only when motion is OK ─────────────────────────── */
  @media (prefers-reduced-motion: no-preference) {
    /* Scan: sweep the custom property from -70px (off-left) to 260px (off-right) */
    @keyframes qr-scan {
      0%,  8% { --qr-x: -70px; }
      44%, 56% { --qr-x: 260px; }
      92%,100% { --qr-x: -70px; }
    }

    @keyframes qr-pen-wiggle {
      0%, 100% { transform: rotate(0deg); }
      25%      { transform: rotate(-7deg); }
      75%      { transform: rotate(7deg);  }
    }

    /* Trigger the scan on hover — animates --qr-x for this element
       and all inheriting children */
    .qr-btn-explorer:hover {
      animation: qr-scan 2.8s ease-in-out infinite;
    }

    /* Reveal and animate the zoomed text through the moving lens */
    .qr-btn-explorer:hover .qr-explorer-zoom {
      clip-path: circle(26px at var(--qr-x) 50%);
      transform: scale(1.65);
      transform-origin: var(--qr-x) 50%;
    }

    /* Move the glass overlay so its circle centre matches var(--qr-x) */
    .qr-btn-explorer:hover .qr-glass-wrap {
      opacity: 1;
      transform: translateX(var(--qr-x));
    }

    /* Pencil wiggle on curator hover */
    .qr-btn-curator:hover .qr-pencil-icon {
      animation: qr-pen-wiggle 0.75s ease-in-out infinite;
      transform-origin: 50% 80%;
    }
  }

  /* ── Reduced-motion fallback ─────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .qr-btn-explorer:hover .qr-explorer-label {
      text-shadow: 0 0 14px rgba(255, 200, 200, 0.70);
    }
    .qr-btn-curator:hover .qr-pencil-icon {
      filter: drop-shadow(0 0 8px rgba(140, 180, 255, 0.80));
    }
  }
`;

export default function Home() {
  const qrespDescription =
    "Qresp facilitates scientific data reproducibility by making available all data & procedures presented in scientific papers, together with metadata to render them searchable and discoverable";
  const qrespAuthor = "Giulia Galli, Marco Govoni";

  return (
    <Fragment>
      <SEO title="Qresp" description={qrespDescription} author={qrespAuthor} />
      <Global styles={btnStyles} />

      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>

        {/* ── Banner ──────────────────────────────────────────────── */}
        <div style={{ position: "relative", overflow: "hidden", maxHeight: "48vh" }}>
          <Picture
            imgSrc="/images/qrespPoster"
            imgAlt="Qresp Banner Blurred Background"
            width="100%"
            className="blur"
          />
          <Picture
            imgSrc="/images/qrespPoster"
            imgAlt="Qresp Banner"
            className="poster"
          />
        </div>

        {/* ── Description ─────────────────────────────────────────── */}
        <Box sx={{ display: "flex", m: 3, alignItems: "center", justifyContent: "center" }}>
          <Container>
            <Typography variant="h5" align="center" gutterBottom>
              <Box sx={{ fontWeight: "fontWeightBold" }}>
                The open source software Qresp {'"'}Curation and Exploration of
                Reproducible Scientific Papers{'"'} <br /> facilitates the
                organization, annotation and exploration of data presented in
                scientific papers.
              </Box>
            </Typography>
          </Container>
        </Box>

        {/* ── CTA Buttons ─────────────────────────────────────────── */}
        <div className="qr-btns">

          {/* EXPLORER — magnifying glass scans over the label on hover */}
          <Link href="/explorer" className="qr-btn qr-btn-explorer">

            <div className="qr-explorer-wrap">
              {/* Normal label (always visible) */}
              <span className="qr-explorer-label">Explorer</span>

              {/* Zoomed label — same text, clipped to the moving lens circle.
                  transform: scale(1.65) with transform-origin: var(--qr-x) 50%
                  means the letter directly under the lens stays in place and
                  appears 1.65× larger — genuine optical magnification. */}
              <span className="qr-explorer-zoom" aria-hidden="true">Explorer</span>

              {/* Magnifying glass SVG — its circle centre tracks var(--qr-x)
                  via translateX so the rim perfectly frames the zoomed region.
                  ViewBox 0 0 64 82:
                    lens circle  cx=27 cy=27 r=24
                    handle line  (45,45) → (60,74)                          */}
              <div className="qr-glass-wrap" aria-hidden="true">
                <svg
                  viewBox="0 0 64 82"
                  width="64"
                  height="82"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Lens fill — just enough to distinguish from background */}
                  <circle cx="27" cy="27" r="23" fill="rgba(255,255,255,0.07)" />
                  {/* Lens rim */}
                  <circle
                    cx="27" cy="27" r="23"
                    stroke="white" strokeWidth="3"
                  />
                  {/* Handle */}
                  <line
                    x1="44" y1="44" x2="59" y2="74"
                    stroke="white" strokeWidth="4.5" strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <span className="qr-btn-sub">Browse reproducible papers</span>
          </Link>

          {/* CURATOR — pencil icon wiggles on hover */}
          <Link href="/curator" className="qr-btn qr-btn-curator">

            {/* Pencil SVG — diagonal, upper-left eraser → lower-right tip.
                Group is translate(22,22) rotate(-45°) so the whole pencil
                is centred in the 44×44 viewBox at 45°.                     */}
            <svg
              className="qr-pencil-icon"
              viewBox="0 0 44 44"
              width="48"
              height="48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g transform="translate(22,22) rotate(-45)">
                {/* Eraser cap */}
                <rect
                  x="-4" y="-22" width="8" height="6" rx="2"
                  fill="rgba(255,140,140,0.88)" stroke="white" strokeWidth="1.5"
                />
                {/* Metal ferrule */}
                <rect
                  x="-5" y="-16" width="10" height="3.5"
                  fill="rgba(200,200,200,0.85)"
                />
                {/* Pencil body (yellow) */}
                <rect
                  x="-4" y="-12.5" width="8" height="22"
                  fill="rgba(255,215,50,0.93)" stroke="white" strokeWidth="1.5"
                />
                {/* Wooden cone */}
                <polygon
                  points="-4,9.5 4,9.5 0,18"
                  fill="rgba(210,175,130,0.90)" stroke="white" strokeWidth="1.5"
                />
                {/* Graphite tip */}
                <circle cx="0" cy="18" r="2" fill="rgba(80,80,80,0.95)" />
              </g>
            </svg>

            <span
              style={{
                fontSize: "1.72rem",
                fontWeight: 900,
                letterSpacing: "0.14em",
                color: "white",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Curator
            </span>

            <span className="qr-btn-sub">Annotate and publish data</span>
          </Link>

        </div>
      </Box>
    </Fragment>
  );
}
