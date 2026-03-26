import { useEffect, useState } from "react";
import {
  TablePagination,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import { MdOutlineAddCircleOutline } from "react-icons/md";
import toast from "react-hot-toast";
import { useTheme } from "../../../../ThemeContext";
import UserCard from "./UserCard";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteRequest,
  getRequest,
  patchRequest,
  postDataRequest,
} from "../../../../Service/api.service";
import EditUser from "../../../Common/EditUser";
import { AddUserDataModal } from "../../../Common/AddUserDataModal";
import PageLayout from "../../../Common/PageLayout";
import DataTable from "../../../Common/DataTable";
import { tableNameEnum } from "../data";

const UserTable = ({ routeName }) => {
  const dispatch = useDispatch();
  const { colorPalette, selectedColor, bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const { permissionDetails, permissionList, user } = useSelector(
    (state) => state.permission
  );
  const actionColor = colorPalette[selectedColor]["400"];
  const [isLoading, setLoading] = useState(false);

  const [view, setView] = useState("table");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);

  const [addUserModal, setAddUserModal] = useState(false);
  const [groupData, setGroupData] = useState([]);
  const [editingData, setEditingData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    dispatch(setHeadingTitle("Users"));
  }, []);

  const getallUsers = async () => {
    try {
      setLoading(true);
      const response = await getRequest("/user/readAll");

      if (response.status === 200 && response.data) {
        const renderedRowsData = response.data.map((item, index) => ({
          // no: index + 1,
          id: item.userId || index,
          userId: item.userId,
          fullName: `${item.firstName} ${
            item.middleName !== "null" ? item.middleName || "" : ""
          } ${item.lastName} `,
          firstName: item.firstName,
          lastName: item.lastName,
          middleName: item.middleName,
          groups: item.groupName || [],
          accessibleFolders: item.accessibleFolders || [],
          email: item.email,
          object: item.objectName,
          roles: item?.rolesName || [],
          disabled: item.disabled,
          authentication: item.authentication,
          createdBy: item.createdBy,
          createdTime: item.createdTime,
          updatedBy: item.updatedBy,
          updatedTime: item.updatedTime
        }));
        setData(renderedRowsData);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const getallGroups = async () => {
    setLoading(true);
    try {
      const response = await getRequest("/groups/readAll");
      if (response.status === 200) {
        setGroupData(response.data);
      }
    } catch (error) {
      console.log("error", error);
      setGroupData([]);
    } finally {
      setLoading(false);
    }
  };

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
    getallRoles();
    getallGroups();
    getallUsers();
  }, []);

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
        toast.success("Deleted Succesfully");
        setDeleteModalOpen(false);
        getallUsers();
      }
    } catch (error) {
      toast.error(error.response.data.error || "Internal Server Error");
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const updateUserRoles = async (userId, roleIds, roleToRemove) => {
    try {
      const rolesParam = roleIds.map((item) => item.roleId);
      if (roleToRemove) {
        const deleteRole = roles.find(
          (role) => role.roleName === roleToRemove
        )?.roleId;
        const response = await patchRequest(
          `/user/${userId}/Role/${deleteRole}`
        );

        return response;
      } else {
        const response = patchRequest(`/user/${userId}/update`, {
          roleId: rolesParam,
        });

        return response;
      }
    } catch (error) {
      console.error("Error updating user roles:", error);
      throw error;
    }
  };

  const handleRoleChange = async (row, selectedRoleIds, roleToRemove) => {
    const updatedRoles = roles.filter((role) =>
      selectedRoleIds.includes(role.roleName)
    );

    try {
      const response = await updateUserRoles(
        row?.userId,
        updatedRoles,
        roleToRemove
      );
      if (response.status === 200) {
        toast.success("User roles updated successfully");
        if (response.status === 200 && user.userId == row?.userId)
          window.location.reload();
        // setData((prevData) =>
        //   prevData.map((user) =>
        //     user.userId === row?.userId ? { ...user, roles: updatedRoles } : user
        //   )
        // );
      } else {
        toast.error("Failed to update user roles");
      }
    } catch (error) {
      console.error("Error updating user roles:", error);
      toast.error("An error occurred while updating roles");
    }
  };

  const handleGroupChange = async (row, selectedRoleIds, groupRemove) => {
    try {
      const payload = groupData
        .filter((role) => selectedRoleIds.includes(role.groupName))
        .map((item) => item.groupId)
        .flat(1);
      let response;
      if (groupRemove) {
        const deleteGroup = groupData.find(
          (group) => group.groupName === groupRemove
        )?.groupId;
        response = await postDataRequest(
          `/user/deleteuser/${row?.userId}/group/${deleteGroup}`
        );
      } else
        response = await patchRequest(`/user/${row?.userId}/update`, {
          groupId: payload,
        });

      if (response?.status === 200) {
        toast.success("User roles updated successfully");
        if (user.userId == row?.userId) window.location.reload();
      }
    } catch (error) {
      console.error("Error updating user roles:", error);
      toast.error("An error occurred while updating roles");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (id) => {
    console.log("Delete user with ID:", id);
  };

  const handleAddUserModal = () => {
    setAddUserModal(true);
    console.log("Modal Open:", addUserModal);
  };

  const closeAddUserModal = () => {
    setAddUserModal(false);
  };

  const canEdit = permissionList?.includes(routeName) && permissionDetails[routeName]?.hasWriteOnly;
  const column = data.length
    ? Object.keys(data[0]).map((key) => {
        return {
          accessorKey: key,
          header: key,
          enableGrouping: true,
          enableMultiSelect: ["roles", "groups"].includes(key),
          handleDropdownChange:
            ["roles", "groups"].includes(key) && canEdit
              ? key === "roles"
                ? handleRoleChange
                : handleGroupChange
              : "",
          multiSelectOptions:
            key === "roles"
              ? roles.map((v) => v.roleName)
              : key === "groups"
              ? groupData.map((v) => v.groupName)
              : [],
          disabled: ["roles", "groups"].includes(key) && !canEdit,
        };
      })
    : [];

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "10px",
            marginLeft: "10px",
            marginBottom: "60px",
          }}
        >
          <FormControlLabel
            className="absolute"
            control={
              <Switch
                checked={view === "table"}
                onChange={() => setView(view === "table" ? "card" : "table")}
                style={{ color: actionColor }}
                sx={{
                  "& .MuiSwitch-track": {
                    backgroundColor: backgroundColor,
                  },
                  "& .MuiSwitch-thumb": {
                    backgroundColor: backgroundColor,
                  },
                  "& .Mui-checked + .MuiSwitch-track": {
                    backgroundColor: backgroundColor + " !important",
                  },
                }}
              />
            }
            label={view === "table" ? "Table View" : "Card View"}
            sx={{ color: actionColor }}
          />
          {permissionList?.includes(routeName) &&
            permissionDetails[routeName]?.hasWriteOnly && (
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
                  position: "absolute",
                  left: 170,
                }}
              >
                <MdOutlineAddCircleOutline
                  style={{ color: backgroundColor }}
                  size={20}
                />{" "}
                Add User
              </Button>
            )}
        </div>
        {view === "table" && (
          <div className="flex gap-3 sm:gap-6 justify-between absolute top-24 right-8">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Total:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {data.length}
              </span>
            </div>
            {filteredTableData !== data.length && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Filtered:
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  {filteredTableData}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {view === "table" &&
        (isLoading ? (
          <div className="flex justify-center items-center h-full">
            <CircularProgress />
          </div>
        ) : data.length ? (
          <DataTable
            data={data}
            columns={column}
            enableRowOrdering={false}
            enableRowSelection={false}
            enableFiltering={false}
            enableCreateView={false}
            enableCreateDashboard={false}
            enableEditing={true}
            enableAction={true}
            editActionHandler={handleEdit}
            deleteActionHandler={handleDelete}
            enableGrouping={true}
            onDataChange={() => {}}
            routeName={routeName}
            setFilteredData={setFilteredTableData}
            tableName={tableNameEnum.USER}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            No Data Found
          </div>
        ))}

      {view === "card" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            justifyContent: "center",
          }}
        >
          {data
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                routeName={routeName}
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
        onRefresh={getallUsers}
      />
      <AddUserDataModal
        open={addUserModal}
        handleClose={closeAddUserModal}
        onRefresh={getallUsers}
      />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        handleClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isLoading={isLoading}
      />
    </PageLayout>
  );
};

export default UserTable;
