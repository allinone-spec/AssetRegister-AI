import { useEffect, useMemo, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { useTheme } from "../../../../ThemeContext";
import {
  deleteRequest,
  getRequest,
  patchRequest,
} from "../../../../Service/api.service";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import EditGroup from "../../../Common/EditGroup";
import { AddGroupModal } from "../../../Common/AddGroupModal";
import { MdOutlineAddCircleOutline } from "react-icons/md";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import DataTable from "../../../Common/DataTable";
import PageLayout from "../../../Common/PageLayout";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import { tableNameEnum } from "../data";

const GroupsTable = ({ routeName }) => {
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [isLoading, setLoading] = useState(false);
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission
  );
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [data, setData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [editingData, setEditingData] = useState({});
  const [deleteData, setDeleteData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [objects, setObjects] = useState([]);
  const [addGroupModal, setAddGroupModal] = useState(false);

  const getallGroups = async () => {
    setLoading(true);
    try {
      const response = await getRequest("/groups/readAll");
      if (response.status === 200) {
        setData(response.data);
      }
    } catch (error) {
      console.log("error", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const getallRoles = async () => {
    try {
      const response = await getRequest("/roles/readAll");
      if (response.status === 200) {
        setRolesData(response?.data || []);
      }
    } catch (error) {
      console.log("error", error);
      setRolesData([]);
    }
  };

  const fetchAllObjects = async () => {
    try {
      const response = await getRequest("/objects/readAll");
      if (response.status === 200) {
        setObjects(response.data);
      } else {
        setObjects([]);
      }
    } catch (error) {
      console.error("Internal server error");
    }
  };

  useEffect(() => {
    getallGroups();
    getallRoles();
    fetchAllObjects();
  }, []);

  const handleEdit = (row) => {
    setEditingData(row);
    setEditModalOpen(true);
  };

  const handleDelete = (row) => {
    setDeleteData(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      console.log(deleteData);
      const response = await deleteRequest(
        `/groups/${deleteData.groupId}/delete`
      );
      if (response.status === 200) {
        toast.success("Deleted Successfully");
        setDeleteModalOpen(false);
        getallGroups();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Something went wrong");
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const handleCloseEditModal = () => setEditModalOpen(false);

  const handleCloseDeleteModal = () => setDeleteModalOpen(false);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setHeadingTitle("Groups"));
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  const handleAddGroupModal = () => {
    setAddGroupModal(true);
    console.log("Modal Open:", addGroupModal);
  };

  const closeAddGroupModal = () => {
    setAddGroupModal(false);
    console.log("Modal Close:", addGroupModal);
  };

  const handleRoleChange = (val, option) => {
    try {
      const updatedRoles = rolesData.filter((role) =>
        option.includes(role.roleName)
      );

      patchRequest(`/groups/${val.groupId}/update`, {
        roleId: updatedRoles.map((role) => role.roleId),
      });
    } catch (error) {
      toast.error("Failed to update roles");
    }
  };

  const handleObjectChange = (val, option) => {
    try {
      const updatedObjects = objects.filter((obj) =>
        option.includes(obj.objectName)
      );

      patchRequest(`/groups/${val.groupId}/update`, {
        objectId: updatedObjects.map((obj) => obj.objectId),
      });
    } catch (error) {
      toast.error("Failed to update objects");
    }
  };

  const filteredGroups = useMemo(() => {
    return selectedObject
      ? data.filter((group) => group.objectId.includes(+selectedObject))
      : data;
  }, [selectedObject, data]);

  const canEdit = permissionList?.includes(routeName) && permissionDetails[routeName]?.hasWriteOnly;
  const column = data.length
    ? Object.entries(...data)
        .filter(
          ([key, _]) =>
            !["email", "objectId", "roleId", "userIds"].includes(key)
        )
        .map(([key]) => {
          return {
            accessorKey: key,
            header: key,
            enableGrouping: true,
            enableMultiSelect: ["objectName", "rolesName"].includes(key),
            handleDropdownChange:
              ["objectName", "rolesName"].includes(key) && canEdit
                ? key === "objectName"
                  ? handleObjectChange
                  : handleRoleChange
                : "",
            multiSelectOptions:
              key === "objectName"
                ? objects.map((v) => v.objectName)
                : key === "rolesName"
                ? rolesData.map((v) => v.roleName)
                : [],
            disabled: ["objectName", "rolesName"].includes(key) && !canEdit,
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
                onClick={handleAddGroupModal}
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
                Add Group
              </Button>
            </div>
          )}
        <div className="flex gap-3 sm:gap-6 justify-between absolute top-24 right-8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {filteredGroups.length}
            </span>
          </div>
          {filteredTableData !== filteredGroups.length &&
          filteredGroups.length ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                Filtered:
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                {filteredTableData}
              </span>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : filteredGroups.length ? (
        <DataTable
          key={selectedObject || "all"}
          isSelectedObject
          data={filteredGroups}
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
          tableId={1}
          onDataChange={() => {}}
          setFilteredData={setFilteredTableData}
          routeName={routeName}
          tableName={tableNameEnum.GROUP}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )}
      {addGroupModal && (
        <AddGroupModal
          open={addGroupModal}
          handleClose={closeAddGroupModal}
          getallGroups={getallGroups}
          roles={rolesData}
          objects={objects}
        />
      )}

      {editModalOpen && (
        <EditGroup
          open={editModalOpen}
          objects={objects}
          handleClose={handleCloseEditModal}
          data={editingData || {}}
          roles={rolesData}
          onSave={(updatedData) =>
            setData(
              data.map((row) => (row.id === updatedData.id ? updatedData : row))
            )
          }
          getallGroups={getallGroups}
        />
      )}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        handleClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isLoading={isLoading}
      />
    </PageLayout>
  );
};

export default GroupsTable;
