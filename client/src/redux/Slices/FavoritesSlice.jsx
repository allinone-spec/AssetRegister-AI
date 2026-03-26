import { createSlice } from "@reduxjs/toolkit";

// Load favorites from localStorage
const loadFavoritesFromStorage = () => {
  try {
    const stored = localStorage.getItem("favorites");
    return stored
      ? JSON.parse(stored)
      : {
          dashboardFavorites: [],
          reportFavorites: [],
          chartFavorites: [],
          viewFavorites: [],
        };
  } catch (error) {
    console.error("Error loading favorites from localStorage:", error);
    return {
      dashboardFavorites: [],
      reportFavorites: [],
      chartFavorites: [],
      viewFavorites: [],
    };
  }
};

// Save favorites to localStorage
const saveFavoritesToStorage = (state) => {
  try {
    localStorage.setItem(
      "favorites",
      JSON.stringify({
        dashboardFavorites: state.dashboardFavorites,
        reportFavorites: state.reportFavorites,
        chartFavorites: state.chartFavorites,
        viewFavorites: state.viewFavorites,
      })
    );
  } catch (error) {
    console.error("Error saving favorites to localStorage:", error);
  }
};

const storedFavorites = loadFavoritesFromStorage();

const initialState = {
  dashboardFavorites: storedFavorites.dashboardFavorites || [], // Array of favorite dashboard folders
  reportFavorites: storedFavorites.reportFavorites || [], // Array of favorite report folders
  chartFavorites: storedFavorites.chartFavorites || [], // Array of favorite individual charts
  viewFavorites: storedFavorites.viewFavorites || [], // Array of favorite views
};

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    addToFavorites: (state, action) => {
      const { type, folder, chart, view } = action.payload;
      if (type === "dashboard") {
        const exists = state.dashboardFavorites.find(
          (fav) => fav.id === folder.id
        );
        if (!exists) {
          state.dashboardFavorites.push(folder);
        }
      } else if (type === "report") {
        const exists = state.reportFavorites.find(
          (fav) => fav.id === folder.id
        );
        if (!exists) {
          state.reportFavorites.push(folder);
        }
      } else if (type === "chart") {
        const exists = state.chartFavorites.find((fav) => fav.id === chart.id);
        if (!exists) {
          state.chartFavorites.push(chart);
        }
      } else if (type === "view") {
        const exists = state.viewFavorites.find((fav) => fav.id === view.id);
        if (!exists) {
          state.viewFavorites.push(view);
        }
      }
      saveFavoritesToStorage(state);
    },
    removeFromFavorites: (state, action) => {
      const { type, folderId, chartId, viewId } = action.payload;
      if (type === "dashboard") {
        state.dashboardFavorites = state.dashboardFavorites.filter(
          (fav) => fav.id !== folderId
        );
      } else if (type === "report") {
        state.reportFavorites = state.reportFavorites.filter(
          (fav) => fav.id !== folderId
        );
      } else if (type === "chart") {
        state.chartFavorites = state.chartFavorites.filter(
          (fav) => fav.id !== chartId
        );
      } else if (type === "view") {
        state.viewFavorites = state.viewFavorites.filter(
          (fav) => fav.id !== viewId
        );
      }
      saveFavoritesToStorage(state);
    },
    setFavorites: (state, action) => {
      const {
        dashboardFavorites,
        reportFavorites,
        chartFavorites,
        viewFavorites,
      } = action.payload;
      if (dashboardFavorites) {
        state.dashboardFavorites = dashboardFavorites;
      }
      if (reportFavorites) {
        state.reportFavorites = reportFavorites;
      }
      if (chartFavorites) {
        state.chartFavorites = chartFavorites;
      }
      if (viewFavorites) {
        state.viewFavorites = viewFavorites;
      }
      saveFavoritesToStorage(state);
    },
    clearAllFavorites: (state) => {
      state.dashboardFavorites = [];
      state.reportFavorites = [];
      state.chartFavorites = [];
      state.viewFavorites = [];
      saveFavoritesToStorage(state);
    },
  },
});

export const {
  addToFavorites,
  removeFromFavorites,
  setFavorites,
  clearAllFavorites,
} = favoritesSlice.actions;

export default favoritesSlice.reducer;
