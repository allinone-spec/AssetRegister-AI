import { useEffect, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import {
  deleteRequest,
  getRequest,
  patchRequest,
} from "../../../../Service/api.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import DataTable from "../../../Common/DataTable";
import PageLayout from "../../../Common/PageLayout";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import { tableNameEnum } from "../data";
import LoadingBar from "../../../Common/LoadingBar";
import GridButton from "../../../Common/GridButton";
import CommonButton from "../../../Common/CommonButton";

const GroupsTable = ({
  routeName,
  handleDrawer,
  setEditJob,
  openDrawer,
  setOpenDrawer,
  openDeleteModel,
  isDrawer,
  updateData,
  setUpdateData,
}) => {
  const [isLoading, setLoading] = useState(false);
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [data, setData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [view, setView] = useState("table");
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
        setObjects(response.data || []);
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

  useEffect(() => {
    if (updateData) {
      getRoles();
      setUpdateData(false);
    }
  }, [updateData]);

  const handleEdit = (row) => {
    // setEditModalOpen(true);
    setOpenDrawer(row);
    setEditJob(true);
  };

  const handleDelete = (id) => {
    // setDeleteData(row);
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await deleteRequest(`/groups/${deleteId}/delete`);
      if (response.status === 200) {
        toast.success("Deleted Successfully");
        setDeleteModalOpen(false);
        setOpenDrawer(false);
        getallGroups();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Something went wrong");
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const handleCloseDeleteModal = () => setDeleteModalOpen(false);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setHeadingTitle("Groups"));
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  const handleRoleChange = (val, option) => {
    try {
      const updatedRoles = rolesData.filter((role) =>
        option.includes(role.roleName),
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
        option.includes(obj.objectName),
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

  const canEdit =
    permissionList?.includes(routeName) &&
    permissionDetails[routeName]?.hasWriteOnly;
  const column = data.length
    ? Object.entries(...data)
        .filter(
          ([key, _]) =>
            !["email", "objectId", "roleId", "userIds"].includes(key),
        )
        .map(([key]) => {
          return {
            accessorKey: key,
            header: key,
            enableGrouping: true,
            enableLinkHandler: key === "groupName" && handleDrawer,
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

  if (isLoading) return <LoadingBar />;

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex gap-3 sm:gap-6 justify-start">
          <div className="flex items-center gap-2">
            {/* <span className="text-sm font-medium text-gray-600">Total:</span> */}
            <div className="font-extrabold text-2xl">Group</div>
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
                  <PlusIcon style={{ color: "white" }} size={13} /> Add Group
                </div>
              </CommonButton>
            )}
          <GridButton setView={setView} view={view} />
        </div>
      </div>
      {filteredGroups.length ? (
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
          deleteActionHandler={(val) => handleDelete(val?.groupId)}
          enableGrouping={true}
          tableId={1}
          onDataChange={() => {}}
          setFilteredData={setFilteredTableData}
          routeName={routeName}
          tableName={tableNameEnum.GROUP}
          isDrawer={isDrawer}
          tableView={view}
          // setOpenDrawer={handleDrawer}
          openDrawerId={openDrawer?.groupId}
          cardFiled={{
            id: "groupId",
            title: "groupName",
            subTitle1: "lastName",
            subTitle2: "groupId",
            status: "status",
            assets: "noOfRecords",
          }}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
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

export default GroupsTable;
