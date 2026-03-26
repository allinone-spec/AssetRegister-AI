import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dashboardData: {

    dashboardName: "",
    folderId: "",
    objectId: "",
    folderType: "Public",
    description: "",
    chartType: "",
    columnNames: {},
    tableType: "",
    folder: "",
    tableName: [],
    userIds: [],
    groupIds: []

  },
}

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboardData: (state, action) => {
      const { field, value } = action.payload;
      if (field === "userIds" || field === "groupIds") {
        state.dashboardData[field] = Array.isArray(value) ? value : [value];
      } else if (field in state.dashboardData) {
        state.dashboardData[field] = value;
      }
    },
    resetDashboard: (state) => {
      state.dashboardData = {
        dashboardName: "",
        folderId: "",
        objectId: "",
        folderType: "Public",
        description: "",
        chartType: "",
        columnNames: {},
        tableType: "",
        folder: "",
        tableName: [],
        userIds: [],
        groupIds: [],
      }
    },
  }
});

export const { setDashboardData, resetDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
