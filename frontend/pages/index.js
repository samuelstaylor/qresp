import { Fragment } from "react";
import { Global, css } from "@emotion/react";
import Link from "next/link";
import SEO from "../components/seo";
import Picture from "../components/picture";
import { Box, Typography, Container } from "@mui/material";

// r=18 circle circumference ≈ 113 — used for glare-sweep dashoffset
const panelStyles = css`
  .qr-panels {
    display: flex;
    width: 100%;
    min-height: 60vh;
  }

  .qr-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    cursor: pointer;
    transition: opacity 0.35s ease, filter 0.35s ease, transform 0.35s ease;
    padding: 2.5rem 1.5rem;
    position: relative;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    border: none;
    outline: none;
  }

  .qr-panel:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.7);
    outline-offset: -6px;
  }

  .qr-panels:hover .qr-panel {
    opacity: 0.68;
    filter: brightness(0.80);
  }

  .qr-panels:hover .qr-panel:hover {
    opacity: 1;
    filter: brightness(1.10);
    transform: scale(1.015);
  }

  .qr-explorer { background: #8B0000; }
  .qr-curator  { background: #1a1a2e; }

  .qr-label {
    font-size: clamp(1.8rem, 3.5vw, 2.8rem);
    font-weight: 900;
    letter-spacing: 0.14em;
    color: #fff;
    margin: 1.4rem 0 0.5rem;
    font-family: inherit;
    text-align: center;
    text-transform: uppercase;
  }

  .qr-sublabel {
    font-size: clamp(0.78rem, 1.4vw, 0.98rem);
    color: rgba(255, 255, 255, 0.58);
    letter-spacing: 0.08em;
    font-family: inherit;
    text-align: center;
  }

  @media (max-width: 768px) {
    .qr-panels  { flex-direction: column; min-height: unset; }
    .qr-panel   { min-height: 44vh; }
  }

  /* ── Animated keyframes (only when motion is OK) ─────────────────── */
  @media (prefers-reduced-motion: no-preference) {
    @keyframes qr-glare {
      from { stroke-dashoffset: 0;    }
      to   { stroke-dashoffset: -113; }
    }

    @keyframes qr-lens-glow {
      0%,100% { filter: drop-shadow(0 0 4px rgba(255, 180, 180, 0.40)); }
      50%     { filter: drop-shadow(0 0 18px rgba(255, 200, 200, 0.95)); }
    }

    @keyframes qr-draw {
      0%   { stroke-dashoffset: 85; }
      65%  { stroke-dashoffset: 0;  }
      100% { stroke-dashoffset: 0;  }
    }

    @keyframes qr-tip-pulse {
      0%,100% { opacity: 0.55; }
      50%     { opacity: 1; filter: drop-shadow(0 0 5px rgba(140, 210, 255, 1)); }
    }

    @keyframes qr-pencil-jitter {
      0%   { transform: translate(0px,    0px);    }
      20%  { transform: translate(0.8px, -0.7px);  }
      40%  { transform: translate(0.3px,  0.9px);  }
      60%  { transform: translate(-0.8px, 0.4px);  }
      80%  { transform: translate(0.6px, -0.5px);  }
      100% { transform: translate(0px,    0px);    }
    }

    .qr-explorer:hover .qr-lenses  { animation: qr-lens-glow 1.9s ease-in-out infinite; }
    .qr-explorer:hover .qr-glare-l { animation: qr-glare 2.4s linear infinite; }
    .qr-explorer:hover .qr-glare-r { animation: qr-glare 2.4s linear infinite 0.7s; }

    .qr-curator:hover .qr-drawn-line { animation: qr-draw 2.2s ease-out infinite; }
    .qr-curator:hover .qr-tip-dot   { animation: qr-tip-pulse 1.1s ease-in-out infinite; }
    .qr-curator:hover .qr-pencil    { animation: qr-pencil-jitter 0.85s ease-in-out infinite; }
  }

  /* ── Reduced-motion fallback: static glows ───────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .qr-explorer:hover .qr-lenses    { filter: drop-shadow(0 0 16px rgba(255, 200, 200, 0.9)); }
    .qr-curator:hover  .qr-drawn-line { stroke-dashoffset: 0; transition: stroke-dashoffset 0.01s; }
    .qr-curator:hover  .qr-tip-dot   { opacity: 1; filter: drop-shadow(0 0 6px rgba(140, 210, 255, 1)); }
  }
`;

