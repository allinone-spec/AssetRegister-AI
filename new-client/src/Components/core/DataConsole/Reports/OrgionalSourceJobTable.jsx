import React, { useCallback, useEffect, useMemo, useState } from "react";
import {  Button } from "@mui/material";
import { useDispatch, useSelector } from 'react-redux'
import { setHeadingTitle } from '../../../../redux/Slices/HeadingTitle'
import { useTheme } from '../../../../ThemeContext'
import PageLayout from "../../../Common/PageLayout";
import { getRequest } from "../../../../Service/Console.service";
import { useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { fieldsArray } from "../../../../Data/FileExplorerData";
import { SaveFilterModal } from "../../../Common/SaveFilterModal";
import * as XLSX from "xlsx";

import { HiMiniViewColumns } from "react-icons/hi2";
import FilterPermissionModal from "../../../Common/FilterpermissionModal";
import ReactPaginate from "react-paginate";



const OrgionalSourceJobTable = () => {
    const { colorPalette, selectedColor, textWhiteColor ,isCustom,bgColor} = useTheme();
  const { layoutTextColor, backgroundColor } = bgColor;

    const dispatch = useDispatch();
    const { folderData } = useSelector((state) => state.folderData)
    const [activeFilter, setActiveFilter] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(null);
    const [saveFilter, setSaveFilter] = useState(false)

    const { jobName } = useParams()
    useEffect(() => {
    dispatch(setHeadingTitle(`Orgional Resource / ${jobName} `));
  }, [jobName])
    const actionColor =isCustom ? isCustom : colorPalette[selectedColor]["400"];
    const [sourceData, setSourceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({});
    const [exportType, setExportType] = useState("");
    const [isPermissionModal, setIsPermissionModal] = useState(false);
    const [permissionField, setPermissionField] = useState(fieldsArray);
    const [selectedColumns, setSelectedColumns] = useState(fieldsArray);


    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10; 
    useEffect(() => {
        fetchSourceData();
    }, []);

    const fetchSourceData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRequest(`/table/getAC/${jobName}/data`);
            if (response?.status === 200) {
                setSourceData(response.data || []);
                console.log("Source Data    getAC:", response.data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setSourceData([]);
        } finally {
            setLoading(false);
        }
    }, [jobName]);


    //  filtered Logic     


    const filteredData = useMemo(() => {
        return sourceData.filter(row =>
            filters.global
                ? Object.values(row).some(value =>
                    value?.toString().toLowerCase().includes(filters.global.toLowerCase())
                )
                : true
        ).filter(row =>
            Object.entries(filters).every(([key, value]) =>
                key !== "global" ? (value ? row[key]?.toString().toLowerCase().includes(value.toLowerCase()) : true) : true
            )
        );
    }, [sourceData, filters]);

    const tableKeys = [];
    {
        filteredData.length > 0 && (
            tableKeys.push(...Object.keys(filteredData[0]))
        )

    }

    useEffect(() => {
        function filterData(dataArray, formattedData) {
            return formattedData.filter(item => !dataArray.includes(item));
        }
        const filteredData = filterData(selectedColumns, tableKeys);
    }, [isPermissionModal, selectedColumns]);





    const handleFilterChange = useCallback((e, key) => {
        setFilters((prevFilters) => ({ ...prevFilters, [key]: e.target.value }));
    }, []);

    const exportToExcel = useCallback(() => {
        if (!filteredData || filteredData.length === 0) return;

        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Files");
        XLSX.writeFile(workbook, "FileList.xlsx");
    }, [filteredData]);


    const exportToPDF = useCallback(() => {
        if (!filteredData || filteredData.length === 0) return;

        const doc = new jsPDF();
        const keys = Object.keys(filteredData[0] || {});
        const headers = [keys];
        const body = filteredData.map(item => keys.map(key => item[key] || "")); // Ensure no undefined values

        doc.autoTable({
            head: headers,
            body: body,
            startY: 10,
            margin: { top: 10 },
            // pageBreak: 'auto', // Ensure proper pagination
            styles: {
                cellPadding: 1.5,
                overflow: 'linebreak',
                valign: 'middle',
                halign: 'center',
                lineColor: [0, 0, 0],
                lineWidth: 0.2
            },
            pageBreak: 'always',
            columnStyles: {
                0: { cellWidth: 50 }, // Adjust as needed for specific columns
            },
            didDrawCell: (data) => {
                // Ensure rows don't exceed the page height
                if (data.row.height > doc.internal.pageSize.height - 20) {
                    console.warn("Row height exceeds page size, consider splitting content.");
                }
            }
        });

        doc.save("DataDetails.pdf");
    }, [filteredData])


    const exportToCSV = useCallback(() => {
        if (!filteredData || filteredData.length === 0) return;
        const csvContent = [
            Object.keys(filteredData[0]).join(","), // Header row
            ...filteredData.map(row =>
                Object.values(row).map(value => `"${value}"`).join(",") // Enclose values in quotes
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredData]);

    const handleDownload = useCallback(
        (type) => {
            if (!type) return;
            if (type === "Excel") exportToExcel();
            if (type === "CSV") exportToCSV();
            if (type === "PDF") exportToPDF();
        },
        [exportToExcel, exportToPDF, exportToCSV]
    );

    const openColumnModal = () => {
        setIsPermissionModal((prevState) => !prevState);

    }


    const openFilterSaveModal = () => {
        setSaveFilter(true)
    }

    const closeFilterSaveModal = () => {
        setSaveFilter(false)
    }



    // Pagination Logic
    const pageCount = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const handlePageClick = ({ selected }) => {
        setCurrentPage(selected);
    };


    

    return (
        <PageLayout>
            <div className="p-4 font-plus-jakarta">
                <div className="flex justify-between items-center mb-4 py-2">
                    <div className="flex space-x-10 items-center relative">
                        <input
                            type="text"
                            placeholder="Search"
                            className="rounded pl-2 py-2"
                            style={{ backgroundColor }}
                            onChange={(e) => handleFilterChange(e, "global")}
                        />
                        <div
                            onClick={(e) => openColumnModal(e)}
                            className="flex justify-center cursor-pointer items-center gap-3 p-2 h-full">
                            <HiMiniViewColumns />
                            <span>Column</span>
                        </div>
                        {isPermissionModal && (
                            <section className="bg-white transtion">
                                <FilterPermissionModal
                                    isPermissionModal={isPermissionModal}
                                    permissionField={permissionField}
                                    onClose={() => setIsPermissionModal(false)}
                                    selectedColumns={selectedColumns}
                                    setSelectedColumns={setSelectedColumns}

                                />
                            </section>
                        )}

                    </div>
                    <div className="flex gap-5">
                        <div className="flex justify-end">
                            <select
                                className="border border-gray-300 rounded p-2 px-4"
                                value={exportType}
                                onChange={(e) => {
                                    const selectedType = e.target.value;
                                    setExportType(selectedType);
                                    handleDownload(selectedType);
                                }}
                            >
                                <option value="">Select Export Type</option>
                                <option value="CSV">CSV</option>
                                <option value="Excel">Excel</option>
                                <option value="PDF">PDF</option>
                            </select>
                        </div>
                        <Button sx={{ color: textWhiteColor, backgroundColor: actionColor }} onClick={openFilterSaveModal}>
                            Save View
                        </Button>
                    </div>
                </div>
                <div>
            <div className="overflow-x-auto min-h-[30vh] h-auto" style={{ msOverflowStyle: "none" }}>
                <table className="min-w-full border-collapse border border-gray-200">
                    <thead>
                        <tr>
                            {fieldsArray
                                ?.filter((formattedKey) => selectedColumns.includes(formattedKey))
                                .map((formattedKey, index) => (
                                    <th
                                        key={index}
                                        className="p-2 border border-gray-300 text-left w-full min-w-60 relative"
                                        style={{ backgroundColor: actionColor }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="text-white cursor-pointer"
                                                onClick={() => setActiveFilter(formattedKey)}
                                            >
                                                {formattedKey}
                                            </span>
                                        </div>
                                        {(activeFilter === formattedKey || filters[formattedKey]) && (
                                            <div className="absolute top-full left-0 w-full bg-white shadow-lg p-2 border rounded">
                                                <input
                                                    type="text"
                                                    className="border rounded p-1 text-sm w-full"
                                                    placeholder={`Filter ${formattedKey}`}
                                                    value={filters[formattedKey] || ""}
                                                    onChange={(e) => handleFilterChange(e, formattedKey)}
                                                />
                                            </div>
                                        )}
                                    </th>
                                ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={fieldsArray.length}>Loading....</td></tr>
                        ) : paginatedData.length !== 0 ? (
                            paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-100">
                                    {Object.entries(row)
                                        .filter(([key]) => selectedColumns.includes(key))
                                        .map(([key, value], i) => (
                                            <td key={i} className="p-2 border border-gray-300">
                                                {value}
                                            </td>
                                        ))}
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={fieldsArray.length}>Data Not Found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Component */}
            {pageCount > 1 && (
                <ReactPaginate
                    previousLabel={"Previous"}
                    nextLabel={"Next"}
                    breakLabel={"..."}
                    pageCount={pageCount}
                    marginPagesDisplayed={2}
                    pageRangeDisplayed={5}
                    onPageChange={handlePageClick}
                    containerClassName={"flex justify-center items-center space-x-2 mt-4"}
                    pageClassName={"border px-3 py-1 rounded-md hover:bg-gray-200"}
                    activeClassName={"bg-blue-500 text-white"}
                    previousClassName={"border px-3 py-1 rounded-md hover:bg-gray-200"}
                    nextClassName={"border px-3 py-1 rounded-md hover:bg-gray-200"}
                    breakClassName={"border px-3 py-1 rounded-md"}
                    disabledClassName={"opacity-50 cursor-not-allowed"}
                />
            )}
        </div>
            </div>
            <SaveFilterModal
                jobName={jobName}
                closeFilterSaveModal={closeFilterSaveModal}
                saveFilter={saveFilter}
                filter={filters}
                folderData={folderData}
                dataSource='AC'
            />

        </PageLayout>
    );
};
export default OrgionalSourceJobTable;
