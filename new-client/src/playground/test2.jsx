import React, { useState } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TablePagination, Button, Card, IconButton, Typography,
} from "@mui/material";
import { FaEdit, FaTrash, FaFileCsv, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";
import EditModal from "../../../Common/EditModel";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { groupsData } from "../data";
import { useTheme } from "../../../../ThemeContext";


const GroupsTable = () => {
    const { colorPalette, selectedColor } = useTheme();
    const [data, setData] = useState(groupsData);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [editingData, setEditingData] = useState(null);
    const [deleteData, setDeleteData] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const backgroundColor = colorPalette[selectedColor]["200"];
    const textColor = colorPalette[selectedColor]["900"];
    const actionColor = colorPalette[selectedColor]["400"];

    const handleExport = (type) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Permissions");

        if (type === "csv") XLSX.writeFile(wb, "permissions.csv");
        else if (type === "excel") XLSX.writeFile(wb, "permissions.xlsx");
    };

    const handleEdit = (row) => {
        setEditingData(row);
        setEditModalOpen(true);
    };

    const handleDelete = (row) => {
        setDeleteData(row);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        setData(data.filter((row) => row.id !== deleteData.id));
        setDeleteModalOpen(false);
    };

    const handleCloseEditModal = () => setEditModalOpen(false);

    const handleCloseDeleteModal = () => setDeleteModalOpen(false);

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const toggleRowExpansion = (id) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(id)) newExpandedRows.delete(id);
        else newExpandedRows.add(id);
        setExpandedRows(newExpandedRows);
    };

    return (
        <Card sx={{ padding: "20px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <Button
                    variant="outlined"
                    startIcon={<FaFileCsv />}
                    onClick={() => handleExport("csv")}
                    sx={{ color: actionColor, borderColor: actionColor }}

                >
                    Export CSV
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<FaFileExcel />}
                    onClick={() => handleExport("excel")}
                    sx={{ color: actionColor, borderColor: actionColor }}
                >
                    Export Excel
                </Button>
            </div>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor, color: textColor }}>
                            <TableCell>S.No.</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Mobile</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row) => (
                                <React.Fragment key={row.id}>
                                    <TableRow>
                                        <TableCell>{row.id}</TableCell>
                                        <TableCell>
                                            {row.name}
                                        </TableCell>
                                        <TableCell>
                                            {row.email}
                                        </TableCell>
                                        <TableCell>
                                            {row.mobile}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton onClick={() => handleEdit(row)}>
                                                <FaEdit style={{ color: actionColor }} />
                                            </IconButton>
                                            <IconButton onClick={() => handleDelete(row)}>
                                                <FaTrash style={{ color: actionColor }} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                    {expandedRows?.has(row.id) && (
                                        <TableRow>
                                            <TableCell colSpan={3}>
                                                <Typography variant="body2">
                                                    <strong>Permissions:</strong>
                                                    <ul>
                                                        {row.permissions.map((perm, index) => (
                                                            <li key={index}>{perm}</li>
                                                        ))}
                                                    </ul>
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 15]}
                component="div"
                count={data.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
            <EditModal
                open={editModalOpen}
                handleClose={handleCloseEditModal}
                data={editingData || {}}
                onSave={(updatedData) =>
                    setData(data.map((row) => (row.id === updatedData.id ? updatedData : row)))
                }
            />
            <DeleteConfirmationModal
                open={deleteModalOpen}
                handleClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
            />
        </Card>
    );
};

export default GroupsTable;
