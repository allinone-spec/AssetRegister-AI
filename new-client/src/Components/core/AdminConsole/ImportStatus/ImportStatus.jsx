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
import {
  addFilter,
  removeFilter,
  setFilters,
} from "../../../../redux/Slices/AdvancedFilterSlice";
import { DeleteConfirm } from "../../../Common/DeleteConfirm";
import { TbCopy } from "react-icons/tb";
import { STATUS_META } from "../../../Common/sideDrawer/utils";
import { D, rgb } from "../../../Common/Commom_Saved_Job";
import GridButton from "../../../Common/GridButton";
import { Cloud } from "lucide-react";
import { ImportStatusDrawer } from "../../../Common/sideDrawer/ImportStatusDrawer";

const filterKeyWithId = `${filterKey.IMPORTSTATUS}_${localStorage.getItem(
  "user-id",
)}`;

const ImportStatus = ({ routeName }) => {
  const dispatch = useDispatch();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [view, setView] = useState("table");
  const [saveFilters, setSaveFilters] = useState();
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isGrouped, setIsGrouped] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [jobFilter, setJobFilter] = useState("All");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const filters = useSelector((state) => state.advancedFilter.filters);

  useEffect(() => {
    dispatch(setHeadingTitle("Import Status"));
    getCommonRegisterRequest(
      `/AssetRegister/filterRequest/${filterKeyWithId}/get`,
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
              })),
            ),
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
              },
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
            selectedObject ? result.objectRecords : result.totalRecords,
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
    [selectedObject, saveFilters],
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
    [selectedObject, saveFilters, isGrouped],
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

  const filterHandler = (value) => {
    filters.find(
      (v, index) => v.column === "status" && dispatch(removeFilter(index)),
    );
    // if (isFilter) return;
    if (value !== "All")
      dispatch(
        addFilter({
          column: "status",
          condition: "Contains",
          value,
          operator: "AND",
        }),
      );
    setJobFilter(value);
  };
  const column = jobs.length
    ? Object.keys(...jobs).map((key) => {
        // Special handling for errorMessage column to truncate text
        if (key === "jobName") {
          return {
            accessorKey: key,
            header: "JOB",
            cell: ({ row }) => {
              const name = row.original.jobName;

              return (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100">
                    <Cloud size={16} />
                  </div>
                  <span className="font-medium text-gray-700">{name}</span>
                </div>
              );
            },
          };
        }
        if (key === "status") {
          return {
            accessorKey: key,
            header: "STATUS",
            cell: ({ row }) => {
              const status = row.original.status;

              const statusStyle = {
                success: "bg-green-100 text-green-700",
                running: "bg-blue-100 text-blue-700",
                failed: "bg-red-100 text-red-700",
                pending: "bg-yellow-100 text-yellow-700",
              };
              const statusBadgeStyle = {
                success: "bg-green-500 text-green-700",
                running: "bg-blue-500 text-blue-700",
                failed: "bg-red-500 text-red-700",
                pending: "bg-yellow-500 text-yellow-700",
              };

              return (
                <div>
                  <span
                    className={`pl-5 pr-3 py-1 relative text-xs font-semibold rounded-full ${statusStyle[status.toLocaleLowerCase()]}`}
                  >
                    <div
                      className={`rounded-full absolute left-2 top-2 p-1 ${statusBadgeStyle[status.toLocaleLowerCase()]}`}
                    />
                    {status}
                  </span>
                </div>
              );
            },
          };
        }
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
    <div className={`${!loading && "flex"}`}>
      <PageLayout className="flex-1 px-3">
        <div className="flex flex-row items-center justify-between gap-4 p-3 pt-7">
          <div className="flex sm:gap-6 justify-end">
            <div className="flex">
              <div className="font-extrabold text-2xl">Import Status</div>
              {/* <span className="text-sm font-medium text-gray-600"></span> */}
              <span className="inline-flex items-center pl-4 rounded-full text-sm text-gray-400">
                {totalRecords} Total
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
          <GridButton setView={setView} view={view} />
        </div>
        {["All", "Success", "Running", "Failed", "Pending"].map((f) => {
          const m = STATUS_META[f] || {
            fg: "#6f2fe1",
            // bg: aDim,
            // border: aMid,
          };
          const active = jobFilter === f;
          return (
            <button
              key={f}
              onClick={() => filterHandler(f)}
              className="text-xs rounded-full cursor-pointer ml-2"
              style={{
                padding: "6px 14px",
                fontWeight: 700,
                border: `1px solid ${active ? m.fg : D.border}`,
                background: active ? m.bg : "transparent",
                color: active ? m.fg : D.faint,
                transition: "all .15s",
              }}
            >
              {f}
            </button>
          );
        })}
        <div className="pt-5">
          <DataTable
            data={jobs}
            columns={column}
            setOpenDrawer={setOpenDrawer}
            openDrawer={openDrawer}
            tableView={view}
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
            cardFiled={{
              id: "id",
              title: "jobName",
              subTitle1: "id",
              subTitle2: "jobName",
              status: "status",
              assets: "noOfRecords",
            }}
          />
        </div>
        <DeleteConfirm
          isOpen={isDeleteModalOpen}
          close={() => setIsDeleteModalOpen(false)}
          handleDelete={handleDeleteStatusData}
          deleteLoading={deleteLoading}
        />
      </PageLayout>
      {/* <ImportStatusDrawer
        job={openDrawer?.row?.original ? openDrawer?.row?.original : {}}
        D={D}
        accent={"#6f2fe1"}
        aDim={`rgba(${rgb},0.09)`}
        rgb={rgb}
        open={openDrawer}
        onClose={() => setOpenDrawer(null)}
        deleteActionHandler={handleDelete}
      /> */}
    </div>
  );
};

export default ImportStatus;
