import { useEffect, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { MdOutlineAddCircleOutline } from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";

import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { useTheme } from "../../../../ThemeContext";
import { deleteRequest, getRequest } from "../../../../Service/api.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import PageLayout from "../../../Common/PageLayout";
import { useSelector } from "react-redux";
import DataTable from "../../../Common/DataTable";
import { tableNameEnum } from "../data";

const PermissionTypeTable = ({ routeName }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state, pathname } = useLocation();
  const [isLoading, setLoading] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const { bgColor } = useTheme();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission
  );
  const { backgroundColor } = bgColor;
  const [data, setData] = useState([]);
  const [deleteData, setDeleteData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const getallpermissions = async () => {
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
    getallpermissions();
  }, []);

  useEffect(() => {
    if (state) {
      navigate(pathname);
      window.location.reload();
    }
  }, [state]);
  const handleAddPermission = () => {
    navigate("/data-console/security/permission/add");
  };

  const handleEdit = (row) => {
    // Store permission data in sessionStorage or pass as state
    // sessionStorage.setItem('editPermissionData', JSON.stringify(permissionData));
    navigate(`/data-console/security/permission/edit/${row.permissionId}`, {
      state: {
        permissionData: row,
      },
    });
  };

  const handleDelete = (row) => {
    setDeleteData(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      const response = await deleteRequest(
        `/permission/${deleteData.permissionId}/delete`
      );
      if (response.status === 200) {
        toast.success("Deleted Successfully");
        setDeleteModalOpen(false);
        getallpermissions();
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
                marginTop: "5px",
                marginLeft: "10px",
                marginBottom: "60px",
              }}
            >
              <Button
                onClick={handleAddPermission}
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
                />
                Add Permission
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
      ) : data?.length ? (
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
