import { Fragment } from "react";
import { Global, css } from "@emotion/react";
import Link from "next/link";
import SEO from "../components/seo";
import Picture from "../components/picture";
import { Box, Typography, Container } from "@mui/material";

const btnStyles = css`
  /* ── button row ──────────────────────────────────────────────────── */
  .qr-btns {
    display: flex;
    flex-direction: row;
    gap: 1.6rem;
    justify-content: center;
    flex-wrap: wrap;
    padding: 0.25rem 1rem 2.5rem;
  }

  .qr-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    width: 240px;
    padding: 2rem 2rem 1.6rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #800000;
    box-shadow: 0 4px 20px rgba(100, 0, 0, 0.50);
    cursor: pointer;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
    overflow: hidden;
  }

  .qr-btn:hover {
    transform: translateY(-5px);
    box-shadow: 0 14px 38px rgba(100, 0, 0, 0.65);
  }

  .qr-btn:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.75);
    outline-offset: 3px;
  }

  .qr-btn-label {
    font-size: 1.65rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    color: white;
    text-transform: uppercase;
    line-height: 1;
    white-space: nowrap;
  }

  .qr-btn-sub {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.52);
    letter-spacing: 0.07em;
    text-align: center;
    line-height: 1.35;
    margin-top: 0.1rem;
  }

  /* ── EXPLORE: magnifying glass descends on hover ─────────────────── */

  /* Glass icon — sits above the label in idle state, slides down on hover.
     Transition going BACK to idle uses ease-out (smooth, no bounce).
     Transition going TO hover uses a spring curve (snappy entry). */
  .qr-glass-icon {
    display: block;
    flex-shrink: 0;
    transition: transform 0.30s ease-out;
  }

  @media (prefers-reduced-motion: no-preference) {
    .qr-btn-explore:hover .qr-glass-icon {
      /* Slide the glass lens down to sit over the label text.
         Glass SVG: 58px tall, lens cy=24. Button gap between items: 0.5rem ≈ 8px.
         Label height ≈ 28px. Distance lens-centre→label-centre ≈ (58−24)+8+14 = 56px. */
      transform: translateY(56px);
      transition: transform 0.44s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  }

  /* Label text area — holds the normal label + the zoomed overlay */
  .qr-label-wrap {
    position: relative;
    line-height: 1;
  }

  /* Zoomed label: same text scaled 1.7× from the centre.
     Clipped to a circle that opens when the glass arrives. */
  .qr-label-zoom {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.65rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    color: white;
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
    /* hidden by default — clip circle has radius 0 */
    clip-path: circle(0px at 50% 50%);
    transform: scale(1.7);
    transform-origin: 50% 50%;
    /* exit: close quickly with no delay */
    transition: clip-path 0.14s ease;
  }

  @media (prefers-reduced-motion: no-preference) {
    .qr-btn-explore:hover .qr-label-zoom {
      /* Open to match the visual lens radius (≈ 22px at 1:1 SVG scale).
         Delay lets the glass travel most of the way down before revealing. */
      clip-path: circle(22px at 50% 50%);
      transition: clip-path 0.20s ease 0.28s;
    }
  }

  /* ── CURATE: pencil wiggles on hover ─────────────────────────────── */
  .qr-pencil-icon {
    display: block;
    flex-shrink: 0;
    transition: filter 0.22s ease;
  }

  @media (prefers-reduced-motion: no-preference) {
    @keyframes qr-pen-wiggle {
      0%,100% { transform: rotate(0deg);  }
      30%     { transform: rotate(-8deg); }
      70%     { transform: rotate(8deg);  }
    }

    .qr-btn-curate:hover .qr-pencil-icon {
      animation: qr-pen-wiggle 0.75s ease-in-out infinite;
      transform-origin: 65% 75%;   /* pivot near the tip */
    }
  }

  /* ── Reduced-motion: static hover glows ──────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .qr-btn-explore:hover .qr-btn-label,
    .qr-btn-curate:hover .qr-btn-label {
      text-shadow: 0 0 16px rgba(255, 200, 200, 0.65);
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

          {/* EXPLORE button ─────────────────────────────────────── */}
          <Link href="/explorer" className="qr-btn qr-btn-explore">

            {/*
              Magnifying glass — white outline only (no fills).
              ViewBox 0 0 58 74:
                Lens circle  cx=26 cy=24 r=22  (stroke 2.5, subtle fill)
                Handle line  (42,40) → (54,68)  (stroke 4, round cap)
              The lens centre is at y=24 within the 58-tall SVG.
              On hover, translateY(56px) slides the lens over the label below.
            */}
            <svg
              className="qr-glass-icon"
              viewBox="0 0 58 74"
              width="58"
              height="74"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Very faint interior so the lens circle reads as a distinct shape */}
              <circle cx="26" cy="24" r="21" fill="rgba(255,255,255,0.06)" />
              {/* Rim */}
              <circle cx="26" cy="24" r="21" stroke="white" strokeWidth="2.5" />
              {/* Handle */}
              <line
                x1="42" y1="40" x2="55" y2="68"
                stroke="white" strokeWidth="4" strokeLinecap="round"
              />
            </svg>

            {/* Label area with zoom overlay */}
            <div className="qr-label-wrap">
              <span className="qr-btn-label">Explore</span>
              {/*
                Zoomed copy — clip-path opens to a 22px-radius circle centred on
                the label when the glass arrives. transform: scale(1.7) from the
                same centre means the letter(s) directly under the lens stay in
                place and appear 1.7× larger, showing ~3 magnified characters.
              */}
              <span className="qr-label-zoom" aria-hidden="true">Explore</span>
            </div>

            <span className="qr-btn-sub">Browse reproducible papers</span>
          </Link>

          {/* CURATE button ──────────────────────────────────────── */}
          <Link href="/curator" className="qr-btn qr-btn-curate">

            {/*
              Pencil — white outline only, no colour fills.
              ViewBox 0 0 44 44, group translate(22,22) rotate(-45°):
                eraser cap at top  (-4,−23) → (4,−16) rounded rect
                separator line     at y=−16
                body               (-4,−16) → (4, 9)
                wood cone tip      triangle to point (0,19)
              All shapes: fill=none, stroke=white.
            */}
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
                  x="-4" y="-23" width="8" height="7" rx="2"
                  fill="none" stroke="white" strokeWidth="1.8"
                />
                {/* Ferrule line */}
                <line
                  x1="-5" y1="-16" x2="5" y2="-16"
                  stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"
                />
                {/* Pencil body */}
                <rect
                  x="-4" y="-16" width="8" height="25"
                  fill="none" stroke="white" strokeWidth="1.8"
                />
                {/* Wood cone */}
                <polygon
                  points="-4,9 4,9 0,19"
                  fill="none" stroke="white" strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </g>
            </svg>

            <span className="qr-btn-label">Curate</span>
            <span className="qr-btn-sub">Annotate and publish data</span>
          </Link>

        </div>
      </Box>
    </Fragment>
  );
}
