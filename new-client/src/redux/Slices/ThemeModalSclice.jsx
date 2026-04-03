import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isOpen: false,
};

const themeModalSlice = createSlice({
  name: "themeModal",
  initialState,
  reducers: {
    openModal: (state) => {
      state.isOpen = true;
    },
    closeModal: (state) => {
      state.isOpen = false;
    },
    toggleModal: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

export const { openModal, closeModal, toggleModal } = themeModalSlice.actions;
export default themeModalSlice.reducer;
