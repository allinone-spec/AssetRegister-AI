import React, { useState, useMemo } from "react";
import { useDispatch } from 'react-redux';
import { setHeadingTitle } from '../../../../redux/Slices/HeadingTitle';
import { CSVLink } from "react-csv";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper } from "@mui/material";
import { useTheme } from "../../../../ThemeContext";

const fileData = [
    { id: 1, fileName: "index", fileType: "html", filePath: "/src", folder: { folderName: "IT Am Expert", folderType: "Public", user: { firstName: "Abhishek", lastName: "yadav", email: "abhi@gmail.com" } }, createdBy: "default", createdTime: "2025-02-19 03:32:17" },
    { id: 2, fileName: "monthly-reports", fileType: "monthly-sales", filePath: "/src", folder: { folderName: "IT Am Expert", folderType: "Public", user: { firstName: "Abhishek", lastName: "yadav", email: "abhi@gmail.com" } }, createdBy: "default", createdTime: "2025-02-22 03:48:55" },
    { id: 3, fileName: "employee-details", fileType: "employee", filePath: "/src", folder: { folderName: "IT Am Expert", folderType: "Public", user: { firstName: "Abhishek", lastName: "yadav", email: "abhi@gmail.com" } }, createdBy: "default", createdTime: "2025-02-22 03:48:55" },
];

const FileList = () => {
    const dispatch = useDispatch();
    const { colorPalette, selectedColor, bgColor } = useTheme();
    const { layoutTextColor, backgroundColor } = bgColor;

    dispatch(setHeadingTitle('📁 My Folder/Reports/File List'));

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

    const filteredData = useMemo(() => fileData.filter(file =>
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.fileType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.folder.folderName.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (order === "asc" ? a[orderBy] > b[orderBy] : a[orderBy] < b[orderBy]) ? 1 : -1), [searchQuery, orderBy, order]);

    const paginatedData = useMemo(() => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredData, page, rowsPerPage]);

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "FileList");
        XLSX.writeFile(wb, "FileList.xlsx");
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.autoTable({
            head: [["File Name", "File Type", "File Path", "Folder Name", "Folder Type", "Created By", "Created Time", "User"]],
            body: filteredData.map(file => [file.fileName, file.fileType, file.filePath, file.folder.folderName, file.folder.folderType, file.createdBy, new Date(file.createdTime).toLocaleString(), `${file.folder.user.firstName} ${file.folder.user.lastName}`])
        });
        doc.save("FileList.pdf");
    };

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="flex justify-between mb-4">
                <TextField label="Search Files" variant="outlined" value={searchQuery} onChange={handleSearch} />
                <div className="space-x-2">
                    <Button variant="outlined" onClick={exportToExcel}>Export Excel</Button>
                    <CSVLink data={filteredData} filename="FileList.csv">
                        <Button variant="outlined">Export CSV</Button>
                    </CSVLink>
                    <Button variant="outlined" onClick={exportToPDF}>Export PDF</Button>
                </div>
            </div>
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {["File Name", "File Type", "File Path", "Folder Name", "Folder Type", "Created By", "Created Time", "User"].map((header, index) => (
                                    <TableCell key={index} onClick={() => handleSort(header.toLowerCase().replace(/\s+/g, ""))} style={{ cursor: "pointer" }}>{header}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedData.map(file => (
                                <TableRow key={file.id} hover>
                                    <TableCell>{file.fileName}</TableCell>
                                    <TableCell>{file.fileType}</TableCell>
                                    <TableCell>{file.filePath}</TableCell>
                                    <TableCell>{file.folder.folderName}</TableCell>
                                    <TableCell>{file.folder.folderType}</TableCell>
                                    <TableCell>{file.createdBy}</TableCell>
                                    <TableCell>{new Date(file.createdTime).toLocaleString()}</TableCell>
                                    <TableCell>{file.folder.user.firstName} {file.folder.user.lastName}</TableCell>
                                </TableRow>
                            ))}
                            {paginatedData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">🚫 No Files Available</TableCell>
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

export default FileList;


{/* <>
    {query.rule === "Duplicate records by selected Column(s)" && (
        <FormControl fullWidth>
            <InputLabel>Select Column(s)</InputLabel>
            <Select
                multiple
                value={query.columnnames || []}
                onChange={(e) => handleRuleChange(queryIndex, 'columnnames', e.target.value)}
                renderValue={(selected) => selected.join(', ')}
            >
                {columnName.map((col) => (
                    <MenuItem key={col} value={col}>
                        <Checkbox checked={query.columnnames?.includes(col)} />
                        {col}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )}

    {["Keep records by Column(s) values", "Remove records by Column(s) values"].includes(query.rule) && (
        <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
                <InputLabel>Select Column</InputLabel>
                <Select
                    value={query.column}
                    onChange={(e) => handleRuleChange(queryIndex, 'column', e.target.value)}
                >
                    {columnName.map((col) => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select
                    value={query.operator}
                    onChange={(e) => handleRuleChange(queryIndex, 'operator', e.target.value)}
                >
                    {operators.map((op) => (
                        <MenuItem key={op} value={op}>{op}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <TextField
                label="Value"
                value={query.value}
                onChange={(e) => handleRuleChange(queryIndex, 'value', e.target.value)}
                fullWidth
            />
        </Box>
    )}

    {query.rule === "Duplicate records for a column keeping the latest by a date-based column" && (
        <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
                <InputLabel>Select Duplicate Column</InputLabel>
                <Select
                    value={query.duplicateColumn}
                    onChange={(e) => handleRuleChange(queryIndex, 'duplicateColumn', e.target.value)}
                >
                    {columnName.map((col) => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel>Select Date Column</InputLabel>
                <Select
                    value={query.dateColumn}
                    onChange={(e) => handleRuleChange(queryIndex, 'dateColumn', e.target.value)}
                >
                    {dateColumns.map((col) => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    )}

</> */}