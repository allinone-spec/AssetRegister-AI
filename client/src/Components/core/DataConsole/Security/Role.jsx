import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, CircularProgress } from "@mui/material";
import { MdOutlineAddCircleOutline } from "react-icons/md";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { deleteRequest, getRequest } from "../../../../Service/api.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { AddRoleDataModal } from "../../../Common/AddRoleDataModal";
import PageLayout from "../../../Common/PageLayout";
import { useTheme } from "../../../../ThemeContext";
import DataTable from "../../../Common/DataTable";
import EditRole from "../../../Common/EditRole";
import { tableNameEnum } from "../data";

const RoleTable = ({ routeName }) => {
  const dispatch = useDispatch();
  const { bgColor } = useTheme();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission
  );
  const { backgroundColor } = bgColor;
  const [isLoading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [editingData, setEditingData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [addRoleModal, setAddRoleModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);

  useEffect(() => {
    dispatch(setHeadingTitle("Roles"));
  }, []);

  const getRoles = async () => {
    try {
      const response = await getRequest("/roles/readAll");
      if (response.status === 200) setData(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRoles();
  }, []);

  const handleAddRoleModal = () => {
    setAddRoleModal(true);
  };

  const closeAddRoleModal = () => {
    setAddRoleModal(false);
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
      const response = await deleteRequest(
        `/roles/${deleteData.roleId}/delete`
      );
      if (response.status === 200) {
        toast.success("Deleted Successfully");
        setDeleteModalOpen(false);
        getRoles();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Something went wrong");
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

  const column = data.length
    ? Object.keys(...data).map((key) => {
        if (key === "permissions") {
          return {
            accessorKey: key,
            header: key,
            enableGrouping: true,
            cell: ({ row }) => (
              <div>
                {row.original.permissions.map((permission, index) => (
                  <div key={index} style={{ marginBottom: "4px" }}>
                    <span>{permission.permissionName}</span>{" "}
                    {/* {permission.permissionTypes.join(", ")} */}
                  </div>
                ))}
              </div>
            ),
          };
        }
        return {
          accessorKey: key,
          header: key,
          enableGrouping: true,
        };
      })
    : [];

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        {permissionList?.includes(routeName) &&
          permissionDetails[routeName]?.hasWriteOnly && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "10px",
                marginLeft: "10px",
                marginBottom: "60px",
              }}
            >
              <Button
                onClick={handleAddRoleModal}
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
                }}
              >
                <MdOutlineAddCircleOutline
                  style={{ color: backgroundColor }}
                  size={20}
                />{" "}
                Add Role
              </Button>
            </div>
          )}
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
      </div>
      {isLoading ? (
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
          enableEditing={true}
          enableCreateView={false}
          enableCreateDashboard={false}
          enableAction={true}
          editActionHandler={handleEdit}
          deleteActionHandler={handleDelete}
          enableGrouping={true}
          onDataChange={() => {}}
          routeName={routeName}
          setFilteredData={setFilteredTableData}
          tableName={tableNameEnum.ROLE}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )}
      <AddRoleDataModal
        open={addRoleModal}
        handleClose={closeAddRoleModal}
        getallRoles={getRoles}
      />

      {/* Modals */}
      <EditRole
        open={editModalOpen}
        handleClose={handleCloseEditModal}
        data={editingData || {}}
        onSave={handleSave}
        getallRole={getRoles}
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

export default RoleTable;
