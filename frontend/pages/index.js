import { Fragment } from "react";
import { Global, css } from "@emotion/react";
import Link from "next/link";
import SEO from "../components/seo";
import Picture from "../components/picture";
import { Box, Typography, Container } from "@mui/material";

const btnStyles = css`
  /*
   * Typed custom property — enables animating a CSS length that descendant
   * clip-path can reference. inherits:true propagates the animated value
   * from .qr-btn-explore to its children on every frame.
   */
  @property --glass-y {
    syntax: '<length>';
    initial-value: 0px;
    inherits: true;
  }

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
   * Fixed-height icon area (116px) — both icons are centred within it so
   * "Explore" and "Curate" always sit at the same Y position.
   */
  .qr-icon-area {
    height: 116px;
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

  /* ── EXPLORE: magnifying glass + real-time zoom tracking ────────── */

  /*
   * Layout math (button-relative px):
   *   padding-top 32 + icon-area 116 (SVG centred → 1px top margin, cy=40)
   *   → lens centre in button = 32 + 1 + 40 = 73
   *   gap 0.55rem ≈ 9px → label-wrap starts at 32+116+9 = 157
   *   label height ≈26px → label centre at 170
   *   glass travels 170−73 = 97px to reach the label centre
   *
   * --glass-y is animated on .qr-btn-explore:hover (0→97px) and inherited
   * by the zoom overlay. The clip circle centre tracks it in real time:
   *   y in label-wrap coords = var(--glass-y) − 84px
   *   When glass-y=0:   y=−84 → circle fully above label → invisible ✓
   *   When glass-y=49:  y=−35 → circle bottom just grazes label top
   *   When glass-y=84:  y=  0 → circle centred on label top → half visible
   *   When glass-y=97:  y= 13 → circle centred on label → full lens ✓
   * Fixed radius 35px matches the SVG lens; no radius animation needed.
   */

  /* Set --glass-y = 0 explicitly so the transition has a declared start value */
  .qr-btn-explore {
    --glass-y: 0px;
  }

  .qr-glass-icon {
    display: block;
    transform: translateY(0px) rotate(0deg);
  }

  .qr-label-wrap {
    position: relative;
    overflow: hidden;
    line-height: 1;
  }

  /*
   * Zoom overlay — always rendered, clip circle tracks --glass-y from parent.
   * No separate clip-path transition: --glass-y's own transition drives the
   * position per-frame, avoiding double-interpolation.
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
    clip-path: circle(35px at 50% calc(var(--glass-y) - 84px));
  }

  @media (prefers-reduced-motion: no-preference) {
    /*
     * CSS transitions (not animations) for smooth in AND out:
     *   --glass-y on the button transitions 0→97px hover-in, 97→0px hover-out.
     *   .qr-label-zoom inherits the live value each frame → clip tracks glass.
     *   .qr-glass-icon uses its own transform transition (same easing) so the
     *   lens and clip circle stay in lock-step in both directions.
     */
    .qr-btn-explore {
      transition: --glass-y 0.8s ease-out, transform 0.22s ease, box-shadow 0.22s ease;
    }

    .qr-btn-explore:hover {
      --glass-y: 97px;
    }

    .qr-glass-icon {
      transition: transform 0.8s ease-out;
    }

    .qr-btn-explore:hover .qr-glass-icon {
      transform: translateY(97px) rotate(-10deg);
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
              Magnifying glass — white outline, faint interior.
              ViewBox 0 0 90 114:
                Lens   cx=45 cy=40 r=35  (centered in 90px SVG → aligns clip at 50%)
                Handle (69,64) → (85,106)  same angle as before, shifted +5x
              SVG 114px tall, centred in 116px icon-area (1px margin top).
              Lens centre: 1+40=41px from icon-area top, 73px from button top.
              translateY(97) lands the lens centre on the label centre (170px).
            */}
            <div className="qr-icon-area">
              <svg
                className="qr-glass-icon"
                viewBox="0 0 90 114"
                width="90"
                height="114"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Faint glass interior */}
                <circle cx="45" cy="40" r="35" fill="rgba(255,255,255,0.06)" />
                {/* Rim */}
                <circle cx="45" cy="40" r="35" stroke="white" strokeWidth="3" />
                {/* Handle */}
                <line
                  x1="69" y1="64" x2="85" y2="106"
                  stroke="white" strokeWidth="5" strokeLinecap="round"
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
