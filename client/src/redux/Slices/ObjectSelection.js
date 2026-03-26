import { createSlice } from "@reduxjs/toolkit";

const selectedObjectSlice = createSlice({
  name: "selectedObject",
  initialState: {
    value: "",
    valueName: "",
  },
  reducers: {
    setSelectedObject: (state, action) => {
      state.value = action.payload;
    },
    setSelectedObjectName: (state, action) => {
      state.valueName = action.payload;
    },
    clearSelectedObject: (state) => {
      state.value = "";
    },
  },
});

export const { setSelectedObject, clearSelectedObject, setSelectedObjectName } =
  selectedObjectSlice.actions;
export default selectedObjectSlice.reducer;
