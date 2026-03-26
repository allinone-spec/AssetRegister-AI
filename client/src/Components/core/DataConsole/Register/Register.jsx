import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import {
  getCommonRegisterRequest,
  getRegisterRequest,
} from "../../../../Service/Console.service";
import DataTable from "../../../Common/DataTable";
import RegisterDetail from "./RegisterDetail";
import { filterKey } from "../data";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import { getRequest } from "../../../../Service/admin.save";

export const Register = ({ routeName }) => {
  const selectedValue = useSelector((state) => state.selectedObject.value);
  const selectedValueName = useSelector(
    (state) => state.selectedObject.valueName,
  );
  const dispatch = useDispatch();

  const [availableTables, setAvailableTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGrouped, setIsGrouped] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [saveFilters, setSaveFilters] = useState();
  const [primaryKeyVal, setPrimaryKeyVal] = useState({ key: "", value: "" });
  const [sourceData, setSourceData] = useState([]);
  const abortControllerRef = useRef(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Memoize the filter key to prevent unnecessary recalculations
  const filterKeyWithId = useMemo(
    () =>
      `${filterKey.REGISTER}_${selectedValueName}_${localStorage.getItem(
        "user-id",
      )}`,
    [selectedValueName],
  );

  // Memoize the modal content to prevent unnecessary re-renders
  const modalContent = useMemo(() => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-5 max-w-[90%]">
          <RegisterDetail
            columnName={showModal}
            primaryValue={primaryKeyVal.value}
          />
          <button
            onClick={() => setShowModal(false)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }, [showModal, primaryKeyVal.value]);

  useEffect(() => {
    dispatch(setHeadingTitle("Detailed"));
    if (selectedValue)
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
                  table: v?.table,
                  table2: v?.table2,
                  field2: v?.field2,
                })),
              ),
            );
        })
        .catch(() => {
          setSaveFilters({
            tableName: `${filterKey.REGISTER}_${selectedValueName}`,
          });
        });
    return () => {
      dispatch(setFilters([]));
    };
  }, [selectedValue]);

  useEffect(() => {
    if (!saveFilters?.grouping?.length) setIsGrouped(0);
  }, [saveFilters?.grouping?.length]);

  const fetchAllSourceData = useCallback(async () => {
    try {
      const response = await getRegisterRequest(
        `/AssetRegister/${selectedValue}/get?page=${-1}`,
        { ...saveFilters, filterKey: filterKeyWithId },
      );
      if (response?.status === 200) return response.data?.data || [];
      else return [];
    } catch (error) {
      console.log("error");
      return [];
    }
  }, [selectedValue, saveFilters]);

  const fetchSourceData = useCallback(
    async (page = 0, size = 10) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      try {
        const response = await getRegisterRequest(
          `/AssetRegister/${selectedValue}/get?page=${
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
          signal,
        );
        if (response?.status === 200) {
          const apiData = response.data;
          const data = apiData?.data || [];
          setPrimaryKeyVal((val) => ({ ...val, key: apiData?.primaryKey }));
          setIsGrouped(saveFilters?.grouping?.length);

          setSourceData(data);
          setTotalRecords(apiData.totalRecords || 0);
          setFilteredTableData(apiData.totalFilterRecords || 0);
          setTotalPages(apiData.totalPages || 0);
        } else {
          setSourceData([]);
          setTotalRecords(0);
          setTotalPages(0);
          setIsGrouped(0);
          setFilteredTableData(0);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setSourceData([]);
          setTotalRecords(0);
          setTotalPages(0);
          setIsGrouped(0);
          setFilteredTableData(0);
        }
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    },
    [selectedValue, saveFilters, filterKeyWithId],
  );

  const handlePaginationChange = useCallback(
    (pageSize, page, isCallApi = true) => {
      if (isCallApi) fetchSourceData(page, pageSize);
      setPagination({
        pageSize: pageSize,
        pageIndex: page,
      });
    },
    [fetchSourceData],
  );

  useEffect(() => {
    if (selectedValue)
      getRequest("/table/get/jobNames").then(({ data }) => {
        const newData = data.filter(
          (item) => item.object === +selectedValue && item.inRegister === "yes",
        );
        setAvailableTables(newData.map((item) => item?.DCTableName) || []);
      });
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedValue]);

  useEffect(() => {
    if (
      selectedValue &&
      (saveFilters?.tableName || saveFilters?.tableName === null) &&
      !isGrouped
    )
      fetchSourceData(pagination.pageIndex, pagination.pageSize);
  }, [selectedValue, JSON.stringify(saveFilters)]);

  const column = sourceData.length
    ? Object.keys(...sourceData).map((key) => ({
        accessorKey: key,
        header: key,
        enableGrouping: true,
        enableLinkHandler: (val) => {
          setPrimaryKeyVal((pre) => ({
            ...pre,
            value: val[primaryKeyVal.key],
          }));
          setShowModal(key);
        },
      }))
    : [];

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 p-3 py-7">
        <div className="flex gap-3 sm:gap-6 justify-end absolute right-7">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {totalRecords}
            </span>
          </div>
          {/* {isGrouped ? ( */}
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
          {/* ) : saveFilters?.searchText ||
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
          )} */}
        </div>
      </div>
      {/* {loading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : sourceData.length ? ( */}
      {selectedValue ? (
        <DataTable
          data={sourceData}
          columns={column}
          totalRecords={
            saveFilters?.grouping?.length ? undefined : filteredTableData
          }
          pagination={saveFilters?.grouping?.length ? undefined : pagination}
          totalPages={saveFilters?.grouping?.length ? undefined : totalPages}
          onPaginationChange={
            saveFilters?.grouping?.length ? undefined : handlePaginationChange
          }
          isLoading={loading}
          enableRowOrdering={false}
          enableRowSelection={false}
          enableFiltering={false}
          enableEditing={true}
          enableAction={false}
          enableGrouping={true}
          onDataChange={() => {}}
          routeName={routeName}
          dashboardData={{ tableType: "register", objectId: selectedValue }}
          setFilteredData={setFilteredTableData}
          setSaveFilters={setSaveFilters}
          saveFilters={saveFilters}
          tableId={1}
          fetchAllSourceData={fetchAllSourceData}
          tableName="Register"
          availableTables={availableTables}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          Please select object from dropdown to show data
        </div>
      )}
      {showModal && modalContent}
    </PageLayout>
  );
};
