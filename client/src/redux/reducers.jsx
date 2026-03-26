import { combineReducers } from "@reduxjs/toolkit";
import headingTitleReducer from "./Slices/HeadingTitle";
import folderReducer from "./Slices/FolderSlice";
import themeModalReducer from "./Slices/ThemeModalSclice";
import dashboardReducer from "./Slices/DashboardSlice";
import folderDataReducer from "./Slices/FolderDataSlice";
import advancedFilterReducer from "./Slices/AdvancedFilterSlice";
import labelToggleReducer from "./Slices/ToggleLabel";
import selectedObjectReducer from "./Slices/ObjectSelection";
import PermissionReducer from "./Slices/PermissionSlice";
import favoritesReducer from "./Slices/FavoritesSlice";

const rootReducers = combineReducers({
  title: headingTitleReducer,
  folder: folderReducer,
  themeModal: themeModalReducer,
  dashboard: dashboardReducer,
  folderData: folderDataReducer,
  advancedFilter: advancedFilterReducer,
  labelToggle: labelToggleReducer,
  selectedObject: selectedObjectReducer,
  permission: PermissionReducer,
  favorites: favoritesReducer,
});

export default rootReducers;
