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
    gap: 3.5rem;
    justify-content: center;
    flex-wrap: wrap;
    padding: 0.25rem 1rem 2.5rem;
  }

  .qr-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.55rem;
    text-decoration: none;
    width: 240px;
    padding: 2rem 2rem 1.6rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: #800000;
    box-shadow: 0 4px 22px rgba(100, 0, 0, 0.50);
    cursor: pointer;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
    overflow: hidden;
  }

  .qr-btn:hover {
    transform: translateY(-5px);
    box-shadow: 0 14px 40px rgba(100, 0, 0, 0.65);
  }

  .qr-btn:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.75);
    outline-offset: 3px;
  }

  /*
   * Fixed-height icon area: both buttons get the same 90px block above
   * the label, so "Explore" and "Curate" always sit at the same Y.
   * The icons are centred within that block.
   */
  .qr-icon-area {
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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

  /*
   * The glass lives inside .qr-icon-area (90px tall).
   * Lens SVG: viewBox 0 0 68 88, lens cx=30 cy=30 r=27.
   * At 1:1 px scale the visual lens radius = 27px.
   *
   * On hover the glass slides down so its lens centre aligns with the
   * label's centre:
   *   distance = (90px icon-area − lens cy 30) + gap 8px + label-centre 13px
   *            = 60 + 8 + 13 = 81px
   *
   * Transition going BACK (exit) uses ease-out — no bounce.
   * Transition going TO hover (enter) uses spring cubic-bezier.
   */
  .qr-glass-icon {
    display: block;
    transition: transform 0.30s ease-out;
  }

  @media (prefers-reduced-motion: no-preference) {
    .qr-btn-explore:hover .qr-glass-icon {
      transform: translateY(81px);
      transition: transform 0.46s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  }

  /*
   * Label wrapper: holds the normal label + the zoom overlay.
   * overflow:hidden stops the oversized zoom text from painting outside
   * before clip-path takes effect.
   */
  .qr-label-wrap {
    position: relative;
    overflow: hidden;
    line-height: 1;
  }

  /*
   * Zoom overlay — a LARGER font-size (not scale transform).
   * Using transform:scale inflates the clip-path's coordinate space so the
   * visible circle ends up bigger than the lens.  Using a larger font-size
   * keeps the clip-path coordinates in normal pixel space, so
   * circle(27px) matches the 27px visual lens radius exactly.
   *
   * background: #800000 covers the normal text inside the lens so only
   * the zoomed letters are visible there.
   *
   * clip-path starts at radius 0 (invisible); on hover it opens to 27px,
   * showing ~2-3 magnified characters through the lens.
   */
  .qr-label-zoom {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.9rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    color: white;
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
    background: #800000;
    /* hidden by default */
    clip-path: circle(0px at 50% 50%);
    /* fast collapse on exit, no delay */
    transition: clip-path 0.14s ease;
  }

  @media (prefers-reduced-motion: no-preference) {
    .qr-btn-explore:hover .qr-label-zoom {
      /* radius matches the 27px visual lens; delay lets the glass arrive first */
      clip-path: circle(27px at 50% 50%);
      transition: clip-path 0.20s ease 0.30s;
    }
  }

  /* ── CURATE: pencil wiggles on hover ─────────────────────────────── */
  .qr-pencil-icon {
    display: block;
  }

  @media (prefers-reduced-motion: no-preference) {
    @keyframes qr-pen-wiggle {
      0%,100% { transform: rotate(0deg);  }
      30%     { transform: rotate(-8deg); }
      70%     { transform: rotate(8deg);  }
    }

    .qr-btn-curate:hover .qr-pencil-icon {
      animation: qr-pen-wiggle 0.75s ease-in-out infinite;
      transform-origin: 65% 75%;
    }
  }

  /* ── Reduced-motion: static glow only ───────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .qr-btn-explore:hover .qr-btn-label,
    .qr-btn-curate:hover  .qr-btn-label {
      text-shadow: 0 0 18px rgba(255, 200, 200, 0.65);
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

          {/* EXPLORE ────────────────────────────────────────────── */}
          <Link href="/explorer" className="qr-btn qr-btn-explore">

            {/*
              Magnifying glass — white outline, faint glass interior.
              ViewBox 0 0 68 88:
                Lens  cx=30 cy=30 r=27  (visual radius 27px at 1:1 scale)
                Handle (49,49) → (63,82)  strokeWidth=4.5 round cap
              The lens centre sits 30px from the SVG top.  Inside the 90px
              icon-area, the SVG is vertically centred, so the lens centre
              is at (90−68)/2 + 30 = 41px from the icon-area top.
              translateY(81) = (90−30) + gap(8) + label-half(13) − (90−68)/2 ...
              simplified: move until lens centre meets label centre.
            */}
            <div className="qr-icon-area">
              <svg
                className="qr-glass-icon"
                viewBox="0 0 68 88"
                width="68"
                height="88"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Faint glass interior — just enough to read as a lens */}
                <circle cx="30" cy="30" r="26" fill="rgba(255,255,255,0.06)" />
                {/* Rim */}
                <circle cx="30" cy="30" r="26" stroke="white" strokeWidth="2.5" />
                {/* Handle */}
                <line
                  x1="49" y1="49" x2="63" y2="82"
                  stroke="white" strokeWidth="4.5" strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Label with zoom overlay */}
            <div className="qr-label-wrap">
              <span className="qr-btn-label">Explore</span>
              {/*
                Zoom overlay: font-size 2.9rem makes the text ~1.76× bigger
                than the 1.65rem base.  background #800000 erases the normal
                text inside the lens.  clip-path circle(27px) matches the
                visual lens radius so the magnified letters are strictly
                contained within the glass.
              */}
              <span className="qr-label-zoom" aria-hidden="true">Explore</span>
            </div>

            <span className="qr-btn-sub">Browse reproducible papers</span>
          </Link>

          {/* CURATE ─────────────────────────────────────────────── */}
          <Link href="/curator" className="qr-btn qr-btn-curate">

            {/*
              Pencil — white outline only, fill="none" on every shape.
              ViewBox 0 0 44 44, group translate(22,22) rotate(−45°):
                eraser cap  (-4,−23) rx=2
                ferrule     line at y=−16
                body        rect (-4,−16) to (4,9)
                wood cone   triangle to (0,19)
              The icon is centred in the 90px icon-area to match the
              Explore button's label height.
            */}
            <div className="qr-icon-area">
              <svg
                className="qr-pencil-icon"
                viewBox="0 0 44 44"
                width="52"
                height="52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <g transform="translate(22,22) rotate(-45)">
                  <rect
                    x="-4" y="-23" width="8" height="7" rx="2"
                    fill="none" stroke="white" strokeWidth="1.8"
                  />
                  <line
                    x1="-5" y1="-16" x2="5" y2="-16"
                    stroke="rgba(255,255,255,0.50)" strokeWidth="1.2"
                  />
                  <rect
                    x="-4" y="-16" width="8" height="25"
                    fill="none" stroke="white" strokeWidth="1.8"
                  />
                  <polygon
                    points="-4,9 4,9 0,19"
                    fill="none" stroke="white" strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </div>

            <span className="qr-btn-label">Curate</span>
            <span className="qr-btn-sub">Annotate and publish data</span>
          </Link>

        </div>
      </Box>
    </Fragment>
  );
}
