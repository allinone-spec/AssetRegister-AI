import { useEffect, useMemo, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
// import { useTheme } from "../../../../ThemeContext";
import DeleteConfirmationModal from "../../../Common/DeleteConfirmationModal";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { deleteRequest, getRequest } from "../../../../Service/api.service";
// import { AddObjectDataModal } from "../../../Common/AdddObjectModal";
// import EditObjectDataModal from "../../../Common/EditObject";
// import { MdOutlineAddCircleOutline } from "react-icons/md";
import PageLayout from "../../../Common/PageLayout";
import DataTable from "../../../Common/DataTable";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import { tableNameEnum } from "../data";
import CommonButton from "../../../Common/CommonButton";
import { PlusIcon } from "lucide-react";
import GridButton from "../../../Common/GridButton";
import LoadingBar from "../../../Common/LoadingBar";

const ObjectConfig = ({
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
  // const { bgColor } = useTheme();
  // const { backgroundColor } = bgColor;
  const [isLoading, setLoading] = useState(false);
  const [view, setView] = useState("table");
  const selectedObject = useSelector((state) => state.selectedObject.value);
  // const { permissionDetails, permissionList } = useSelector(
  //   (state) => state.permission,
  // );
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [data, setData] = useState([]);
  // const [addObjectModal, setAddObjectModal] = useState(false);
  // const [editingData, setEditingData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  // const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    dispatch(setHeadingTitle("Object"));
  }, []);

  const getAllObjects = async () => {
    try {
      setLoading(true);
      const response = await getRequest("/objects/readAll");
      if (response.status === 200 && response.data) {
        setData(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      setData([]);
      setLoading(false);
    }
  };
  useEffect(() => {
    getAllObjects();
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  useEffect(() => {
    if (openDeleteModel) handleDelete(openDeleteModel);
  }, [openDeleteModel]);

  const handleEdit = (user) => {
    // setEditingData(user);
    setOpenDrawer(user);
    setEditJob(true);
  };

  const handleDelete = (user) => {
    console.log("user", user);
    setDeleteData(user?.objectId || user);
    setDeleteModalOpen(true);
    setOpenDeleteModel(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      const response = await deleteRequest(`/objects/${deleteData}/delete`);
      if (response.status === 200) {
        toast.success("Deleted Succesfully");
        setDeleteModalOpen(false);
        getAllObjects();
        setLoading(false);
      }
    } catch (error) {
      toast.error(error.response.data.error || "Internal Server Error");
    } finally {
      setDeleteModalOpen(false);
      setLoading(false);
    }
  };

  // const handleCloseEditModal = () => {
  //   setEditModalOpen(false);
  // };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const handleAddObjectModal = () => {
    setOpenDrawer({});
    setEditJob(true);
    // setAddObjectModal(true);
  };

  // const closeAddObjectModal = () => {
  //   setAddObjectModal(false);
  // };

  const filteredObject = useMemo(() => {
    return selectedObject
      ? data.filter((job) => job?.objectId == selectedObject)
      : data;
  }, [selectedObject, data]);

  const column = filteredObject.length
    ? Object.keys(...filteredObject).map((key) => ({
        accessorKey: key,
        header: key,
        enableLinkHandler: key === "objectName" && handleDrawer,
        enableGrouping: true,
      }))
    : [];

  if (isLoading) return <LoadingBar />;

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex items-center gap-2">
          <div className="font-extrabold text-2xl">Object</div>
          <div className="flex gap-3 sm:gap-6 justify-start">
            <span className="ml-2 py-0.5 text-sm text-gray-600">
              {filteredObject.length} Total
            </span>
            {filteredTableData !== filteredObject.length &&
            filteredObject.length ? (
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
        <div className="flex gap-1 sm:gap-6 justify-end mt-3">
          <CommonButton onClick={handleAddObjectModal} className="bg-accent">
            <div className="flex gap-2 items-center">
              <PlusIcon style={{ color: "white" }} size={13} /> Add Object
            </div>
          </CommonButton>
          <GridButton setView={setView} view={view} />
        </div>
      </div>
      {filteredObject.length ? (
        <DataTable
          key={selectedObject || "all"}
          isSelectedObject
          data={filteredObject}
          columns={column}
          enableRowOrdering={false}
          enableRowSelection={false}
          enableFiltering={false}
          enableEditing={true}
          enableAction={true}
          enableCreateDashboard={false}
          enableCreateView={false}
          editActionHandler={handleEdit}
          deleteActionHandler={handleDelete}
          enableGrouping={true}
          onDataChange={() => {}}
          tableId={1}
          setFilteredData={setFilteredTableData}
          routeName={routeName}
          tableName={tableNameEnum.OBJECT}
          tableView={view}
          // setOpenDrawer={handleDrawer}
          openDrawerId={openDrawer?.objectId}
          cardFiled={{
            id: "objectId",
            title: "objectName",
            subTitle1: "objectId",
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
      {/* <EditObjectDataModal
        open={editModalOpen}
        handleClose={handleCloseEditModal}
        data={editingData || {}}
        onSave={handleSave}
        onRefresh={getAllObjects}
      />
      <AddObjectDataModal
        open={addObjectModal}
        handleClose={closeAddObjectModal}
        onRefresh={getAllObjects}
      /> */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        handleClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isLoading={isLoading}
      />
    </PageLayout>
  );
};

export default ObjectConfig;
