import { useContext, useRef, useState } from "react";
import { Box, Button, Divider, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import {
  AccountCircle,
  AdminPanelSettings,
  Article,
  EditNote,
  Favorite as FavoriteIcon,
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
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const closeTimer = useRef(null);

  const handleOpen = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const handleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  };
  const closeNow = () => {
    clearTimeout(closeTimer.current);
    setOpen(false);
  };

  if (loading) return null;

  if (authenticated) {
    const displayName =
      (user.name || user.email) + (user.is_admin ? " (admin)" : "");

    return (
      // Wrapping Box owns the hover region — button + menu are in the same
      // DOM subtree so onMouseLeave fires only when leaving the whole unit.
      <Box
        sx={{ display: "inline-block" }}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <Button
          ref={anchorRef}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
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
          anchorEl={anchorRef.current}
          open={open}
          onClose={closeNow}
          disablePortal
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: { elevation: 4, sx: { mt: 0.5, minWidth: 200, borderRadius: 2 } },
          }}
        >
          <MenuItem disabled sx={{ opacity: "1 !important", py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem component={Link} href="/account" onClick={closeNow}>
            <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
            My Profile
          </MenuItem>
          <MenuItem component={Link} href="/account/records" onClick={closeNow}>
            <ListItemIcon><Article fontSize="small" /></ListItemIcon>
            My Records
          </MenuItem>
          <MenuItem component={Link} href="/account/favorites" onClick={closeNow}>
            <ListItemIcon><FavoriteIcon fontSize="small" /></ListItemIcon>
            My Favorites
          </MenuItem>
          <MenuItem component={Link} href="/account/drafts" onClick={closeNow}>
            <ListItemIcon><EditNote fontSize="small" /></ListItemIcon>
            My Drafts
          </MenuItem>
          {user.is_admin && (
            <MenuItem component={Link} href="/account/admin" onClick={closeNow}>
              <ListItemIcon><AdminPanelSettings fontSize="small" /></ListItemIcon>
              Admin
            </MenuItem>
          )}
          <Divider />
          <MenuItem
            onClick={() => { closeNow(); logout(); }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon><Logout fontSize="small" sx={{ color: "error.main" }} /></ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Box>
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
