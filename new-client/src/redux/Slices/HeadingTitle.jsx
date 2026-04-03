import { createSlice } from "@reduxjs/toolkit";

var initialState = {
  headingTitle: "Create New Dashboard",
};

const headingTitleSlice = createSlice({
  name: "title",
  initialState: initialState,
  reducers: {
    setHeadingTitle: (state, action) => {
      state.headingTitle = action.payload;
    },
  },
});

export const { setHeadingTitle } = headingTitleSlice.actions;
export default headingTitleSlice.reducer;
