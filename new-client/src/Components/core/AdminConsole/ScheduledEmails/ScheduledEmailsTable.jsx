import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import toast from "react-hot-toast";
import {
  getRequest,
  deleteRequest,
  patchRequest,
} from "../../../../Service/Console.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { DeleteConfirm } from "../../../Common/DeleteConfirm";
import PageLayout from "../../../Common/PageLayout";
import DataTable from "../../../Common/DataTable";
import { EmailModal } from "../../../Common/EmailModal";
import GridButton from "../../../Common/GridButton";

const ScheduledEmailsTable = ({
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
  const selectedObject = useSelector((state) => state.selectedObject.value);
  // const { permissionDetails, permissionList } = useSelector(
  //   (state) => state.permission,
  // );
  const [view, setView] = useState("table");
  useEffect(() => {
    dispatch(setHeadingTitle("Settings / Scheduled Emails"));
  }, []);

  const [selectedId, setSelectedId] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sourceData, setSourceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState([]);

  useEffect(() => {
    // if (selectedObject)
    fetchScheduledEmails();
  }, [selectedObject]);

  const fetchScheduledEmails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRequest(
        `/schedule/getSchedulePortal/${3}/objectId`,
      );

      if (response?.status === 200 && response?.data) {
        const sanitizedData = Array.isArray(response.data)
          ? response.data.map(({ emailDetails, ...rest }) => rest)
          : [];

        setSourceData(response.data);
        setFilteredTableData(sanitizedData);
      } else {
        setSourceData([]);
        setFilteredTableData([]);
      }
    } catch (error) {
      console.error("Error fetching scheduled emails:", error);
      setSourceData([]);
      setFilteredTableData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedObject]);

  const handleDelete = async (row) => {
    setSelectedId(row?.id);
    setIsDeleteModalOpen(true);
    setOpenDeleteModel(false);
  };

  useEffect(() => {
    if (openDeleteModel) handleDelete({ row: openDeleteModel });
  }, [openDeleteModel]);

  const handleEdit = (row) => {
    const fullRow = sourceData.find((item) => item?.id === row?.id);
    setSelectedEmail(fullRow || row);
    setIsEditModalOpen(true);
    setOpenDrawer(fullRow || row);
  };

  const handleDeleteScheduledEmail = async () => {
    setDeleteLoading(true);
    try {
      const response = await deleteRequest(
        `/schedule/deleteSchedulePortal/${selectedId}/schedulerId`,
      );
      if (response?.status === 200) {
        setIsDeleteModalOpen(false);
        toast.success("Successfully Deleted Scheduled Email");
        fetchScheduledEmails();
      }
    } catch (error) {
      setIsDeleteModalOpen(false);
      toast.error(
        error.response?.data?.error || "Failed to Delete Scheduled Email",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdateScheduledEmail = async (updatedData) => {
    try {
      const response = await patchRequest(
        `/schedule/${selectedEmail?.id}/update`,
        updatedData,
      );

      if (response?.status === 200 || response?.status === 201) {
        toast.success("Successfully Updated Scheduled Email");
        setIsEditModalOpen(false);
        setSelectedEmail(null);
        fetchScheduledEmails();
      }
    } catch (error) {
      console.error("Error updating scheduled email:", error);
      toast.error("Failed to update scheduled email");
    }
  };

  const columns = filteredTableData.length
    ? Object.keys(...filteredTableData).map((key) => {
        if (key === "nextExecutionDate") {
          return {
            accessorKey: key,
            header: key,
            cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
          };
        }
        return {
          accessorKey: key,
          header: key,
          enableLinkHandler: key === "scheduleTime" && handleDrawer,
        };
      })
    : [];

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-64">
          <CircularProgress />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="font-extrabold text-2xl">Schedule Emails</div>
        <GridButton setView={setView} view={view} />
      </div>
      {selectedObject ? (
        <div className="py-4">
          <DataTable
            columns={columns}
            data={filteredTableData}
            enableAction
            editActionHandler={handleEdit}
            deleteActionHandler={handleDelete}
            routeName={routeName}
            enableCreateEmail={false}
            enableCreateDashboard={false}
            enableCreateView={false}
            enableRowOrdering={false}
            enableRowSelection={false}
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
        </div>
      ) : (
        <div className="flex justify-center items-center h-full">
          Please select object from dropdown to show data
        </div>
      )}

      {isDeleteModalOpen && (
        <DeleteConfirm
          handleDelete={handleDeleteScheduledEmail}
          isOpen={isDeleteModalOpen}
          close={() => setIsDeleteModalOpen(false)}
          loading={deleteLoading}
          title="Delete Scheduled Email"
          message="Are you sure you want to delete this scheduled email? This action cannot be undone."
        />
      )}

      {/* {isEditModalOpen && (
        <EmailModal
          isEmailModalOpen={isEditModalOpen}
          CloseEmailModal={() => {
            setIsEditModalOpen(false);
            setSelectedEmail(null);
          }}
          routeName={routeName}
          jobName={selectedEmail?.jobName || ""}
          tableName={selectedEmail?.tableName || ""}
          viewId={selectedEmail?.viewId || ""}
          isJob={true}
          scheduleType={selectedEmail?.scheduleType || "email"}
          showScheduleManagement={false}
          editData={selectedEmail}
          onUpdate={handleUpdateScheduledEmail}
        />
      )} */}
    </PageLayout>
  );
};

export default ScheduledEmailsTable;
