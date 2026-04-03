import React, { useState, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper } from "@mui/material";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useTheme } from "../../../../ThemeContext";
import { getRequest } from "../../../../Service/api.service";
import { Link, useLocation, useParams } from "react-router-dom";

const CommonTable = ({title,}) => {
    const { folderId } = useParams()
    const location = useLocation();
    const dispatch = useDispatch();
    const [exportType, setExportType] = useState("");
    const [fileDataList, setFileDataList] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const { colorPalette, selectedColor, bgColor } = useTheme();
    const { layoutTextColor, backgroundColor } = bgColor;
    const { folderName } = location?.state


    useEffect(() => {
        dispatch(setHeadingTitle(`📁 ${folderName} `));
    }, [dispatch]);


    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [orderBy, setOrderBy] = useState("fileName");
    const [order, setOrder] = useState("asc");

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => { setRowsPerPage(+event.target.value); setPage(0); };

    const handleSort = (field) => {
        const isAsc = orderBy === field && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(field);
    };

    useEffect(() => {

        const getFiles = async () => {
            try {
                setIsLoading(true);
                const response = await getRequest(`/view/${folderId}/get`)
                if (response.status === 200) {
                    setFileDataList(response?.data || [])

                    setIsLoading(false);
                }
            } catch (error) {
                console.error("error", error)
                setFileDataList([])
                setIsLoading(false);
            }
        }
        if (folderId) {
            getFiles()
        }
    }, [folderId])
    const filteredData = useMemo(() => fileDataList?.filter(file =>
        file.folder.folderName.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (order === "asc" ? a[orderBy] > b[orderBy] : a[orderBy] < b[orderBy]) ? 1 : -1), [searchQuery, orderBy, order, fileDataList]);

    const paginatedData = useMemo(() => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredData, page, rowsPerPage]);


    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(fileDataList);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Files");
        XLSX.writeFile(workbook, "FileList.xlsx");
    };


    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.autoTable({
            head: [["File Name", "File Type", "File Path", "Folder Name", "Folder Type", "Created By", "Created Time", "User"]],
            body: fileDataList?.map((file) => [
                file.fileName,
                file.fileType,
                file.filePath,
                file.folder.folderName,
                file.folder.folderType,
                file.createdBy,
                new Date(file.createdTime).toLocaleString(),
                `${file.folder.user.firstName} ${file.folder.user.lastName}`,
            ]),
        });
        doc.save("FileList.pdf");
    };

    const handleExport = () => {
        if (exportType === "Excel") exportToExcel();
        if (exportType === "PDF") exportToPDF();
    };


    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="flex justify-between mb-4">
                <TextField
                 label="Search Files"
                  variant="outlined"
                   value={searchQuery}
                    onChange={handleSearch} />
                <div className="flex justify-end">
                    <select
                        className="border border-gray-300 rounded p-2"
                        value={exportType}
                        onChange={(e) => setExportType(e.target.value)}
                    >
                        <option value="">Select Export Format</option>
                        <option value="CSV">CSV</option>
                        <option value="Excel">Excel</option>
                        <option value="PDF">PDF</option>
                    </select>
                    {exportType === "CSV" ? (
                        <CSVLink
                            data={fileDataList}
                            filename="FileList.csv"
                            className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            Download
                        </CSVLink>
                    ) : (
                        <button
                            className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
                            onClick={handleExport}
                        >
                            Download
                        </button>
                    )}
                </div>
            </div>

            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {["View Name", "Folder Name", "Folder Type", "Created By", "Created Time", "User", "Action"].map((header, index) => (
                                    <TableCell key={index} onClick={() => handleSort(header.toLowerCase().replace(/\s+/g, ""))} style={{ cursor: "pointer", backgroundColor: backgroundColor || "", color: layoutTextColor || "#00000" }}>{header}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedData.map(file => (
                                <TableRow key={file.id} hover>
                                    <TableCell>{file.viewName}</TableCell>
                                    <TableCell>{file.folder.folderName}</TableCell>
                                    <TableCell>{file.folder.folderType}</TableCell>
                                    <TableCell>{file.createdBy}</TableCell>
                                    <TableCell>{new Date(file.createdTime).toLocaleString()}</TableCell>
                                    <TableCell>{file.folder.user.firstName} {file.folder.user.lastName}</TableCell>

                                    <TableCell className="cursor-pointer font-bold text-blue-400 italic">
                                        {/* <Link to={`/data-console/reports/folder-list-filter/${file?.viewName}`} */}
                                        <Link to={`/data-console/reports/folder-list-filter?viewId=${file?.id}`}
                                            state={JSON.parse(file.filters)}>
                                            Go to Filters
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginatedData.length === 0 && (
                                <TableRow>
                                    {
                                        isLoading ?
                                            <span className="flex items-center justify-center gap-2">
                                                <svg
                                                    className="animate-spin h-5 w-5 text-green"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8v8H4z"
                                                    ></path>
                                                </svg>
                                                Loading...
                                            </span>
                                            :
                                            <TableCell colSpan={8} align="center">🚫 No Files Available</TableCell>
                                    }
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={filteredData.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />
            </Paper>
        </div>
    );
};

export default CommonTable;
