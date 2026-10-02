import { createContext } from "react";

const FavoritesContext = createContext({
  favorites: new Set(),
  loading: false,
  isFavorite: () => false,
  toggleFavorite: async () => {},
});

export default FavoritesContext;
