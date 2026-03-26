import { createSlice } from "@reduxjs/toolkit";

const getInitialFolderData = () => {
    try {
        const storedData = localStorage.getItem("folderData");
        return storedData ? JSON.parse(storedData) : {};
    } catch (error) {
        console.error("Error parsing folderData from localStorage:", error);
        return {};
    }
};

const initialState = {
    folderData: getInitialFolderData(),
};

const folderDataSlice = createSlice({
    name: "folderData",
    initialState,
    reducers: {
        setFolderData: (state, action) => {
            state.folderData = action.payload || {};
            try {
                localStorage.setItem("folderData", JSON.stringify(state.folderData));
            } catch (error) {
                console.error("Error saving folderData to localStorage:", error);
            }
        },
    },
});

export const { setFolderData } = folderDataSlice.actions;
export default folderDataSlice.reducer;
