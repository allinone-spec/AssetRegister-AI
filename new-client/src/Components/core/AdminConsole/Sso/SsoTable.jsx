import { useState, useEffect, useCallback } from "react";
import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { PlusIcon } from "lucide-react";
import toast from "react-hot-toast";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { getRequest, deleteRequest } from "../../../../Service/api.service";
import { DeleteConfirm } from "../../../Common/DeleteConfirm";
import DataTable from "../../../Common/DataTable";
import GridButton from "../../../Common/GridButton";
import CommonButton from "../../../Common/CommonButton";
import LoadingBar from "../../../Common/LoadingBar";

const SsoTable = ({
  routeName,
  handleDrawer,
  setEditJob,
  openDrawer,
  setOpenDrawer,
  openDeleteModel,
  setOpenDeleteModel,
  isDrawer,
}) => {
  const dispatch = useDispatch();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const [view, setView] = useState("table");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sourceData, setSourceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredTableData, setFilteredTableData] = useState(0);

  useEffect(() => {
    dispatch(setHeadingTitle("Settings / SSO Configure Table"));
  }, []);

  const handleDelete = async (row) => {
    setSelectedId(row.id);
    setIsDeleteModalOpen(true);
    setOpenDeleteModel(false);
  };

  const handleDeleteSmptData = async () => {
    setDeleteLoading(true);
    try {
      const response = await deleteRequest(`/sso/${selectedId}/delete`);
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

  useEffect(() => {
    fetchSourceData();
  }, []);

  useEffect(() => {
    if (openDeleteModel) handleDelete({ row: openDeleteModel });
  }, [openDeleteModel]);

  const fetchSourceData = useCallback(async () => {
    // if (hasFetchedRef.current) return;
    // hasFetchedRef.current = true;
    setLoading(true);
    try {
      const response = await getRequest("/sso/readAll");
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
    setOpenDrawer(row);
    // if (setEditJob) setEditJob(true);
    // navigate(`/admin-console/settings/sso-configuration?${row?.id}`, {
    //   state: { data: row },
    // });
  };

  const column = sourceData.length
    ? Object.keys(...sourceData).map((key) => ({
        accessorKey: key,
        header: key,
        enableGrouping: true,
        enableLinkHandler:
          key === "ssoConfigurationName" &&
          permissionList?.includes(routeName) &&
          permissionDetails[routeName]?.hasWriteOnly &&
          navigateEditHandler,
        hideCell: key === "clientSecret" ? "•••••••••••••••••••" : false,
      }))
    : [];

  if (loading) return <LoadingBar />;

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex gap-3 sm:gap-6 justify-start">
          <div className="flex items-center gap-2">
            {/* <span className="text-sm font-medium text-gray-600">Total:</span> */}
            <div className="font-extrabold text-2xl">SSO Configuration</div>
            <span className="inline-flex items-end ml-2 rounded-full text-sm text-gray-600">
              {sourceData.length} Total
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
                  <PlusIcon style={{ color: "white" }} size={13} /> Create New
                  Sso
                </div>
              </CommonButton>
            )}
          <GridButton setView={setView} view={view} />
        </div>
      </div>
      {sourceData.length ? (
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
          onDataChange={() => {}}
          routeName={routeName}
          setFilteredData={setFilteredTableData}
          // setOpenDrawer={handleDrawer}
          openDrawerId={openDrawer?.id}
          tableView={view}
          cardFiled={{
            id: "id",
            title: "ssoConfigurationName",
            subTitle1: "id",
            subTitle2: "providerName",
            status: "status",
            assets: "noOfRecords",
          }}
          isDrawer={isDrawer}
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

export default SsoTable;
