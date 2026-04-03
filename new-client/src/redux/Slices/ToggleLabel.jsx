import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  chartSettings: {},
};

const labelToggleSlice = createSlice({
  name: "labelToggle",
  initialState,
  reducers: {
    toggleLabels: (state, action) => {
      const chartId = action.payload;
      if (!state.chartSettings[chartId]) {
        state.chartSettings[chartId] = {};
      }
      state.chartSettings[chartId].showLabels =
        !state.chartSettings[chartId].showLabels;
    },
    toggleLabelValues: (state, action) => {
      const chartId = action.payload;
      if (!state.chartSettings[chartId]) {
        state.chartSettings[chartId] = {};
      }
      state.chartSettings[chartId].showLabelValues =
        !state.chartSettings[chartId].showLabelValues;
    },
    // setChartLabelState: (state, action) => {
    //   const { id, showLabels, showLabelValues } = action.payload;
    //   state.chartSettings[id] = {
    //     showLabels: showLabels ?? false,
    //     showLabelValues: showLabelValues ?? false,
    //   };
    // },
    initializeChartSettings: (state, action) => {
      const chartSettingsData = action.payload;
      chartSettingsData.forEach(({ chartId, showLabels, showLabelValues }) => {
        if (!state.chartSettings[chartId]) {
          state.chartSettings[chartId] = {};
        }
        state.chartSettings[chartId].showLabels = showLabels;
        state.chartSettings[chartId].showLabelValues = showLabelValues;
      });
    },
  },
});

export const {
  toggleLabels,
  toggleLabelValues,
  // setChartLabelState,
  initializeChartSettings,
} = labelToggleSlice.actions;

export default labelToggleSlice.reducer;
