import { Fragment, useContext, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Typography,
} from "@mui/material";
import { FavoriteBorder, OpenInNew } from "@mui/icons-material";

import SEO from "../../components/seo";
import AccountLayout from "../../components/Account/AccountLayout";
import FavoritesContext from "../../Context/Favorites/favoritesContext";
import AuthContext from "../../Context/Auth/authContext";
import { getServer } from "../../Utils/utils";

const FavoritesPage = () => {
  const { loading, authenticated } = useContext(AuthContext);
  const { removeFavorite } = useContext(FavoritesContext);
  const [favoritePapers, setFavoritePapers] = useState(null);
  const origin = typeof window === "undefined" ? "" : getServer();

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    axios
      .get("/api/account/favorites")
      .then((res) => { if (!cancelled) setFavoritePapers(res.data.favorites || []); })
      .catch(() => { if (!cancelled) setFavoritePapers([]); });
    return () => { cancelled = true; };
  }, [authenticated]);

  let content;
  if (loading) {
    content = <Typography color="text.secondary">Checking sign-in…</Typography>;
  } else if (!authenticated) {
    content = (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, maxWidth: 440 }}>
        <Typography variant="h6" gutterBottom>Sign in to view your favorites</Typography>
        <Typography variant="body2" color="text.secondary">
          Use &ldquo;Sign in&rdquo; in the header to access your saved papers.
        </Typography>
      </Paper>
    );
  } else if (favoritePapers === null) {
    content = <Typography color="text.secondary">Loading favorites…</Typography>;
  } else if (favoritePapers.length === 0) {
    content = (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
        <FavoriteBorder sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
        <Typography variant="h6" gutterBottom>No favorites yet</Typography>
        <Typography variant="body2" color="text.secondary">
          Click the heart icon on any paper in the Explorer to save it here.
        </Typography>
      </Paper>
    );
  } else {
    content = (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {favoritePapers.map((paper) => (
          <Paper
            key={paper.id}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              borderLeft: "3px solid #800000",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={600} noWrap>
                {paper.title}{paper.year ? ` (${paper.year})` : ""}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {paper.authors}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNew fontSize="inherit" />}
                component={Link}
                href={`/paperdetails/${encodeURIComponent(paper.id)}?server=${encodeURIComponent(paper.server_url || origin)}`}
              >
                View
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => {
                  removeFavorite(paper.id);
                  setFavoritePapers((items) => (items || []).filter((p) => p.id !== paper.id));
                }}
              >
                Remove
              </Button>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  }

  return (
    <Fragment>
      <SEO
        title="Qresp | Favorites"
        description="Your saved papers on Qresp"
        author="Qresp Team"
      />
      <AccountLayout pageTitle="Favorites">{content}</AccountLayout>
    </Fragment>
  );
};

export default FavoritesPage;
