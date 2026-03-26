import { useCallback, useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import {
  deleteRequest,
  getRequest,
  patchRequest,
} from "../../../../Service/api.service";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import BackButton from "../../../Common/BackButton";
import DataTable from "../../../Common/DataTable";
import toast from "react-hot-toast";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import {
  addToFavorites,
  removeFromFavorites,
} from "../../../../redux/Slices/FavoritesSlice";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { DeleteConfirm } from "../../../Common/DeleteConfirm";

const FileList = ({ routeName }) => {
  const { folderId } = useParams();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const location = useLocation();
  const { folderName } = location?.state || {};

  const dispatch = useDispatch();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const navigate = useNavigate();

  const [filteredTableData, setFilteredTableData] = useState(0);
  const [sourceData, setSourceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedViewToDelete, setSelectedViewToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    dispatch(setHeadingTitle(`${folderName} `));
  }, [folderName]);

  if (!location.state) {
    return (
      <div className="p-4">
        <p>No data available. Please go back and try again.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const fetchSourceData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRequest(`/view/${folderId}/get`);
      if (response?.status === 200) {
        const result = response.data || [];
        setSourceData(
          result
            .filter((v) => delete v.filters)
            .map((v) => ({
              id: v.id,
              jobName: v?.jobName,
              ...v,
              object: v?.object?.objectName,
              objectId: v?.object?.objectId,
            })),
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setSourceData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSourceData();
    return () => {
      dispatch(setFilters([]));
    };
  }, [folderId]);

  const filterData = useMemo(
    () =>
      selectedObject
        ? sourceData.filter((e) => e?.objectId == selectedObject)
        : sourceData,
    [selectedObject, sourceData],
  );

  const navigateViewColumn = (row) => {
    navigate(`/data-console/reports/folder-list-filter?viewId=${row?.id}`, {
      state: { ...row, folderName },
    });
  };

  const deleteActionHandler = (val) => {
    setSelectedViewToDelete(val);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedViewToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await deleteRequest(
        `/view/${selectedViewToDelete?.id}/delete`,
      );

      if (response?.status === 200) {
        // Remove from favorites if it was favorited
        if (selectedViewToDelete.favourite) {
          dispatch(
            removeFromFavorites({
              type: "view",
              viewId: selectedViewToDelete.id,
            }),
          );
        }

        toast.success("View deleted successfully");
        fetchSourceData();
        setIsDeleteModalOpen(false);
        setSelectedViewToDelete(null);
      }
    } catch (error) {
      console.error(error || "Internal server error");
      toast.error(error.response?.data?.error || "Failed to Delete View");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFavoriteToggle = async (view, e) => {
    e.stopPropagation();
    try {
      const response = await patchRequest(`/view/${view.id}/update`, {
        favourite: !view.favourite,
      });

      if (response?.status === 200) {
        // Update local state
        const updatedData = sourceData.map((item) =>
          item.id === view.id ? { ...item, favourite: !item.favourite } : item,
        );
        setSourceData(updatedData);

        // Update Redux favorites store
        if (!view.favourite) {
          // Adding to favorites
          dispatch(
            addToFavorites({
              type: "view",
              view: {
                ...view,
                favourite: true,
                folderId: folderId,
                folderName: folderName,
              },
            }),
          );
        } else {
          // Removing from favorites
          dispatch(
            removeFromFavorites({
              type: "view",
              viewId: view.id,
            }),
          );
        }

        toast.success(
          view.favourite ? "Removed from favorites" : "Added to favorites",
        );
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const column = filterData.length
    ? [
        ...Object.keys(...filterData).map((key) => ({
          accessorKey: key,
          header: key,
          enableGrouping: true,
          enableLinkHandler:
            key === "viewName" &&
            permissionList?.includes(routeName) &&
            // permissionDetails[routeName]?.hasWriteOnly &&
            navigateViewColumn,
        })),
        // Add favorites column
        {
          accessorKey: "favorite",
          header: "Favorite",
          enableGrouping: false,
          enableSorting: false,
          cell: ({ row }) => (
            <div className="flex justify-center">
              {row.original.favourite ? (
                <MdFavorite
                  className={`cursor-pointer text-red-500 hover:text-red-600 ${permissionList.includes(routeName) && !permissionDetails[routeName]?.hasWriteOnly ? "opacity-50 pointer-events-none" : "opacity-100"}`}
                  onClick={(e) => handleFavoriteToggle(row.original, e)}
                  title="Remove from favorites"
                />
              ) : (
                <MdFavoriteBorder
                  className={`cursor-pointer text-gray-400 hover:text-red-500 ${permissionList.includes(routeName) && !permissionDetails[routeName]?.hasWriteOnly ? "opacity-50 pointer-events-none" : "opacity-100"}`}
                  onClick={(e) => handleFavoriteToggle(row.original, e)}
                  title="Add to favorites"
                />
              )}
            </div>
          ),
        },
      ]
    : [];

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 py-7">
        <div className="absolute top-[85px]">
          <BackButton />
        </div>

        <div className="flex gap-3 sm:gap-6 justify-between absolute right-7">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {sourceData.length}
            </span>
          </div>
          {filteredTableData !== sourceData.length && sourceData.length ? (
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
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : filterData.length ? (
        <DataTable
          key={selectedObject || "all"}
          isSelectedObject
          data={filterData}
          columns={column}
          enableRowOrdering={false}
          enableRowSelection={false}
          enableFiltering={false}
          enableEditing={true}
          enableAction={true}
          enableGrouping={true}
          enableCreateView={false}
          enableCreateDashboard={false}
          onDataChange={() => {}}
          routeName={routeName}
          deleteActionHandler={deleteActionHandler}
          setFilteredData={setFilteredTableData}
          dashboardData={{
            tableType: "custom-saved-job",
            folderId: location.state?.id,
          }}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )}

      <DeleteConfirm
        isOpen={isDeleteModalOpen}
        close={() => {
          setIsDeleteModalOpen(false);
          setSelectedViewToDelete(null);
        }}
        handleDelete={handleConfirmDelete}
        deleteLoading={deleteLoading}
      />
    </PageLayout>
  );
};

export default FileList;
