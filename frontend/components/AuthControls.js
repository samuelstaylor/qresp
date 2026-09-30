import { Fragment, useContext, useState } from "react";
import { Button, Menu, MenuItem, ListItemIcon } from "@mui/material";
import { Logout, AccountCircle } from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/router";

import AuthContext from "../Context/Auth/authContext";
import { loginHref } from "../Utils/safeNext";

// Pill-shaped button style shared by both the signed-in badge and the sign-in
// button — a slightly different surface from the plain AppBar so it reads as
// an interactive control without adding a heavy contrasting block.
const pillSx = {
  color: "#FFF",
  whiteSpace: "nowrap",
  border: "1px solid rgba(255,255,255,0.35)",
  backgroundColor: "rgba(255,255,255,0.1)",
  borderRadius: "20px",
  px: 1.5,
  textTransform: "none",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.6)",
  },
};

const AuthControls = () => {
  const { loading, authenticated, user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState(null);

  const openMenu = (e) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  if (loading) return null;

  if (authenticated) {
    const displayName =
      (user.name || user.email) + (user.is_admin ? " (admin)" : "");

    return (
      <Fragment>
        <Button
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
          slotProps={{ paper: { elevation: 3, sx: { mt: 0.5, minWidth: 160 } } }}
        >
          <MenuItem component={Link} href="/account" onClick={closeMenu}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            My account
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu();
              logout();
            }}
          >
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Fragment>
    );
  }

  return (
    <Button
      size="small"
      sx={{ ...pillSx, flexShrink: 0 }}
      component="a"
      href={loginHref((router && router.asPath) || "/")}
    >
      Sign in
    </Button>
  );
};

export default AuthControls;
