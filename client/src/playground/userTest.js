import React, { useEffect, useState } from "react";
import {
  TablePagination, Button, Select, MenuItem, Card, CardContent, CardActions, Typography,
  IconButton, Switch, FormControlLabel,
  Chip,
} from "@mui/material";
import { FaEdit, FaTrash, FaFileCsv, FaFileExcel } from "react-icons/fa";

import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import * as XLSX from "xlsx";
import { useTheme } from "../../../../ThemeContext";
import UserCard from "./UserCard";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { deleteRequest, getRequest } from "../../../../Service/api.service";
import EditUser from "../../../Common/EditUser";
import { AddUserDataModal } from "../../../Common/AddUserDataModal";
import { MdOutlineAddCircleOutline } from "react-icons/md";
import toast from "react-hot-toast";

const UserTable = () => {
  const { colorPalette, selectedColor, bgColor } = useTheme();
  const dispatch = useDispatch();
  const { layoutTextColor, backgroundColor } = bgColor;

  const [selectedRoles, setSelectedRoles] = useState([])
  const [view, setView] = useState("table");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const actionColor = colorPalette[selectedColor]["400"];

  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);

  const [addUser, setAddUser] = useState('');
  const [addUserModal, setAddUserModal] = useState(false);


  const [editingData, setEditingData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const hasExportPermission = (user) => user.role === "Admin";
  dispatch(setHeadingTitle("Users"))

  const getallUsers = async () => {
    try {
      const response = await getRequest("/user/readAll");

      if (response.status === 200 && response.data) {
        const renderedRowsData = response.data.map((item, index) => ({
          no: index,
          id: item.userId,
          userId: item.userId,
          firstName: item.firstName,
          lastName: item.lastName,
          middleName: item.middleName,
          groups: item.groups || [],
          accessibleFolders: item.accessibleFolders || [],
          email: item.email,
          object: item.object,
          roles: item?.roles || [],
          disabled: item.disabled,
          authentication: item.authentication,
        }));
        setData(renderedRowsData);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      setData([]);
    }
  };
  useEffect(() => {
    getallUsers()
  }, [])

  const getallRoles = async () => {
    try {
      const response = await getRequest("/roles/readAll");
      if (response.status === 200 && response.data) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      setRoles([]);
    }
  };
  useEffect(() => {
    getallRoles()
  }, [])

  console.log(roles)

  const columns = [
    { field: "id", headerName: "ID", flex: 0.2 },
    { field: "firstName", headerName: "Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1.5 },
    { field: "authentication", headerName: "Authentication", flex: 0.7 },
    { field: "disabled", headerName: "Disabled", flex: 0.7 },
    {
      field: "roles",
      headerName: "Role",
      flex: 2,
      renderCell: (params) => (
        <Select
          multiple
          value={['s', 'admin']}
          size="small"
          onChange={(e) => handleRoleChange(params.row.id, e.target.value)}
          fullWidth
          renderValue={(selected) => (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </div>

          )}
        >{
            roles.map((item) => (
              <MenuItem key={item?.roleId} value={item?.roleName}>{item?.roleName}</MenuItem>
            ))
          }

        </Select>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handleEdit(params.row)}>
            <FaEdit style={{ color: backgroundColor }} />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row)}>
            <FaTrash style={{ color: backgroundColor }} />
          </IconButton>
        </>
      ),
    },
  ];

  const handleExport = (type) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    if (type === "csv") XLSX.writeFile(wb, "users.csv");
    else if (type === "excel") XLSX.writeFile(wb, "users.xlsx");
  };

  const handleEdit = (user) => {
    setEditingData(user);
    setEditModalOpen(true);
  };

  const handleDelete = (user) => {
    setDeleteData(user);
    setDeleteModalOpen(true);
  };

  const handleSave = (updatedData) => {
    const updatedDataList = data.map((user) =>
      user.id === updatedData.id ? updatedData : user
    );
    setData(updatedDataList);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await deleteRequest(`/user/${deleteData.id}/delete`);
      if (response.status === 200) {
        toast.success("Deleted Succesfully")
        setDeleteModalOpen(false);
        getallUsers();
      }

    } catch (error) {
      toast.error(error.response.data.error || "Internal Server Error");

    }
    finally {
      setDeleteModalOpen(false)
    }



  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
  };
  const handleRoleChange = (id, selectedRoles) => {
    setSelectedRoles((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, role: selectedRoles } : row
      )
    );
  };


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (id) => {
    console.log("Delete user with ID:", id)
  }

  const handleAddUserModal = () => {
    setAddUserModal(true);
    console.log("Modal Open:", addUserModal);
  };

  const closeAddUserModal = () => {
    setAddUserModal(false);
    console.log("Modal Close:", addUserModal);
  };
  console.log('addUserModal', addUserModal)
  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <FormControlLabel
          control={
            <Switch
              checked={view === "table"}
              onChange={() => setView(view === "table" ? "card" : "table")}
              style={{ color: actionColor }}
              sx={{
                '& .MuiSwitch-track': {
                  backgroundColor: backgroundColor,
                },
                '& .MuiSwitch-thumb': {
                  backgroundColor: backgroundColor,
                },
                '& .Mui-checked + .MuiSwitch-track': {
                  backgroundColor: backgroundColor + " !important",
                },
              }}
            />
          }
          label={view === "table" ? "Table View" : "Card View"}
          sx={{ color: actionColor }}
        />
        <Button
          onClick={handleAddUserModal}
          variant="outlined"
          sx={{
            border: `2px solid ${backgroundColor}`,
            color: backgroundColor,
            borderRadius: "8px",
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "bold",
            textTransform: "none",

          }}
        >
          <MdOutlineAddCircleOutline style={{ color: backgroundColor }} size={20} /> Add User
        </Button>

        {/* <Button
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
        </Button> */}
      </div>


      {view === "table" && (
        <div style={{ width: "100%" }}>
          <DataGrid
            rows={data}
            columns={columns}
            pageSize={rowsPerPage}
            rowsPerPageOptions={[5, 10, 15]}
            pagination
            onPageChange={handleChangePage}
            onPageSizeChange={handleChangeRowsPerPage}
            // disableSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            sx={{
              padding: "10px",
              "& .MuiDataGrid-columnHeaders": {
                color: layoutTextColor || "#fff",
              },
              "& .MuiButtonBase-root, & .MuiButton-root": {
                color: backgroundColor || "#000000",
              }
            }}
          />
        </div>
      )}

      {view === "card" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
          {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}


        </div>
      )}

      {view === "card" && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 15]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}

      <EditUser
        open={editModalOpen}
        handleClose={handleCloseEditModal}
        data={editingData || {}}
        onSave={handleSave}
      />
      <AddUserDataModal
        open={addUserModal}
        handleClose={closeAddUserModal}

      />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        handleClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div >
  );
};

export default UserTable;
