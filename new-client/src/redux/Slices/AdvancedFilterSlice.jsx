import { createSlice } from "@reduxjs/toolkit";

const advancedFilterSlice = createSlice({
  name: "advancedFilter",
  initialState: {
    filters: [],
    activeColumns: [], // Changed from Set to Array
  },
  reducers: {
    setFilters: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.filters = action.payload;
        // Use array with unique values instead of Set
        const columns = action.payload.map((filter) => filter.column);
        state.activeColumns = [...new Set(columns)]; // Remove duplicates
      } else {
        console.error(
          "setFilters was dispatched with a non-array payload:",
          action.payload
        );
      }
    },
    addFilter: (state, action) => {
      if (Array.isArray(state.filters)) {
        // Check if exact same filter (same column AND same value) already exists
        const duplicateExists = state.filters.some(
          (f) =>
            f.column === action.payload.column &&
            f.value === action.payload.value
        );

        if (duplicateExists) {
          // Same column and same value - don't add, just return
          return;
        } else {
          // Either new column OR same column with different value - add the filter
          state.filters.push(action.payload);
        }

        // Add column to active columns if not already present
        if (!state.activeColumns.includes(action.payload.column)) {
          state.activeColumns.push(action.payload.column);
        }
      } else {
        console.error(
          "state.filters is not an array in addFilter",
          state.filters
        );
      }
    },
    addColumFilter: (state, action) => {
      if (Array.isArray(state.filters)) {
        // Find index of existing filter with same column
        const existingIndex = state.filters.findIndex(
          (f) => f.column === action.payload.column
        );

        if (existingIndex !== -1) {
          // Replace existing filter
          state.filters[existingIndex] = action.payload;
        } else {
          // New column - add the filter
          state.filters.push(action.payload);
        }

        // Add column to active columns if not already present
        if (!state.activeColumns.includes(action.payload.column)) {
          state.activeColumns.push(action.payload.column);
        }
      } else {
        console.error(
          "state.filters is not an array in addFilter",
          state.filters
        );
      }
    },
    removeFilter: (state, action) => {
      if (Array.isArray(state.filters)) {
        const removedFilter = state.filters[action.payload];
        state.filters.splice(action.payload, 1);

        if (
          removedFilter &&
          !state.filters.some((f) => f.column === removedFilter.column)
        ) {
          // Remove column from active columns array
          state.activeColumns = state.activeColumns.filter(
            (col) => col !== removedFilter.column
          );
        }
      } else {
        console.error(
          "state.filters is not an array in removeFilter",
          state.filters
        );
      }
    },
    removeFilterByColumn: (state, action) => {
      const columnId = action.payload;
      if (Array.isArray(state.filters)) {
        state.filters = state.filters.filter((f) => f.column !== columnId);
        // Remove from active columns array
        state.activeColumns = state.activeColumns.filter(
          (col) => col !== columnId
        );
      }
    },
    updateFilter: (state, action) => {
      if (Array.isArray(state.filters)) {
        const { index, field, value } = action.payload;
        state.filters[index][field] = value;
      } else {
        console.error(
          "state.filters is not an array in updateFilter",
          state.filters
        );
      }
    },
  },
});

export const {
  setFilters,
  addFilter,
  addColumFilter,
  removeFilter,
  removeFilterByColumn,
  updateFilter,
} = advancedFilterSlice.actions;

export default advancedFilterSlice.reducer;
