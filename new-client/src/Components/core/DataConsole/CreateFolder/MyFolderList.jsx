import React, { useEffect } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { AiOutlineFolder, AiOutlineColumnHeight, AiOutlineFilter, AiOutlineDownload } from "react-icons/ai";
import { Button } from "@mui/material";
import { useDispatch } from 'react-redux'
import { setHeadingTitle } from '../../../../redux/Slices/HeadingTitle'
import { useTheme } from '../../../../ThemeContext'
import PageLayout from "../../../Common/PageLayout";
import { FiEdit } from "react-icons/fi";

const columns = [
  { field: "id", headerName: "No.", width: 70 },
  {
    field: "folder",
    headerName: "Folders",
    width: 180,
    renderCell: (params) => (
      <div className="flex items-center gap-2">
        <AiOutlineFolder className="text-black" />
        <a href="#" className="text-blue-500 hover:underline">
          {params.value}
        </a>
      </div>
    ),
  },
  { field: "description", headerName: "Description", width: 250 },
  {
    field: "access",
    headerName: "Access",
    width: 120,
    renderCell: (params) => (
      <div className="flex items-center gap-2">
        <a
          href="#"
          className={`hover:underline ${params.value === "Public" ? "text-green-500" : "text-red-500"}`}
        >
          {params.value}
        </a>
        <FiEdit className="cursor-pointer text-gray-500 hover:text-black" />
      </div>
    ),
  },
];
const rows = [
  { id: 1, folder: "Folder", description: "This is a folder", access: "Public" },
  { id: 2, folder: "Folder", description: "This is a folder", access: "Private" },
  { id: 3, folder: "Folder", description: "This is a folder", access: "Private" },
  { id: 4, folder: "Folder", description: "This is a folder", access: "Public" },
  { id: 5, folder: "Folder", description: "This is a folder", access: "Public" },
  { id: 6, folder: "Folder", description: "This is a folder", access: "Private" },
  { id: 7, folder: "Folder", description: "This is a folder", access: "Public" },
  { id: 8, folder: "Folder", description: "This is a folder", access: "Public" },
];

const exportToCSV = () => {
  const csvContent = [
    ["No.", "Folder", "Description", "Access"], // Headers
    ...rows.map(row => [row.id, row.folder, row.description, row.access]) // Data rows
  ].map(e => e.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "folders.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const FolderTable = () => {
  const { colorPalette, selectedColor, textBlackColor, textWhiteColor } = useTheme();
  const dispatch = useDispatch();

  useEffect(() => {
      dispatch(setHeadingTitle('Create Folder'));
    }, [])

  const backgroundColor = colorPalette[selectedColor]["100"];
  const textColor = colorPalette[selectedColor]["900"];
  const actionColor = colorPalette[selectedColor]["400"];
  const borderColor = colorPalette[selectedColor]["500"];
  const lightbackground = colorPalette[selectedColor]["200"];

  return (
    <PageLayout>
      <div className="p-4 font-plus-jakarta">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button variant="contained" sx={{ backgroundColor: actionColor, color: textWhiteColor }} startIcon={<AiOutlineColumnHeight />}>
              Columns
            </Button>
            <Button variant="contained" sx={{ backgroundColor: actionColor, color: textWhiteColor }} startIcon={<AiOutlineFilter />}>
              Filters
            </Button>
            <Button variant="contained" sx={{ backgroundColor: actionColor, color: textWhiteColor }} startIcon={<AiOutlineDownload />} onClick={exportToCSV}>
              Export
            </Button>
          </div>
        </div>
        <div className="h-auto overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={5}
            checkboxSelection={false}

            disableSelectionOnClick
            components={{ Toolbar: GridToolbar }}
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor,
                color: textColor,
              },
              '& .MuiDataGrid-container--top [role=row], & .MuiDataGrid-container--bottom [role=row]': {
                backgroundColor: lightbackground, // Applying light background to top and bottom rows
              },
              '& .MuiButton-root': {
                backgroundColor: actionColor,
                color: textWhiteColor,
              }
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};
export default FolderTable;
