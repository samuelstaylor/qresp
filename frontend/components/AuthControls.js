import { Fragment, useContext, useRef, useState } from "react";
import { Button, Divider, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import {
  AccountCircle,
  Article,
  EditNote,
  Favorite,
  Logout,
} from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/router";

import AuthContext from "../Context/Auth/authContext";
import { loginHref } from "../Utils/safeNext";

const pillSx = {
  color: "#800000",
  whiteSpace: "nowrap",
  backgroundColor: "#ffffff",
  borderRadius: "20px",
  px: 2,
  fontWeight: 600,
  textTransform: "none",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.88)",
    boxShadow: "0 0 14px rgba(255,255,255,0.45)",
  },
};

const AuthControls = () => {
  const { loading, authenticated, user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const closeTimerRef = useRef(null);

  const scheduleClose = () => {
    closeTimerRef.current = setTimeout(() => setMenuAnchor(null), 120);
  };
  const cancelClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const openMenu = (e) => {
    cancelClose();
    setMenuAnchor(e.currentTarget);
  };
  const closeMenu = () => setMenuAnchor(null);

  if (loading) return null;

  if (authenticated) {
    const displayName =
      (user.name || user.email) + (user.is_admin ? " (admin)" : "");

    return (
      <Fragment>
        <Button
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
          onClick={openMenu}
          aria-haspopup="true"
          aria-expanded={Boolean(menuAnchor) ? "true" : undefined}
          sx={{
            ...pillSx,
            maxWidth: { xs: 130, sm: 210 },
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
          }}
        >
          {displayName}
        </Button>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              elevation: 4,
              sx: { mt: 0.5, minWidth: 200, borderRadius: 2 },
              onMouseEnter: cancelClose,
              onMouseLeave: scheduleClose,
            },
          }}
        >
          <MenuItem disabled sx={{ opacity: "1 !important", py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem component={Link} href="/account" onClick={closeMenu}>
            <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem component={Link} href="/account/records" onClick={closeMenu}>
            <ListItemIcon><Article fontSize="small" /></ListItemIcon>
            My Records
          </MenuItem>
          <MenuItem component={Link} href="/account/favorites" onClick={closeMenu}>
            <ListItemIcon><Favorite fontSize="small" /></ListItemIcon>
            Favorites
          </MenuItem>
          <MenuItem component={Link} href="/account/drafts" onClick={closeMenu}>
            <ListItemIcon><EditNote fontSize="small" /></ListItemIcon>
            Drafts
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => { closeMenu(); logout(); }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon><Logout fontSize="small" sx={{ color: "error.main" }} /></ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Fragment>
    );
  }

  return (
    <Button
      size="large"
      sx={{ ...pillSx, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}
      component="a"
      href={loginHref((router && router.asPath) || "/")}
    >
      Sign in
    </Button>
  );
};

export default AuthControls;
