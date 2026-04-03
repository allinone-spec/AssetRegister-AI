import React from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { AiOutlineFolder, AiOutlineColumnHeight, AiOutlineFilter, AiOutlineDownload } from "react-icons/ai";
import { Button } from "@mui/material";
import { useDispatch } from 'react-redux'
import { setHeadingTitle } from '../../../../redux/Slices/HeadingTitle'
import { useTheme } from '../../../../ThemeContext'
import PageLayout from "../../../Common/PageLayout";
import { FiEdit } from "react-icons/fi";
import { PiExport } from "react-icons/pi"
import { PiColumnsFill } from "react-icons/pi";

const columns = [
    { field: "dsbyds", headerName: "Ds By Ds", width: 150 },
    {
        field: "job1",
        headerName: "Job1",
        width: 150,
        renderCell: (params) => (
            <a href="#" className="text-blue-500 hover:underline">
                {params.value}
            </a>
        ),
    },
    { field: "job2", headerName: "Job2", width: 150 },
    { field: "job3", headerName: "Job3", width: 150 },
    { field: "ds4", headerName: "DS4", width: 150 },
    { field: "ds5", headerName: "DS5", width: 150 },
    { field: "ds6", headerName: "DS6", width: 150 },
    { field: "ds7", headerName: "DS7", width: 150 },


];

const rows = [
    { id: 1, job: "Job A", description: "This is Job A", xyz: "Data 1" },

];



const exportToCSV = () => {
    const csvContent = [
        ["No.", "Folder", "Description", "Access"],
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

const DS_BY_DS = () => {
    const { colorPalette, selectedColor, textBlackColor, textWhiteColor } = useTheme();
    const dispatch = useDispatch();
    dispatch(setHeadingTitle('DS BY DS'));

    const backgroundColor = colorPalette[selectedColor]["100"];
    const textColor = colorPalette[selectedColor]["900"];
    const actionColor = colorPalette[selectedColor]["400"];
    const borderColor = colorPalette[selectedColor]["500"];
    const lightbackground = colorPalette[selectedColor]["200"];

    return (
        <PageLayout>
            <div className="p-4 font-plus-jakarta">
                <section className="flex  w-[100%] mx-auto justify-between  border-b-[1px] border-[#00000038]"
                >
                    <h2 className="text-lg font-semibold mb-4 text-purple-600">DS BY DS</h2>
                    <div className="flex justify-between space-x-5 items-center mb-4">

                        <input
                            type="text"
                            placeholder="Search"
                            className="px-4 py-2 border rounded-3xl w-64 bg-[#EAEDFB]"
                            style={{ boxShadow: "0px 4px 4px 0px #00000017" }}
                        />
                        <select className="px-4 py-2 border rounded-3xl bg-[#EAEDFB]"
                            style={{ boxShadow: "0px 4px 4px 0px #00000017" }}

                        >


                            <option>Object</option>
                        </select>
                    </div>

                </section>
                <div className="flex gap-4 mb-4 mt-3">
                    <button className="border px-4 py-2 bg-[#EAEDFB] rounded-3xl"
                        style={{ boxShadow: "0px 4px 4px 0px #00000017" }}

                    >Table Properties 1</button>
                    <button className="border px-4 bg-[#EAEDFB] py-2 rounded-3xl"
                        style={{ boxShadow: "0px 4px 4px 0px #00000017" }}

                    >Table Properties 2</button>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-10 text-black font-plus-jakarta">
                        <Button sx={{ color: textBlackColor }} startIcon={<PiColumnsFill />}>
                            Column
                        </Button>
                        <Button sx={{ color: textBlackColor }} startIcon={<AiOutlineFilter />}>
                            Filter
                        </Button>
                        <Button sx={{ color: textBlackColor }} startIcon={<PiExport />} onClick={exportToCSV}>
                            Export
                        </Button>
                    </div>
                </div>
                <div className="h-auto overflow-y-scroll" style={{ scrollbarWidth: "none",boxShadow: "-6px -3px 7.2px 0px #00000012" }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        pageSize={5}
                        checkboxSelection={false}
                        pagination={false}
                        hideFooter={false}
                        disableSelectionOnClick
                        borderColor={false}
                        components={{ Toolbar: GridToolbar }}
                        sx={{
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor,
                                color: textColor,
                            },
                            '& .MuiDataGrid-container--top [role=row], & .MuiDataGrid-container--bottom [role=row]': {
                                backgroundColor: "white", // Applying light background to top and bottom rows
                            },
                            '& .MuiButton-root': {
                                backgroundColor: actionColor,
                                color: textWhiteColor,
                            }
                            ,
                            "& .MuiDataGrid-root": {
                                border: "none",
                            },
                            "& .MuiDataGrid-cell": {
                                borderBottom: "none",
                            }
                        }}
                            />
                </div>
            </div>
        </PageLayout>
    );
};
export default DS_BY_DS;
