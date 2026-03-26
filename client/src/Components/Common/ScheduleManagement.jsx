import { useState, useEffect, useCallback } from "react";
import { Button, CircularProgress } from "@mui/material";
import toast from "react-hot-toast";
import { getRequest, deleteRequest } from "../../Service/admin.save";
import { useSelector } from "react-redux";
import DataTable from "./DataTable";
import { DeleteConfirm } from "./DeleteConfirm";
import { EditScheduleModal } from "./EditScheduleModal";

export const ScheduleManagement = ({ routeName, isVisible = false }) => {
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const selectedObject = useSelector((state) => state.selectedObject.value);

  // Fetch existing schedules for the selected object
  const fetchExistingSchedules = useCallback(async () => {
    if (!selectedObject || !isVisible) return;

    setSchedulesLoading(true);
    try {
      const response = await getRequest(
        `/schedule/getSchedulePortal/${selectedObject}/objectId`
      );
      if (response?.status === 200) {
        setExistingSchedules(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to fetch existing schedules");
    } finally {
      setSchedulesLoading(false);
    }
  }, [selectedObject, isVisible]);

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setIsEditModalOpen(true);
  };

  const handleDeleteSchedule = (schedule) => {
    setScheduleToDelete(schedule);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await deleteRequest(
        `/schedule/deleteSchedulePortal/${scheduleToDelete.id}/schedulerId`
      );
      if (response?.status === 200) {
        toast.success("Schedule deleted successfully!");
        await fetchExistingSchedules();
        setIsDeleteModalOpen(false);
        setScheduleToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteMultipleSchedules = async () => {
    if (selectedSchedules.length === 0) return;

    setDeleteLoading(true);
    try {
      const deletePromises = selectedSchedules.map((schedule) =>
        deleteRequest(`/schedule/task/${schedule.id}`)
      );

      await Promise.all(deletePromises);
      toast.success(
        `${selectedSchedules.length} schedule(s) deleted successfully!`
      );
      await fetchExistingSchedules();
      setSelectedSchedules([]);
    } catch (error) {
      console.error("Error deleting schedules:", error);
      toast.error("Failed to delete schedules");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleScheduleUpdated = async () => {
    await fetchExistingSchedules();
  };

  // Effect to fetch schedules when component becomes visible
  useEffect(() => {
    if (isVisible && selectedObject) {
      fetchExistingSchedules();
    }
  }, [isVisible, selectedObject, fetchExistingSchedules]);

  const columns = existingSchedules.length
    ? Object.keys(...existingSchedules).map((key) => {
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
        };
      })
    : [];

  if (!isVisible) return null;

  return (
    <div className="mt-6 h-[70vh] overflow-y-scroll">
      <div className="flex justify-between items-center mb-4">
        {selectedSchedules.length > 0 && (
          <Button
            onClick={handleDeleteMultipleSchedules}
            disabled={deleteLoading}
            variant="contained"
            color="error"
            size="small"
          >
            {deleteLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              `Delete Selected (${selectedSchedules.length})`
            )}
          </Button>
        )}
      </div>

      {schedulesLoading ? (
        <div className="flex justify-center items-center h-32">
          <CircularProgress />
        </div>
      ) : existingSchedules.length > 0 ? (
        <DataTable
          data={existingSchedules}
          columns={columns}
          enableRowSelection={false}
          enableFiltering={false}
          enableAction={true}
          enableGrouping={false}
          routeName={routeName}
          enableColumnOrdering={false}
          enableRowOrdering={false}
          enableCreateDashboard={false}
          enableCreateView={false}
          enableCreateEmail={false}
          enableDownload={false}
          enableFilter={false}
          enableColumnVisibility={false}
          enableToSearch={false}
          enableAdvanceFilter={false}
          enableGroupByFilter={false}
          deleteId="id"
          editActionHandler={handleEditSchedule}
          deleteActionHandler={handleDeleteSchedule}
          setSelectedRows={setSelectedSchedules}
          selectedRows={selectedSchedules}
          pageSize={5}
          isSelectedObject
          className="relative"
          isAppliedFilter={false}
        />
      ) : (
        <div className="text-center text-gray-500 py-8 border rounded-lg bg-gray-50">
          <p className="text-lg mb-2">📅 No Schedules Found</p>
          <p className="text-sm">
            No schedules found for this object. Create your first schedule
            above.
          </p>
        </div>
      )}

      {/* Edit Schedule Modal */}
      <EditScheduleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSchedule(null);
        }}
        schedule={editingSchedule}
        onScheduleUpdated={handleScheduleUpdated}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirm
        isOpen={isDeleteModalOpen}
        close={() => {
          setIsDeleteModalOpen(false);
          setScheduleToDelete(null);
        }}
        handleDelete={confirmDeleteSchedule}
        deleteLoading={deleteLoading}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule? This action cannot be undone."
      />
    </div>
  );
};
