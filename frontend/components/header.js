import { useState, Fragment } from "react";
import { useRouter } from "next/router";
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Button,
  Drawer,
} from "@mui/material";
import { styled } from "@mui/material/styles";

import { Menu } from "@mui/icons-material";

import StyledButton, { InternalStyledButton } from "./button";

import AuthControls from "./AuthControls";

import Picture from "./picture";

import Link from "next/link";

// Defined at module scope (not per-render) with the paper slot styled via its
// global class, since withStyles' classes map is gone in MUI v5+.
const StyledDrawer = styled(Drawer)({
  "& .MuiDrawer-paper": {
    backgroundColor: "#800000",
  },
});

const Header = () => {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useRouter();

  const isActive = (url) => {
    if (url === "/explorer") return pathname === "/explorer" || pathname === "/search";
    return pathname === url || pathname.startsWith(url + "/");
  };

  const handleOpen = () => {
    setDrawer(true);
  };

  const toggleDrawer = (event) => {
    if (
      event &&
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawer(!drawer);
  };

  // Navigation only — the auth control is deliberately NOT part of this, so
  // it never disappears into the drawer.
  const links = (
    <Fragment>
      <InternalStyledButton text="Explorer" url="/explorer" active={isActive("/explorer")} />
      <InternalStyledButton text="Curator" url="/curator" active={isActive("/curator")} />
      {/* Both are pages now, not jumps out of the app.
          Documentation was an external link to qresp.org and Contact was a
          bare `mailto:` — a navigation item that handed the page to a mail
          client, and did nothing at all on a machine with none configured. */}
      <InternalStyledButton text="Documentation" url="/documentation" active={isActive("/documentation")} />
      <InternalStyledButton text="Contact" url="/contact" active={isActive("/contact")} />
    </Fragment>
  );

  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar>
        {/* xl gives the inline row room to breathe; the auth control sits
            outside it and shows at every width. */}
        <Container maxWidth="xl">
          {/* The row WRAPS: on a phone the logo plus a signed-in name,
              Sign out and the menu button are wider than the bar, and a row
              that cannot wrap widened the whole page instead. The controls
              then take a line of their own, still right-aligned. */}
          <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", flexGrow: 1, minWidth: 0, width: "100%", alignItems: "center", m: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1, minWidth: 0 }}>
              <Button component={Link} href="/">
                <Picture
                  imgSrc="/images/qrespLogo"
                  imgAlt="Qresp Logo"
                  height="64px"
                />
              </Button>
            </Box>
            <Box
              data-testid="header-controls"
              sx={{ display: "flex", alignItems: "center", flexWrap: "nowrap", maxWidth: "100%", ml: "auto" }}
            >
              {/* MUI v6+ removed <Hidden>; use responsive display instead.
                  Navigation collapses into the drawer below lg. */}
              <Box
                sx={{
                  display: { xs: "none", lg: "flex" },
                  alignItems: "center",
                  flexWrap: "nowrap",
                }}
              >
                {links}
              </Box>
              {/* Auth stays OUTSIDE the drawer at every width: signing in must
                  never be something the visitor has to hunt for behind a
                  hamburger. It is one short control, so it fits. */}
              <AuthControls />
              <Box sx={{ display: { xs: "flex", lg: "none" } }}>
                <StyledButton aria-label="Open navigation menu" onClick={handleOpen}>
                  <Menu />
                </StyledButton>
              </Box>
            </Box>
          </Box>
        </Container>
      </Toolbar>
      <StyledDrawer anchor="top" open={drawer} onClose={toggleDrawer}>
        <Box onClick={toggleDrawer} sx={{ display: "flex", flexDirection: "column" }}>
          {links}
        </Box>
      </StyledDrawer>
    </AppBar>
  );
};

export default Header;
