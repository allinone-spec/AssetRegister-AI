import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import { getCommonRegisterRequest } from "../../../../Service/Console.service";
import {
  useLocation,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import BackButton from "../../../Common/BackButton";
import DataTable from "../../../Common/DataTable";
import { filterKey } from "../data";
import {
  setFilters,
  addFilter,
  removeFilter,
} from "../../../../redux/Slices/AdvancedFilterSlice";
import { postDataRequest } from "../../../../Service/admin.save";

const FolderFilterView = ({ routeName, data, setDrawerMode }) => {
  const [searchParams] = useSearchParams();
  const viewId = data ? data?.id : searchParams.get("viewId");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [filteredTableData, setFilteredTableData] = useState(0);
  const hasFetchedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const location = useLocation();
  const {
    viewName = "",
    folderName = "",
    tableName = "",
    objectId = "",
  } = data ? data : location.state || {};

  if (!data && !location.state) {
    return (
      <div className="p-4">
        <p>No data available. Please go back and try again.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  useEffect(() => {
    dispatch(
      folderName
        ? setHeadingTitle(`${folderName} / ${viewName}`)
        : setHeadingTitle(viewName),
    );
  }, [location.state]);

  const [sourceData, setSourceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveFilters, setSaveFilters] = useState();
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isGrouped, setIsGrouped] = useState(false);
  const [importStatusFilter, setImportStatusFilter] = useState("All");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const filters = useSelector((state) => state.advancedFilter.filters);
  const filterKeyWithId = `${
    filterKey.FOLDERLISTVIEW
  }_${viewId}_${localStorage.getItem("user-id")}`;

  useEffect(() => {
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
        setIsInitialized(true);
      })
      .catch(() => {
        setSaveFilters({ tableName });
        setIsInitialized(true);
      });
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  useEffect(() => {
    if (!saveFilters?.grouping?.length) setIsGrouped(0);
  }, [saveFilters?.grouping?.length]);

  const fetchSourceData = useCallback(
    async (page = 0, size = 10, forceRefresh = false) => {
      if (!forceRefresh && hasFetchedRef.current) return;
      setLoading(true);
      hasFetchedRef.current = true;
      try {
        if (!viewName) throw new Error("Job name is missing.");
        const response = await postDataRequest(
          `/view/${viewId}/get?page=${
            saveFilters?.grouping?.length ? -1 : page
          }&size=${size}`,
          saveFilters?.grouping?.length
            ? {
                filterKey: filterKeyWithId,
              }
            : {
                ...saveFilters,
                filterKey: filterKeyWithId,
              },
        );
        if (response?.status === 200) {
          const result = response.data || [];
          setSourceData(result.data || []);
          setIsGrouped(saveFilters?.grouping?.length);
          if (saveFilters?.grouping?.length) dispatch(setFilters([]));
          setFilteredTableData(result.totalFilterRecords || 0);
          setTotalRecords(result.totalRecords || 0);
          setTotalPages(result.totalPages || 0);
        } else {
          setSourceData([]);
          setTotalRecords(0);
          setTotalPages(0);
          setIsGrouped(0);
          setFilteredTableData(0);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setSourceData([]);
        setTotalRecords(0);
        setTotalPages(0);
        setIsGrouped(0);
        setFilteredTableData(0);
      } finally {
        setLoading(false);
        setTimeout(() => {
          hasFetchedRef.current = false;
        }, 500);
      }
      setImportStatusFilter(
        saveFilters.filterExpression.conditions.find(
          (v) => v.field === "import_status_update",
        )
          ? saveFilters.filterExpression.conditions.find(
              (v) => v.field === "import_status_update",
            ).value
          : "All",
      );
    },
    [saveFilters],
  );

  const fetchAllSourceData = useCallback(async () => {
    try {
      const response = await postDataRequest(`/view/${viewId}/get?page=${-1}`, {
        ...saveFilters,
        filterKey: filterKeyWithId,
      });
      if (response?.status === 200) return response.data?.data || [];
      else return [];
    } catch (error) {
      console.log("Error fetching all source data:", error);
      return [];
    }
  }, [saveFilters, viewId, filterKeyWithId]);

  useEffect(() => {
    if (
      isInitialized &&
      (saveFilters?.tableName || saveFilters?.tableName === null) &&
      !isGrouped &&
      viewId
    ) {
      fetchSourceData(pagination.pageIndex, pagination.pageSize);
    }
  }, [isInitialized, saveFilters, isGrouped, viewId]);

  const handlePaginationChange = useCallback(
    (pageSize, page, isCallApi = true) => {
      if (!isGrouped && isCallApi) {
        fetchSourceData(page, pageSize, true);
      }
      setPagination({
        pageSize: pageSize,
        pageIndex: page,
      });
    },
    [isGrouped],
  );

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

  // Define filter options
  const getFilterOptions = () => {
    return ["All", "Partially Matched", "Matched", "New", "Deleted"];
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
    ? Object.keys(...sourceData).map((key) => ({
        accessorKey: key,
        header: key,
        enableGrouping: true,
      }))
    : [];

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex gap-3 sm:gap-6 justify-start">
          <div className="flex items-center gap-2">
            {/* <span className="text-sm font-medium text-gray-600">Total:</span> */}
            <div className="font-extrabold text-2xl">
              {folderName ? `${folderName} / ${viewName}` : viewName}
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
        enableEditing={true}
        enableAction={false}
        enableGrouping={true}
        onDataChange={() => {}}
        routeName={routeName}
        viewId={viewId}
        setFilteredData={setFilteredTableData}
        dashboardData={{
          tableType: folderName,
          tableName: tableName,
          objectId,
          viewId,
        }}
        setOpenDrawer={setDrawerMode}
        tableName={tableName}
        totalRecords={saveFilters?.grouping?.length ? undefined : totalRecords}
        pagination={saveFilters?.grouping?.length ? undefined : pagination}
        totalPages={saveFilters?.grouping?.length ? undefined : totalPages}
        onPaginationChange={
          saveFilters?.grouping?.length ? undefined : handlePaginationChange
        }
        isLoading={loading}
        setSaveFilters={setSaveFilters}
        saveFilters={saveFilters}
        tableId={1}
        fetchAllSourceData={fetchAllSourceData}
      />
    </PageLayout>
  );
};

export default FolderFilterView;
