import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getRequest, deleteRequest } from "../../../../Service/api.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { DeleteConfirm } from "../../../Common/DeleteConfirm";
import PageLayout from "../../../Common/PageLayout";
import DataTable from "../../../Common/DataTable";

const StmpTable = ({ routeName }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission
  );

  useEffect(() => {
    dispatch(setHeadingTitle("Settings / SMTP Configure Table"));
  }, []);

  const [selectedId, setSelectedId] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sourceData, setSourceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState([]);

  useEffect(() => {
    fetchSourceData();
  }, []);

  const handleDelete = async (row) => {
    setSelectedId(row?.id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSmptData = async () => {
    setDeleteLoading(true);
    try {
      const response = await deleteRequest(`/smpt/${selectedId}/delete`);
      if (response.status === 200) {
        setIsDeleteModalOpen(false);
        toast.success("Succesfully Deleted Job");
        fetchSourceData();
      }
    } catch (error) {
      console.error(error || "Internal server error");
      setIsDeleteModalOpen(false);
      toast.error(error.response.data.error || "Failed to Delete Folder");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteLoading(false);
    }
  };

  const fetchSourceData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRequest("/smpt/readAll");
      if (response?.status === 200) {
        setSourceData(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setSourceData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateEditHandler = (row) => {
    navigate(`/admin-console/settings/smtp-configuration?${row?.id}`, {
      state: { data: row },
    });
  };

  const column = sourceData.length
    ? Object.keys(...sourceData).map((key) => ({
        accessorKey: key,
        header: key,
        enableGrouping: true,
        enableLinkHandler:
          permissionList?.includes(routeName) &&
          permissionDetails[routeName]?.hasWriteOnly &&
          navigateEditHandler,
        hideCell: key === "password" ? "•••••••••••••••••••" : false,
      }))
    : [];
  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 p-3 py-7">
        <div className="flex gap-3 sm:gap-6 justify-end absolute right-7">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {sourceData.length}
            </span>
          </div>
          {filteredTableData !== sourceData.length && (
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
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : sourceData.length ? (
        <DataTable
          data={sourceData}
          columns={column}
          enableRowOrdering={false}
          enableRowSelection={false}
          enableFiltering={false}
          enableEditing={true}
          enableAction={true}
          enableCreateDashboard={false}
          enableCreateView={false}
          enableCreateEmail={false}
          editActionHandler={navigateEditHandler}
          deleteActionHandler={handleDelete}
          enableGrouping={true}
          setFilteredData={setFilteredTableData}
          // setSelectedRows={setSelectedRows}
          onDataChange={() => {}}
          routeName={routeName}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )}
      <DeleteConfirm
        isOpen={isDeleteModalOpen}
        close={() => setIsDeleteModalOpen(false)}
        handleDelete={handleDeleteSmptData}
        deleteLoading={deleteLoading}
      />
    </PageLayout>
  );
};

export default StmpTable;