export default function Home() {
  const qrespDescription =
    "Qresp facilitates scientific data reproducibility by making available all data & procedures presented in scientific papers, together with metadata to render them searchable and discoverable";
  const qrespAuthor = "Giulia Galli, Marco Govoni";

  return (
    <Fragment>
      <SEO
        title="Qresp"
        description={qrespDescription}
        author={qrespAuthor}
      />
      <Global styles={panelStyles} />

      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* ── Banner ─────────────────────────────────────────────── */}
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

        {/* ── Description ────────────────────────────────────────── */}
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

        {/* ── CTA Panels ─────────────────────────────────────────── */}
        <div className="qr-panels">

          {/* EXPLORER panel */}
          <Link href="/explorer" className="qr-panel qr-explorer">
            {/* Binoculars SVG
                Left lens: cx=40 cy=82 r=24
                Right lens: cx=120 cy=82 r=24
                Glare ring r=18, circumference≈113, dasharray="22 91" → dashoffset sweeps full circle */}
            <svg
              className="qr-icon"
              viewBox="0 0 160 115"
              width="200"
              height="175"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Left barrel */}
              <rect
                x="14" y="12" width="52" height="44" rx="12"
                fill="rgba(255,255,255,0.10)"
                stroke="white" strokeWidth="2.5"
              />
              {/* Right barrel */}
              <rect
                x="94" y="12" width="52" height="44" rx="12"
                fill="rgba(255,255,255,0.10)"
                stroke="white" strokeWidth="2.5"
              />
              {/* Bridge connecting barrels */}
              <path
                d="M66 30 Q80 21 94 30"
                stroke="white" strokeWidth="2.5" strokeLinecap="round"
              />
              {/* Top eyepiece ridges (decorative) */}
              <line x1="22" y1="20" x2="58" y2="20" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>
              <line x1="102" y1="20" x2="138" y2="20" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>

              {/* Left outer lens — carries the glow animation */}
              <circle
                cx="40" cy="82" r="24"
                fill="rgba(255,255,255,0.07)"
                stroke="white" strokeWidth="2.5"
                className="qr-lenses"
              />
              {/* Left inner lens ring */}
              <circle
                cx="40" cy="82" r="16"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.32)" strokeWidth="1.5"
              />
              {/* Left glare arc (sweeps around the lens) */}
              <circle
                cx="40" cy="82" r="18"
                fill="none"
                stroke="rgba(255,255,255,0.80)" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="22 91"
                className="qr-glare-l"
              />

              {/* Right outer lens */}
              <circle
                cx="120" cy="82" r="24"
                fill="rgba(255,255,255,0.07)"
                stroke="white" strokeWidth="2.5"
                className="qr-lenses"
              />
              {/* Right inner lens ring */}
              <circle
                cx="120" cy="82" r="16"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.32)" strokeWidth="1.5"
              />
              {/* Right glare arc (delayed by 0.7s in CSS) */}
              <circle
                cx="120" cy="82" r="18"
                fill="none"
                stroke="rgba(255,255,255,0.80)" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="22 91"
                className="qr-glare-r"
              />
            </svg>

            <span className="qr-label">Explorer</span>
            <span className="qr-sublabel">Browse reproducible papers</span>
          </Link>

          {/* CURATOR panel */}
          <Link href="/curator" className="qr-panel qr-curator">
            {/* Pencil-writing-on-paper SVG
                Paper: x=18 y=12 w=82 h=104
                Drawn line: M28,76 Q56,68 88,76  (dasharray=90, dashoffset animates 90→0)
                Pencil: translate(88,72) rotate(25°), tip at origin */}
            <svg
              className="qr-icon"
              viewBox="0 0 160 155"
              width="190"
              height="185"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Paper sheet */}
              <rect
                x="18" y="12" width="82" height="104" rx="4"
                fill="rgba(255,255,255,0.08)"
                stroke="white" strokeWidth="2"
              />
              {/* Paper fold at top-right corner */}
              <polygon
                points="82,12 100,12 100,28"
                fill="rgba(255,255,255,0.18)"
                stroke="white" strokeWidth="1.5"
              />
              <line x1="82" y1="12" x2="100" y2="28" stroke="white" strokeWidth="1.5"/>

              {/* Ruled lines on paper */}
              <line x1="28" y1="44" x2="90" y2="44" stroke="rgba(255,255,255,0.22)" strokeWidth="1"/>
              <line x1="28" y1="60" x2="90" y2="60" stroke="rgba(255,255,255,0.22)" strokeWidth="1"/>
              {/* Third line is where the pencil writes — will be replaced by drawn line */}
              <line x1="28" y1="76" x2="90" y2="76" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
              <line x1="28" y1="92" x2="90" y2="92" stroke="rgba(255,255,255,0.22)" strokeWidth="1"/>
              <line x1="28" y1="108" x2="90" y2="108" stroke="rgba(255,255,255,0.22)" strokeWidth="1"/>

              {/* The line being drawn — stroke-dashoffset animation reveals it left-to-right */}
              <path
                d="M28,76 Q56,69 88,76"
                fill="none"
                stroke="rgba(140,210,255,0.90)" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="85"
                strokeDashoffset="85"
                className="qr-drawn-line"
              />

              {/* Pencil — static SVG transform positions it; CSS animation adds jitter
                  translate(88,72): move origin to near tip target position
                  rotate(25): lean 25° clockwise so eraser is upper-right of tip
                  Tip at local (0,0) → SVG (88,72); eraser at local (0,-52) rotated 25° → SVG ≈ (66,25) */}
              <g transform="translate(88, 72) rotate(25)" className="qr-pencil">
                {/* Graphite tip */}
                <circle cx="0" cy="0" r="2.5" fill="rgba(80,80,80,0.95)" className="qr-tip-dot"/>
                {/* Wood cone */}
                <polygon
                  points="-4,-10 4,-10 0,0"
                  fill="rgba(210,175,130,0.90)"
                  stroke="rgba(255,255,255,0.70)" strokeWidth="1"
                />
                {/* Pencil body (yellow) */}
                <rect
                  x="-5.5" y="-42" width="11" height="32"
                  fill="rgba(255,215,50,0.92)"
                  stroke="white" strokeWidth="1.5"
                />
                {/* Metal ferrule */}
                <rect
                  x="-6.5" y="-46" width="13" height="4"
                  fill="rgba(200,200,200,0.85)"
                />
                {/* Eraser cap */}
                <rect
                  x="-5.5" y="-55" width="11" height="9" rx="2"
                  fill="rgba(255,140,140,0.88)"
                  stroke="white" strokeWidth="1.5"
                />
              </g>
            </svg>

            <span className="qr-label">Curator</span>
            <span className="qr-sublabel">Annotate and publish data</span>
          </Link>

        </div>
      </Box>
    </Fragment>
  );
}
