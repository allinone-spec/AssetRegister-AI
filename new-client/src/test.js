import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Card,
  IconButton,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField,
  Button,
  Grid,
  Box,
  Paper,
} from "@mui/material";
import { FaEdit, FaTrash } from "react-icons/fa";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { xml2json } from "xml-js";
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
  const [exportType, setExportType] = useState("");
  const [filters, setFilters] = useState([]);
  const [columnOptions] = useState(["name", "email", "mobile"]);

  const backgroundColor = colorPalette[selectedColor]["200"];
  const textColor = colorPalette[selectedColor]["900"];
  const actionColor = colorPalette[selectedColor]["400"];

  const handleExport = (type) => {
    if (type === "csv") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Permissions");
      XLSX.writeFile(wb, "permissions.csv");
    } else if (type === "excel") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Permissions");
      XLSX.writeFile(wb, "permissions.xlsx");
    } else if (type === "pdf") {
      const doc = new jsPDF();
      doc.autoTable({ html: "#permissions-table" });
      doc.save("permissions.pdf");
    } else if (type === "xml") {
      const xmlData = json2xml(data);
      const blob = new Blob([xmlData], { type: "application/xml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "permissions.xml";
      link.click();
    }
  };

  const json2xml = (json) => {
    const xml = xml2json(json, { compact: true, spaces: 4 });
    return xml;
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

  // Apply multiple filters
  const applyFilters = () => {
    let filteredData = [...groupsData];

    filters.forEach((filter) => {
      const { column, operation, value, group } = filter;

      if (group === "AND") {
        switch (operation) {
          case "LIKE":
            filteredData = filteredData.filter((row) =>
              row[column]?.toString().includes(value)
            );
            break;
          case "CONTAINS":
            filteredData = filteredData.filter((row) =>
              row[column]?.toString().includes(value)
            );
            break;
          case "EQUALS":
            filteredData = filteredData.filter(
              (row) => row[column] === value
            );
            break;
          case "NOT_EQUAL":
            filteredData = filteredData.filter(
              (row) => row[column] !== value
            );
            break;
          case "LESS_THAN":
            filteredData = filteredData.filter((row) => row[column] < value);
            break;
          case "GREATER_THAN":
            filteredData = filteredData.filter((row) => row[column] > value);
            break;
          default:
            break;
        }
      } else if (group === "OR") {
        switch (operation) {
          case "LIKE":
            filteredData = filteredData.filter((row) =>
              row[column]?.toString().includes(value)
            );
            break;
          case "CONTAINS":
            filteredData = filteredData.filter((row) =>
              row[column]?.toString().includes(value)
            );
            break;
          case "EQUALS":
            filteredData = filteredData.filter(
              (row) => row[column] === value
            );
            break;
          case "NOT_EQUAL":
            filteredData = filteredData.filter(
              (row) => row[column] !== value
            );
            break;
          case "LESS_THAN":
            filteredData = filteredData.filter((row) => row[column] < value);
            break;
          case "GREATER_THAN":
            filteredData = filteredData.filter((row) => row[column] > value);
            break;
          default:
            break;
        }
      }
    });

    setData(filteredData);
  };

  // Add a new filter
  const addFilter = () => {
    setFilters([
      ...filters,
      { column: "", operation: "LIKE", value: "", group: "AND" },
    ]);
  };

  // Remove a filter
  const removeFilter = (index) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  return (
    <Card sx={{ padding: "20px" }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <FormControl variant="outlined" sx={{ minWidth: 120 }}>
          <InputLabel>Export Type</InputLabel>
          <Select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            label="Export Type"
          >
            <MenuItem value="csv">Export CSV</MenuItem>
            <MenuItem value="excel">Export Excel</MenuItem>
            <MenuItem value="pdf">Export PDF</MenuItem>
            <MenuItem value="xml">Export XML</MenuItem>
          </Select>
        </FormControl>
        <IconButton
          onClick={() => handleExport(exportType)}
          sx={{ color: actionColor, borderColor: actionColor }}
        >
          <Typography variant="body2">Export</Typography>
        </IconButton>
      </div>

      {/* Filter Section */}
      <Paper sx={{ padding: "20px", marginBottom: "20px" }}>
        <Typography variant="h6">Filters</Typography>
        <Grid container spacing={2} sx={{ marginTop: "10px" }}>
          {filters.map((filter, index) => (
            <Grid item xs={12} key={index}>
              <Box display="flex" alignItems="center" gap="10px">
                <TextField
                  select
                  label="Column"
                  value={filter.column}
                  onChange={(e) => {
                    const newFilters = [...filters];
                    newFilters[index].column = e.target.value;
                    setFilters(newFilters);
                  }}
                  fullWidth
                >
                  {columnOptions.map((column) => (
                    <MenuItem key={column} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Operation"
                  value={filter.operation}
                  onChange={(e) => {
                    const newFilters = [...filters];
                    newFilters[index].operation = e.target.value;
                    setFilters
                    setFilters(newFilters);
                  }}
                  fullWidth
                >
                  <MenuItem value="LIKE">LIKE</MenuItem>
                  <MenuItem value="CONTAINS">CONTAINS</MenuItem>
                  <MenuItem value="EQUALS">EQUALS</MenuItem>
                  <MenuItem value="NOT_EQUAL">NOT EQUAL</MenuItem>
                  <MenuItem value="LESS_THAN">LESS THAN</MenuItem>
                  <MenuItem value="GREATER_THAN">GREATER THAN</MenuItem>
                </TextField>
                <TextField
                  label="Value"
                  value={filter.value}
                  onChange={(e) => {
                    const newFilters = [...filters];
                    newFilters[index].value = e.target.value;
                    setFilters(newFilters);
                  }}
                  fullWidth
                />
                <TextField
                  select
                  label="Group"
                  value={filter.group}
                  onChange={(e) => {
                    const newFilters = [...filters];
                    newFilters[index].group = e.target.value;
                    setFilters(newFilters);
                  }}
                  fullWidth
                >
                  <MenuItem value="AND">AND</MenuItem>
                  <MenuItem value="OR">OR</MenuItem>
                </TextField>
                <Button onClick={() => removeFilter(index)} variant="outlined" color="error">
                  Remove
                </Button>
              </Box>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button onClick={addFilter} variant="contained" color="primary">
              Add Filter
            </Button>
            <Button onClick={applyFilters} variant="contained" color="secondary" sx={{ ml: 2 }}>
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Section */}
      <TableContainer component={Paper}>
        <Table id="permissions-table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.mobile}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(row)}>
                    <FaEdit color={actionColor} />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row)}>
                    <FaTrash color="red" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Modals */}
      {/* <EditModal open={editModalOpen} handleClose={handleCloseEditModal} data={editingData} /> */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        handleClose={handleCloseDeleteModal}
        handleConfirm={handleConfirmDelete}
      />
    </Card>
  );
};

export default GroupsTable;




// [
//   {
//     "userId": 0,
//     "firstName": "string",
//     "lastName": "string",
//     "middleName": "string",
//     "email": "string",
//     "authentication": "string",
//     "disabled": "string",
//     "accessibleFolders": [
//       {
//         "id": 0,
//         "folderName": "string",
//         "folderType": "Public",
//         "allowedUsers": [
//           "string"
//         ],
//         "allowedGroups": [
//           {
//             "groupId": 0,
//             "groupName": "string",
//             "email": "string",
//             "objectEntities": [
//               {
//                 "objectId": 0,
//                 "objectName": "string",
//                 "email": "string",
//                 "accessibleFolders": [
//                   "string"
//                 ],
//                 "createdBy": "string",
//                 "updatedBy": "string",
//                 "createdTime": "string",
//                 "updatedTime": "string"
//               }
//             ],
//             "disabled": "string",
//             "authentication": "string",
//             "accessibleFolders": [
//               "string"
//             ],
//             "users": [
//               "string"
//             ],
//             "createdBy": "string",
//             "updatedBy": "string",
//             "createdTime": "string",
//             "updatedTime": "string"
//           }
//         ],
//         "allowedObjects": [
//           {
//             "objectId": 0,
//             "objectName": "string",
//             "email": "string",
//             "accessibleFolders": [
//               "string"
//             ],
//             "createdBy": "string",
//             "updatedBy": "string",
//             "createdTime": "string",
//             "updatedTime": "string"
//           }
//         ],
//         "createdBy": "string",
//         "updatedBy": "string",
//         "createdTime": "string",
//         "updatedTime": "string"
//       }
//     ],
//     "groups": [
//       {
//         "groupId": 0,
//         "groupName": "string",
//         "email": "string",
//         "objectEntities": [
//           {
//             "objectId": 0,
//             "objectName": "string",
//             "email": "string",
//             "accessibleFolders": [
//               "string"
//             ],
//             "createdBy": "string",
//             "updatedBy": "string",
//             "createdTime": "string",
//             "updatedTime": "string"
//           }
//         ],
//         "disabled": "string",
//         "authentication": "string",
//         "accessibleFolders": [
//           "string"
//         ],
//         "users": [
//           "string"
//         ],
//         "createdBy": "string",
//         "updatedBy": "string",
//         "createdTime": "string",
//         "updatedTime": "string"
//       }
//     ],
//     "roles": [
//       {
//         "roleId": 0,
//         "permissions": [
//           {
//             "permissionId": 0,
//             "permissionName": "string",
//             "type": "string",
//             "createdBy": "string",
//             "updatedBy": "string",
//             "createdTime": "string",
//             "updatedTime": "string"
//           }
//         ],
//         "roleName": "string",
//         "disabled": "string",
//         "createdBy": "string",
//         "updatedBy": "string",
//         "createdTime": "string",
//         "updatedTime": "string"
//       }
//     ],
//     "objects": [
//       {
//         "objectId": 0,
//         "objectName": "string",
//         "email": "string",
//         "accessibleFolders": [
//           "string"
//         ],
//         "createdBy": "string",
//         "updatedBy": "string",
//         "createdTime": "string",
//         "updatedTime": "string"
//       }
//     ],
//     "createdBy": "string",
//     "updatedBy": "string",
//     "createdTime": "string",
//     "updatedTime": "string",
//     "password": "string"
//   }
// ]