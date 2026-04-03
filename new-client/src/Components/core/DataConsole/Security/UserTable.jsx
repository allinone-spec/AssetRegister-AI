import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PlusIcon } from "lucide-react";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import {
  deleteRequest,
  getRequest,
  patchRequest,
  postDataRequest,
} from "../../../../Service/api.service";
import PageLayout from "../../../Common/PageLayout";
import DataTable from "../../../Common/DataTable";
import { tableNameEnum } from "../data";
import GridButton from "../../../Common/GridButton";
import CommonButton from "../../../Common/CommonButton";
import LoadingBar from "../../../Common/LoadingBar";

const UserTable = ({
  routeName,
  handleDrawer,
  setEditJob,
  openDrawer,
  setOpenDrawer,
  isDrawer,
  updateData,
  setUpdateData,
}) => {
  const dispatch = useDispatch();
  const { permissionDetails, permissionList, user } = useSelector(
    (state) => state.permission,
  );
  // const actionColor = colorPalette[selectedColor]["400"];
  const [isLoading, setLoading] = useState(false);
  const [view, setView] = useState("table");
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [groupData, setGroupData] = useState([]);
  const [deleteData, setDeleteData] = useState(null);
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
          updatedTime: item.updatedTime,
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

  useEffect(() => {
    if (updateData) {
      getallUsers();
      setUpdateData(false);
    }
  }, [updateData]);

  const handleEdit = (user) => {
    setOpenDrawer(user);
    setEditJob(true);
  };

  const handleDelete = (user) => {
    setDeleteData(user);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await deleteRequest(`/user/${deleteData.id}/delete`);
      if (response.status === 200) {
        toast.success("Deleted Successfully");
        setDeleteModalOpen(false);
        getallUsers();
      }
    } catch (error) {
      toast.error(error.response.data.error || "Internal Server Error");
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const handleCloseDeleteModal = () => setDeleteModalOpen(false);

  const updateUserRoles = async (userId, roleIds, roleToRemove) => {
    try {
      const rolesParam = roleIds.map((item) => item.roleId);
      if (roleToRemove) {
        const deleteRole = roles.find(
          (role) => role.roleName === roleToRemove,
        )?.roleId;
        return await patchRequest(`/user/${userId}/Role/${deleteRole}`);
      } else {
        return patchRequest(`/user/${userId}/update`, { roleId: rolesParam });
      }
    } catch (error) {
      console.error("Error updating user roles:", error);
      throw error;
    }
  };

  const handleRoleChange = async (row, selectedRoleIds, roleToRemove) => {
    const updatedRoles = roles.filter((role) =>
      selectedRoleIds.includes(role.roleName),
    );
    try {
      const response = await updateUserRoles(
        row?.userId,
        updatedRoles,
        roleToRemove,
      );
      if (response.status === 200) {
        toast.success("User roles updated successfully");
        if (user.userId == row?.userId) window.location.reload();
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
          (group) => group.groupName === groupRemove,
        )?.groupId;
        response = await postDataRequest(
          `/user/deleteuser/${row?.userId}/group/${deleteGroup}`,
        );
      } else {
        response = await patchRequest(`/user/${row?.userId}/update`, {
          groupId: payload,
        });
      }
      if (response?.status === 200) {
        toast.success("User groups updated successfully");
        if (user.userId == row?.userId) window.location.reload();
      }
    } catch (error) {
      console.error("Error updating user groups:", error);
      toast.error("An error occurred while updating groups");
    }
  };

  const canEdit =
    permissionList?.includes(routeName) &&
    permissionDetails[routeName]?.hasWriteOnly;

  const column = data.length
    ? Object.keys(data[0]).map((key) => ({
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
        enableLinkHandler: key === "firstName" && handleDrawer,
      }))
    : [];

  if (isLoading) return <LoadingBar />;

  return (
    <PageLayout>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex gap-3 sm:gap-6 justify-start">
          <div className="flex items-center gap-2">
            {/* <span className="text-sm font-medium text-gray-600">Total:</span> */}
            <div className="font-extrabold text-2xl">User</div>
            <span className="inline-flex items-end ml-2 rounded-full text-sm text-gray-600">
              {data.length} Total
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
          {permissionList?.includes(routeName) &&
            permissionDetails[routeName]?.hasWriteOnly && (
              <CommonButton
                onClick={() => {
                  setOpenDrawer({});
                  setEditJob(true);
                }}
                className="bg-accent"
              >
                <div className="flex gap-2 items-center">
                  <PlusIcon style={{ color: "white" }} size={13} /> Add User
                </div>
              </CommonButton>
            )}
          <GridButton setView={setView} view={view} />
        </div>
      </div>
      {/* Table View */}
      {data.length ? (
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
          isDrawer={isDrawer}
          tableView={view}
          // setOpenDrawer={handleDrawer}
          openDrawerId={openDrawer?.id}
          cardFiled={{
            id: "id",
            title: "firstName",
            subTitle1: "lastName",
            subTitle2: "userId",
            status: "status",
            assets: "noOfRecords",
          }}
        />
      ) : (
        <div className="flex justify-center items-center h-full text-gray-500">
          No Data Found
        </div>
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

export default UserTable;
