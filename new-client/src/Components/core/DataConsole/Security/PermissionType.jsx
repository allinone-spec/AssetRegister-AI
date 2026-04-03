import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";

import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { deleteRequest, getRequest } from "../../../../Service/api.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import { useSelector } from "react-redux";
import DataTable from "../../../Common/DataTable";
import { tableNameEnum } from "../data";
import LoadingBar from "../../../Common/LoadingBar";
import GridButton from "../../../Common/GridButton";
import CommonButton from "../../../Common/CommonButton";

const PermissionTypeTable = ({
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
  const navigate = useNavigate();
  const { state, pathname } = useLocation();
  const [isLoading, setLoading] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const [data, setData] = useState([]);
  const [deleteData, setDeleteData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [view, setView] = useState("table");

  const getallPermissions = async () => {
    setLoading(true);
    try {
      const response = await getRequest("/permission/readAll");
      if (response.status === 200 && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(setHeadingTitle("Permissions"));
    getallPermissions();
  }, []);

  useEffect(() => {
    if (updateData) {
      getallPermissions();
      setUpdateData(false);
    }
  }, [updateData]);

  useEffect(() => {
    if (state) {
      navigate(pathname);
      window.location.reload();
    }
  }, [state]);

  const handleEdit = (row) => {
    setOpenDrawer(row);
    setEditJob(true);
  };

  const handleDelete = (row) => {
    setDeleteData(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      const response = await deleteRequest(
        `/permission/${deleteData.permissionId}/delete`,
      );
      if (response.status === 200) {
        toast.success("Deleted Successfully");
        setDeleteModalOpen(false);
        getallPermissions();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Something went wrong");
    } finally {
      setDeleteModalOpen(false);
      setLoading(false);
    }
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
                    <span>{permission.moduleName}:</span>{" "}
                    {permission.permissionTypes.join(", ")}
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
          enableLinkHandler: key === "permissionName" && handleDrawer,
        };
      })
    : [];

  if (isLoading) return <LoadingBar />;

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex gap-3 sm:gap-6 justify-start">
          <div className="flex items-center gap-2">
            <div className="font-extrabold text-2xl">Permission</div>
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
                  <PlusIcon style={{ color: "white" }} size={13} /> Add
                  Permission
                </div>
              </CommonButton>
            )}
          <GridButton setView={setView} view={view} />
        </div>
      </div>
      {data?.length ? (
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
          tableName={tableNameEnum.PERMISSION}
          isDrawer={isDrawer}
          tableView={view}
          // setOpenDrawer={handleDrawer}
          openDrawerId={openDrawer?.permissionId}
          cardFiled={{
            id: "permissionId",
            title: "permissionName",
            subTitle1: "createdBy",
            subTitle2: "permissionId",
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
        handleClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isLoading}
      />
    </PageLayout>
  );
};

export default PermissionTypeTable;
