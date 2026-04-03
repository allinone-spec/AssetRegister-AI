import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  foldersData: {
    folderName: "",
    folderType: "Public",
    parentFolderId: 0,
    userIds: [],
    groupIds: [],
    objectIds: []
  }
};

const folderSlice = createSlice({
  name: "folder",
  initialState,
  reducers: {
    setFoldersData: (state, action) => {
      const { field, value } = action.payload;
      if (["userIds", "groupIds", "objectIds"].includes(field)) {
        state.foldersData[field] = Array.isArray(value) ? value : [value]
      } else if (field in state.foldersData) {
        state.foldersData[field] = value;
      }
    },
  },
});

export const { setFoldersData} = folderSlice.actions;
export default folderSlice.reducer;
