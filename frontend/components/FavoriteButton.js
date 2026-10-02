import { useContext } from "react";
import { IconButton, Tooltip } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";

import FavoritesContext from "../Context/Favorites/favoritesContext";
import AuthContext from "../Context/Auth/authContext";

const FavoriteButton = ({ paperId, size = "small" }) => {
  const { authenticated } = useContext(AuthContext);
  const { isFavorite, toggleFavorite } = useContext(FavoritesContext);

  if (!authenticated) return null;

  const favorited = isFavorite(paperId);

  return (
    <Tooltip title={favorited ? "Remove from favorites" : "Add to favorites"} placement="top">
      <IconButton
        size={size}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(paperId);
        }}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        sx={{ color: favorited ? "#800000" : "text.secondary" }}
      >
        {favorited ? (
          <FavoriteIcon fontSize={size} />
        ) : (
          <FavoriteBorderIcon fontSize={size} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default FavoriteButton;
