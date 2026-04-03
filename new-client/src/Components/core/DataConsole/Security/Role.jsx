import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { deleteRequest, getRequest } from "../../../../Service/api.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import DataTable from "../../../Common/DataTable";
import { tableNameEnum } from "../data";
import LoadingBar from "../../../Common/LoadingBar";
import CommonButton from "../../../Common/CommonButton";
import { PlusIcon } from "lucide-react";
import GridButton from "../../../Common/GridButton";

const RoleTable = ({
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
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const [isLoading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [view, setView] = useState("table");

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

  useEffect(() => {
    if (updateData) {
      getRoles();
      setUpdateData(false);
    }
  }, [updateData]);

  const handleEdit = (user) => {
    setOpenDrawer(user);
    setEditJob(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await deleteRequest(`/roles/${deleteId}/delete`);
      if (response.status === 200) {
        toast.success("Deleted Successfully");
        setDeleteModalOpen(false);
        setOpenDrawer(false);
        getRoles();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Something went wrong");
    } finally {
      setDeleteModalOpen(false);
    }
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
          enableLinkHandler: key === "roleName" && handleDrawer,
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
            <div className="font-extrabold text-2xl">Role</div>
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
                  <PlusIcon style={{ color: "white" }} size={13} /> Add Role
                </div>
              </CommonButton>
            )}
          <GridButton setView={setView} view={view} />
        </div>
      </div>
      {data.length ? (
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
          deleteActionHandler={(val) => handleDelete(val?.roleId)}
          enableGrouping={true}
          onDataChange={() => {}}
          routeName={routeName}
          setFilteredData={setFilteredTableData}
          tableName={tableNameEnum.ROLE}
          isDrawer={isDrawer}
          tableView={view}
          // setOpenDrawer={handleDrawer}
          openDrawerId={openDrawer?.roleId}
          cardFiled={{
            id: "roleId",
            title: "roleName",
            subTitle1: "lastName",
            subTitle2: "userId",
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

export default RoleTable;
