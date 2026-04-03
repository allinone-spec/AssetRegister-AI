import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
} from "@mui/material";
import { FaEdit, FaTrash, FaFileCsv, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";
import { TablePagination } from "@mui/material";
import PageLayout from "../../../Common/PageLayout";

const UserTable = () => {
  const [view, setView] = useState("table"); // Toggle between "table" and "card"
  const [filterValue, setFilterValue] = useState(""); // Filter input
  const [filterColumn, setFilterColumn] = useState("name"); // Column to filter
  const [filterType, setFilterType] = useState("include"); // Filter type (Include/Contain)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [data, setData] = useState([
    { id: 1, name: "Scooby", email: "scooby123@gmail.com", mobile: "9897101340", role: "Admin" },
    { id: 2, name: "Rashmi", email: "rashmi123@gmail.com", mobile: "9898070670", role: "User" },
    { id: 3, name: "Aishwarya", email: "aishwarya123@gmail.com", mobile: "9697101340", role: "HR" },
    { id: 4, name: "Shaggy", email: "shaggy123@gmail.com", mobile: "9999901340", role: "User" },
    { id: 5, name: "Velma", email: "velma123@gmail.com", mobile: "9787601340", role: "HR" },
    { id: 6, name: "Fred", email: "fred123@gmail.com", mobile: "9117101340", role: "Admin" },
    { id: 7, name: "Daphne", email: "daphne123@gmail.com", mobile: "9447101340", role: "User" },
  ]);

  const handleExport = (type) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    if (type === "csv") XLSX.writeFile(wb, "users.csv");
    else if (type === "excel") XLSX.writeFile(wb, "users.xlsx");
  };

  const handleEdit = (id) => {
    alert(`Edit user with ID: ${id}`);
  };

  const handleDelete = (id) => {
    setData(data.filter((user) => user.id !== id));
  };

  const handleFilter = (item) => {
    const value = item[filterColumn].toLowerCase();
    const searchValue = filterValue.toLowerCase();

    if (filterType === "include") {
      return value.includes(searchValue);
    } else if (filterType === "contain") {
      return value.startsWith(searchValue);
    }
    return true;
  };

  const filteredData = data.filter(handleFilter);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (

    <PageLayout>
      <div style={{ padding: "20px" }}>
        {/* Filter Section */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <FormControl size="small">
            <InputLabel>Column</InputLabel>
            <Select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="mobile">Mobile</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Filter Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="include">Include</MenuItem>
              <MenuItem value="contain">Contain</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Filter Value"
            variant="outlined"
            size="small"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />

          {/* Export Buttons */}
          <Button
            variant="outlined"
            startIcon={<FaFileCsv />}
            onClick={() => handleExport("csv")}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FaFileExcel />}
            onClick={() => handleExport("excel")}
          >
            Export Excel
          </Button>
        </div>

        {/* Table View */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow style={{ backgroundColor: "#E8EAF6" }}>
                <TableCell>S.No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.mobile}</TableCell>
                    <TableCell>
                      <FormControl size="small" variant="outlined">
                        <Select
                          value={row.role}
                          onChange={(e) => {
                            const updatedData = [...data];
                            const itemIndex = updatedData.findIndex(
                              (item) => item.id === row.id
                            );
                            updatedData[itemIndex].role = e.target.value;
                            setData(updatedData);
                          }}
                        >
                          <MenuItem value="Admin">Admin</MenuItem>
                          <MenuItem value="User">User</MenuItem>
                          <MenuItem value="HR">HR</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FaEdit
                        style={{ cursor: "pointer", color: "blue", marginRight: "10px" }}
                        onClick={() => handleEdit(row.id)}
                      />
                      <FaTrash
                        style={{ cursor: "pointer", color: "red" }}
                        onClick={() => handleDelete(row.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 15]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </div>
    </PageLayout>

  );
};

export default UserTable;
