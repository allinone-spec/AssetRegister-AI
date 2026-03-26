import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteRequest,
  patchRequest,
  postDataRequest,
} from "../../../../Service/admin.save";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useSelector } from "react-redux";
import DataTable from "../../../Common/DataTable";
import PageLayout from "../../../Common/PageLayout";
import { getCommonRegisterRequest } from "../../../../Service/Console.service";
import { filterKey, tableNameEnum } from "../../DataConsole/data";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import { DeleteConfirm } from "../../../Common/DeleteConfirm";
import { TbCopy } from "react-icons/tb";

const filterKeyWithId = `${filterKey.IMPORTSTATUS}_${localStorage.getItem(
  "user-id"
)}`;

const ImportStatus = ({ routeName }) => {
  const dispatch = useDispatch();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveFilters, setSaveFilters] = useState();
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isGrouped, setIsGrouped] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const selectedObject = useSelector((state) => state.selectedObject.value);

  useEffect(() => {
    dispatch(setHeadingTitle("Import Status"));
    getCommonRegisterRequest(
      `/AssetRegister/filterRequest/${filterKeyWithId}/get`
    )
      .then(({ data }) => {
        setSaveFilters(data);
        data?.filterExpression &&
          dispatch(
            setFilters(
              data.filterExpression?.conditions?.map((v) => ({
                column: v.field,
                operator: data.filterExpression.logic,
                condition: v.operator,
                value: v.value,
              }))
            )
          );
      })
      .catch(() => {
        setSaveFilters({ tableName: tableNameEnum.IMPORTSTATUS });
      });
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  useEffect(() => {
    if (!saveFilters?.grouping?.length) setIsGrouped(0);
  }, [saveFilters?.grouping?.length]);

  const getImportStatus = useCallback(
    async (page = 0, size = 10) => {
      try {
        const response = await postDataRequest(
          `/Status/get?page=${
            saveFilters?.grouping?.length ? -1 : page
          }&size=${size}`,
          saveFilters?.grouping?.length
            ? { filterKey: filterKeyWithId, objectId: selectedObject }
            : {
                ...saveFilters,
                filterKey: filterKeyWithId,
                objectId: selectedObject,
              }
        );
        if (response.status === 200) {
          const result = response.data;
          const data = result.data.map((v) => ({
            id: v.id,
            jobName: v.jobName,
            ...v,
          }));
          setIsGrouped(saveFilters?.grouping?.length);
          if (saveFilters?.grouping?.length) dispatch(setFilters([]));
          setJobs(data);
          setTotalRecords(
            selectedObject ? result.objectRecords : result.totalRecords
          );
          setFilteredTableData(result.totalFilterRecords || 0);
          setTotalPages(result.totalPages || 0);
        } else {
          setJobs([]);
          setTotalRecords(0);
          setFilteredTableData(0);
          setTotalPages(0);
          setIsGrouped(0);
        }
      } catch (error) {
        setJobs([]);
        setTotalRecords(0);
        setFilteredTableData(0);
        setTotalPages(0);
        setIsGrouped(0);
        console.log(error, "error");
      } finally {
        setLoading(false);
      }
    },
    [selectedObject, saveFilters]
  );

  const fetchAllSourceData = useCallback(async () => {
    try {
      const response = await postDataRequest(`/Status/get?page=${-1}`, {
        ...saveFilters,
        filterKey: filterKeyWithId,
        objectId: selectedObject,
      });
      if (response?.status === 200)
        return (
          response.data?.data.map((v) => ({
            id: v.id,
            jobName: v.jobName,
            ...v,
          })) || []
        );
      else return [];
    } catch (error) {
      console.log("Error fetching all source data:", error);
      return [];
    }
  }, [saveFilters, filterKeyWithId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        (saveFilters?.tableName || saveFilters?.tableName === null) &&
        !isGrouped
      )
        getImportStatus(pagination.pageIndex, pagination.pageSize);
    }, 1000 * 10);

    return () => clearInterval(interval);
  }, [pagination, saveFilters, isGrouped, selectedObject]);

  useEffect(() => {
    if (
      (saveFilters?.tableName || saveFilters?.tableName === null) &&
      !isGrouped
    ) {
      setLoading(true);
      getImportStatus(pagination.pageIndex, pagination.pageSize);
    }
  }, [selectedObject, saveFilters, isGrouped]);

  const handlePaginationChange = useCallback(
    (pageSize, page, isCallApi = true) => {
      if (!isGrouped && isCallApi) {
        setLoading(true);
        getImportStatus(page, pageSize);
      }
      setPagination({
        pageSize: pageSize,
        pageIndex: page,
      });
    },
    [selectedObject, saveFilters, isGrouped]
  );

  const handleDelete = async (row) => {
    setSelectedId(row.id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteStatusData = async () => {
    setDeleteLoading(true);
    try {
      const response = await deleteRequest(`/Status/${selectedId}/delete`);
      if (response.status === 200) {
        setIsDeleteModalOpen(false);
        toast.success("Successfully Deleted Status");
        getImportStatus(pagination.pageIndex, pagination.pageSize);
      }
    } catch (error) {
      console.error(error || "Internal server error");
      toast.error(error.response.data.error || "Failed to Delete Folder");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteLoading(false);
    }
  };

  const handleCancelStatusData = async (val) => {
    try {
      const response = await patchRequest(`/Status/${val.id}/cancelled`);
      if (response?.status === 200) {
        toast.success("Successfully cancelled Status");
        getImportStatus(pagination.pageIndex, pagination.pageSize);
      }
    } catch (error) {
      console.error(error || "Internal server error");
    }
  };

  // const filteredJobs = selectedObject
  //   ? jobs.filter((job) => job.objectId == selectedObject)
  //   : jobs;

  const column = jobs.length
    ? Object.keys(...jobs).map((key) => {
        // Special handling for errorMessage column to truncate text
        if (key === "errorMessage") {
          return {
            accessorKey: key,
            header: key,
            enableGrouping: true,
            enableTextFiled: false,
            cell: ({ row }) => {
              const errorMessage = row.original.errorMessage;
              if (!errorMessage) return "";

              // Truncate to 50 characters
              const truncatedText =
                errorMessage.length > 100
                  ? `${errorMessage.substring(0, 100)}...`
                  : errorMessage;

              const handleCopy = async () => {
                try {
                  await navigator.clipboard.writeText(errorMessage);
                  toast.success("Error message copied to clipboard!");
                } catch (error) {
                  console.error("Failed to copy text: ", error);
                  toast.error("Failed to copy error message");
                }
              };

              return (
                <div
                  className="flex items-center gap-2"
                  style={{ maxWidth: "250px" }}
                >
                  <div
                    title={errorMessage}
                    className="cursor-help flex-1"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {truncatedText}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy error message"
                  >
                    <TbCopy />
                  </button>
                </div>
              );
            },
          };
        }

        // Default column configuration for other columns
        return {
          accessorKey: key,
          header: key,
          enableGrouping: true,
          enableTextFiled: false,
        };
      })
    : [];

  const handleDataChange = (newData) => {
    console.log("Data updated:", newData);
  };

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 p-3 pt-7">
        <div className="flex gap-3 sm:gap-6 justify-end absolute right-8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {totalRecords}
            </span>
          </div>
          {filteredTableData !== totalRecords && (
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
      <div className="pt-5">
        <DataTable
          data={jobs}
          columns={column}
          enableRowSelection={false}
          enableGrouping={true}
          enableCreateDashboard={false}
          enableCreateView={false}
          enableFiltering={false}
          enableRowOrdering={false}
          enableAction
          cancelActionHandle={handleCancelStatusData}
          deleteActionHandler={handleDelete}
          onDataChange={handleDataChange}
          routeName={routeName}
          totalRecords={
            saveFilters?.grouping?.length ? undefined : filteredTableData
          }
          pagination={saveFilters?.grouping?.length ? undefined : pagination}
          totalPages={saveFilters?.grouping?.length ? undefined : totalPages}
          onPaginationChange={
            saveFilters?.grouping?.length ? undefined : handlePaginationChange
          }
          isLoading={loading}
          setSaveFilters={setSaveFilters}
          saveFilters={saveFilters}
          setFilteredData={setFilteredTableData}
          tableName={tableNameEnum.IMPORTSTATUS}
          fetchAllSourceData={fetchAllSourceData}
        />
      </div>
      <DeleteConfirm
        isOpen={isDeleteModalOpen}
        close={() => setIsDeleteModalOpen(false)}
        handleDelete={handleDeleteStatusData}
        deleteLoading={deleteLoading}
      />
    </PageLayout>
  );
};

export default ImportStatus;
