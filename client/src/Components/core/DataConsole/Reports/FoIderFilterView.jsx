import { useCallback, useEffect, useRef, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import {
  getCommonRegisterRequest,
  getRequest,
} from "../../../../Service/Console.service";
import {
  useLocation,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import BackButton from "../../../Common/BackButton";
import DataTable from "../../../Common/DataTable";
import { filterKey } from "../data";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import { postDataRequest } from "../../../../Service/admin.save";

const FolderFilterView = ({ routeName }) => {
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get("viewId");
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
  } = location.state || {};

  if (!location.state) {
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
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
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

  const column = sourceData.length
    ? Object.keys(...sourceData).map((key) => ({
        accessorKey: key,
        header: key,
        enableGrouping: true,
      }))
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
              {totalRecords}
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
      {/* {loading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : sourceData.length ? ( */}
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
