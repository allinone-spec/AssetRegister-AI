import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import { getCommonRegisterRequest } from "../../../../Service/Console.service";
import { useLocation, useParams } from "react-router-dom";
import BackButton from "../../../Common/BackButton";
import DataTable from "../../../Common/DataTable";
import { postDataRequest } from "../../../../Service/admin.save";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import HistoryModal from "../../../Common/HistoryModal";
import { Info } from "lucide-react";

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

const ReportsCommonTable = ({ title, type, routeName }) => {
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
  const dispatch = useDispatch();
  const { state } = useLocation();
  const { jobName } = useParams();

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
      }_${jobName}_${localStorage.getItem("user-id")}/get`
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
              }))
            )
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
    [saveFilters]
  );

  const fetchSourceData = useCallback(
    async (page = 0, size = 10) => {
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
              }
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
    [jobName, saveFilters]
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
        }
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
  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 py-7">
        <div className="absolute">
          <BackButton />
        </div>
        <div className="flex gap-3 sm:gap-6 justify-between absolute right-7">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {isGrouped ? sourceData.length : totalRecords}
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
          dataSource: type === "getAC" ? "AC" : "DC",
        }}
        routeName={routeName}
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

      {/* History Modal */}
      <HistoryModal
        isOpen={historyModal.isOpen}
        onClose={closeHistoryModal}
        numberID={historyModal.numberID}
        tableType={type === "getAC" ? "AC" : "DC"}
        title={title}
        jobName={jobName}
        primaryKey={primaryKey}
      />
    </PageLayout>
  );
};

export default ReportsCommonTable;
