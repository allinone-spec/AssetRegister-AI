import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Clock, Info } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import { getCommonRegisterRequest } from "../../../../Service/Console.service";
import DataTable from "../../../Common/DataTable";
import { postDataRequest } from "../../../../Service/admin.save";
import {
  setFilters,
  addFilter,
  removeFilter,
} from "../../../../redux/Slices/AdvancedFilterSlice";
import HistoryModal from "../../../Common/HistoryModal";

const getStatusStyling = (value) => {
  if (!value) return {};

  const normalizedValue = value.toString().toLowerCase().trim();
  const commonStyles = {
    fontWeight: "600",
    padding: "4px 8px",
    borderRadius: "30px",
    textAlign: "center",
    display: "inline-block",
    minWidth: "70px",
  };

  switch (normalizedValue) {
    case "matched":
      return {
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        color: "#059669",
        ...commonStyles,
      };
    case "partially matched":
    case "new":
      return {
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        color: "#D97706",
        ...commonStyles,
      };
    case "deleted":
      return {
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        color: "#DC2626",
        ...commonStyles,
      };
    default:
      return {
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        color: "#D97706",
        ...commonStyles,
      };
  }
};

const ReportsCommonTable = ({
  title,
  type,
  routeName,
  data,
  setDrawerMode,
}) => {
  const [sourceData, setSourceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGrouped, setIsGrouped] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [saveFilters, setSaveFilters] = useState();
  const [totalRecords, setTotalRecords] = useState(0);
  const [primaryKey, setPrimaryKey] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    numberID: null,
  });
  const [importStatusFilter, setImportStatusFilter] = useState("All");
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.advancedFilter.filters);

  const { state } = data ? { state: data } : useLocation();
  const { jobName } = data ? { jobName: data.jobName } : useParams();

  useEffect(() => {
    dispatch(setHeadingTitle(`${title} / ${jobName}`));
  }, [title, jobName]);

  useEffect(() => {
    if (!saveFilters?.grouping?.length) setIsGrouped(0);
  }, [saveFilters?.grouping?.length]);

  useEffect(() => {
    if (saveFilters?.grouping?.length) fetchSourceData();
  }, [
    saveFilters?.grouping,
    saveFilters?.xDaysFilter?.xDays,
    saveFilters?.xDaysFilter?.columnNames,
  ]);

  useEffect(() => {
    getCommonRegisterRequest(
      `/AssetRegister/filterRequest/${type === "getAC" ? "AC" : "DC"}_${
        state?.object
      }_${jobName}_${localStorage.getItem("user-id")}/get`,
    )
      .then(({ data }) => {
        setSaveFilters({
          ...data,
          ...(data?.xDaysFilter?.xDays
            ? {
                xFilter: data.xFilter,
                xDaysFilter: data.xDaysFilter,
              }
            : {
                xFilter: false, // Default value
                xDaysFilter: null,
              }),
        });
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
        setSaveFilters({
          tableName: type === "getAC" ? state?.ACTableName : state?.DCTableName,
          xFilter: false, // Default value
          xDaysFilter: null,
        });
      });
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  useEffect(() => {
    if (
      (saveFilters?.tableName || saveFilters?.tableName === null) &&
      !saveFilters?.grouping?.length
    )
      fetchSourceData();
    setImportStatusFilter(
      saveFilters?.filterExpression?.conditions.find(
        (v) => v.field === "import_status_update",
      )
        ? saveFilters?.filterExpression?.conditions.find(
            (v) => v.field === "import_status_update",
          ).value
        : "All",
    );
  }, [JSON.stringify(saveFilters)]);

  const handlePaginationChange = useCallback(
    (pageSize, page, isCallApi = true) => {
      setLoading(true);
      if (isCallApi) fetchSourceData(page, pageSize);
      setPagination({
        pageSize: pageSize,
        pageIndex: page,
      });
    },
    [saveFilters],
  );

  const fetchSourceData = useCallback(
    async (page = 0, size = 10) => {
      if (!state?.object) return;
      setLoading(true);
      try {
        const response = await postDataRequest(
          `/table/${type}/${jobName}/data?page=${
            saveFilters?.grouping?.length ? -1 : page
          }&size=${size}`,
          saveFilters?.grouping?.length
            ? {
                filterKey: `${type === "getAC" ? "AC" : "DC"}_${
                  state?.object
                }_${jobName}_${localStorage.getItem("user-id")}`,
                ...(+saveFilters?.xDaysFilter?.xDays && {
                  xFilter: saveFilters?.xFilter || false,
                  xDaysFilter: saveFilters?.xDaysFilter,
                }),
              }
            : {
                ...saveFilters,
                filterKey: `${type === "getAC" ? "AC" : "DC"}_${
                  state?.object
                }_${jobName}_${localStorage.getItem("user-id")}`,
                ...(+saveFilters?.xDaysFilter?.xDays && {
                  xFilter: saveFilters?.xFilter || false,
                  xDaysFilter: saveFilters?.xDaysFilter,
                }),
              },
        );
        if (response?.status === 200) {
          const result = response.data;
          const data = result.data;
          setSourceData(data);
          setTotalRecords(result.totalRecords || 0);
          setPrimaryKey(result.setPrimaryKey || "");
          setIsGrouped(saveFilters?.grouping?.length);
          if (saveFilters?.grouping?.length) dispatch(setFilters([]));
          setFilteredTableData(result.totalFilterRecords || 0);
          setTotalPages(result.totalPages || 0);
        } else {
          setSourceData([]);
          setTotalRecords(0);
          setTotalPages(0);
          setPrimaryKey("");
          setFilteredTableData(0);
        }
      } catch (error) {
        console.log("Error fetching data:", error);
        setSourceData([]);
        setTotalRecords(0);
        setTotalPages(0);
        setFilteredTableData(0);
        setPrimaryKey("");
      } finally {
        setLoading(false);
      }
    },
    [jobName, saveFilters],
  );

  const fetchAllSourceData = useCallback(async () => {
    try {
      const response = await postDataRequest(
        `/table/${type}/${jobName}/data?page=${-1}`,
        {
          ...saveFilters,
          filterKey: `${type === "getAC" ? "AC" : "DC"}_${
            state?.object
          }_${jobName}_${localStorage.getItem("user-id")}`,
          xFilter: saveFilters?.xFilter || false,
          xDaysFilter: saveFilters?.xDaysFilter || null,
        },
      );
      if (response?.status === 200) return response.data.data || [];
      else return [];
    } catch (error) {
      console.log("Error fetching all source data:", error);
      return [];
    }
  }, [jobName, saveFilters, type, state?.object]);

  const handleHistoryClick = (record) => {
    setHistoryModal({
      isOpen: true,
      numberID: record.numberID,
    });
  };

  const closeHistoryModal = () => {
    setHistoryModal({
      isOpen: false,
      numberID: null,
    });
  };

  const filterHandler = (value) => {
    // Remove existing import_status_update filter from Redux
    const existingFilterIndex = filters.findIndex(
      (filter) => filter.column === "import_status_update",
    );
    if (existingFilterIndex !== -1) {
      dispatch(removeFilter(existingFilterIndex));
    }

    if (value !== "All") {
      // Add new filter to Redux
      dispatch(
        addFilter({
          column: "import_status_update",
          condition: "Contains",
          value,
          operator: "AND",
        }),
      );

      // Update saveFilters with filterExpression for API call
      setSaveFilters((prev) => {
        const existingConditions = prev?.filterExpression?.conditions || [];
        // Remove existing import_status_update filter if any
        const filteredConditions = existingConditions.filter(
          (condition) => condition.field !== "import_status_update",
        );

        return {
          ...prev,
          filterExpression: {
            logic: prev?.filterExpression?.logic || "AND",
            conditions: [
              ...filteredConditions,
              {
                field: "import_status_update",
                operator: "Contains",
                value,
                table: "",
                table2: "",
                field2: "",
              },
            ],
          },
        };
      });
    } else {
      // Remove only the import_status_update filter from saveFilters
      setSaveFilters((prev) => {
        const existingConditions = prev?.filterExpression?.conditions || [];
        const filteredConditions = existingConditions.filter(
          (condition) => condition.field !== "import_status_update",
        );

        return {
          ...prev,
          filterExpression: {
            logic: prev?.filterExpression?.logic || "AND",
            conditions: filteredConditions,
          },
        };
      });
    }

    setImportStatusFilter(value);
  };
  // Define filter options based on report type
  const getFilterOptions = () => {
    if (type === "getAC") {
      return ["All", "Partially Matched", "Matched", "New", "Deleted"];
    } else {
      return ["All", "Partially Matched", "Matched", "New"];
    }
  };

  const getFilterStyling = (filterValue, isActive) => {
    const baseStyles = {
      padding: "6px 14px",
      fontWeight: 700,
      border: "1px solid",
      borderRadius: "20px",
      cursor: "pointer",
      fontSize: "12px",
      transition: "all .15s",
      margin: "0 4px",
    };

    if (isActive) {
      switch (filterValue.toLowerCase()) {
        case "matched":
          return {
            ...baseStyles,
            borderColor: "#059669",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#059669",
          };
        case "partially matched":
        case "new":
          return {
            ...baseStyles,
            borderColor: "#D97706",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "#D97706",
          };
        case "deleted":
          return {
            ...baseStyles,
            borderColor: "#DC2626",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "#DC2626",
          };
        default:
          return {
            ...baseStyles,
            borderColor: "#6f2fe1",
            backgroundColor: "rgba(111, 47, 225, 0.15)",
            color: "#6f2fe1",
          };
      }
    } else {
      return {
        ...baseStyles,
        borderColor: "#d1d5db",
        backgroundColor: "transparent",
        color: "#9ca3af",
      };
    }
  };

  const column = sourceData.length
    ? [
        // History column (first column)
        {
          accessorKey: "history",
          header: "",
          size: 50,
          enableGrouping: false,
          enableSorting: false,
          cell: ({ row }) => (
            <div className="flex justify-center">
              <button
                onClick={() => handleHistoryClick(row.original)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors group"
                title="View Import History"
              >
                <Info className="h-5 w-5 text-blue-600" />
              </button>
            </div>
          ),
        },
        // Regular columns
        ...Object.keys(...sourceData).map((key) => ({
          accessorKey: key,
          header: key,
          enableGrouping: true,
          // Special cell rendering for import_status_History column
          ...(key === "import_status_update" && {
            cell: ({ getValue }) => {
              const value = getValue();
              const styling = getStatusStyling(value);

              return (
                <div className="flex justify-center">
                  <span style={styling}>{value || ""}</span>
                </div>
              );
            },
          }),
        })),
      ]
    : [];

  if (historyModal.isOpen)
    return (
      <>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-500">
          <div className="flex items-center gap-3 pb-2">
            <button
              onClick={closeHistoryModal}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-sub hover:text-accent hover:bg-accent/5 rounded-lg border border-gray-200 dark:border-gray-500 transition"
            >
              ← Back
            </button>
            <span className="text-xs font-bold text-text-sub uppercase tracking-wide">
              Detail View
            </span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Import History - {title}
              </h2>
              <p className="text-sm text-text-sub">
                {primaryKey
                  ? `Primary Key: ${primaryKey}`
                  : `Number ID: ${historyModal.numberID}`}{" "}
                | Table Type: {type === "getAC" ? "AC" : "DC"}
              </p>
            </div>
          </div>
        </div>
        <HistoryModal
          isOpen={historyModal.isOpen}
          onClose={closeHistoryModal}
          numberID={historyModal.numberID}
          tableType={type === "getAC" ? "AC" : "DC"}
          title={title}
          jobName={jobName}
          primaryKey={primaryKey}
        />
      </>
    );

  return (
    <PageLayout className="px-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex gap-3 sm:gap-6 justify-start">
          <div className="flex items-center gap-2">
            {/* <span className="text-sm font-medium text-gray-600">Total:</span> */}
            <div className="font-extrabold text-2xl">
              {`${title} / ${jobName}`}
            </div>
            <span className="inline-flex items-end ml-2 rounded-full text-sm text-gray-600">
              {isGrouped ? sourceData.length : totalRecords} Total
            </span>
          </div>
          {isGrouped ? (
            filteredTableData !== sourceData.length && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Filtered:
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  {filteredTableData}
                </span>
              </div>
            )
          ) : saveFilters?.searchText ||
            saveFilters?.filterExpression?.conditions?.length ? (
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
      {/* Import Status Filters */}
      <div className="flex flex-wrap items-center gap-2 px-3 mb-4">
        <span className="text-sm font-medium text-gray-600 mr-2">
          Filter by Import Status:
        </span>
        {getFilterOptions().map((filterOption) => {
          const isActive = importStatusFilter === filterOption;
          return (
            <button
              key={filterOption}
              onClick={() => filterHandler(filterOption)}
              className="text-xs rounded-full cursor-pointer"
              style={getFilterStyling(filterOption, isActive)}
            >
              {filterOption}
            </button>
          );
        })}
      </div>
      <DataTable
        data={sourceData}
        columns={column}
        enableRowOrdering={false}
        enableRowSelection={false}
        enableFiltering={false}
        enableEditing={false}
        enableAction={false}
        enableGrouping={true}
        onDataChange={() => {}}
        dashboardData={{
          tableType:
            title === "Original Source" ? "original-source" : "by-ar-resource",
          tableName:
            title === "Original Source"
              ? state?.ACTableName
              : state?.DCTableName,
          objectId: state?.object,
          daysFilterShow: true,
        }}
        routeName={routeName}
        setOpenDrawer={setDrawerMode}
        setFilteredData={setFilteredTableData}
        jobName={jobName}
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
        tableId={1}
        tableName={type === "getAC" ? state?.ACTableName : state?.DCTableName}
        fetchAllSourceData={fetchAllSourceData}
      />
    </PageLayout>
  );
};

export default ReportsCommonTable;
