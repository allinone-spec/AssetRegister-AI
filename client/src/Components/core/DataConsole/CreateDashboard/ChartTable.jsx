import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { CircularProgress, Tabs, Tab, Box } from "@mui/material";
import { FiDownload } from "react-icons/fi";
import {
  getRegisterRequest,
  postDataRequest,
} from "../../../../Service/Console.service";
import { filterKey as apiFilterKey } from "../data";
import DataTable from "../../../Common/DataTable";
import { useSelector } from "react-redux";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
} from "../../../../Utility/utilityFunction";
import { useLocation } from "react-router-dom";

const options = ["PDF", "CSV", "Excel"];

function ChartTable({
  selectedTableName,
  selectedSlice,
  isVennMatrix,
  isSummary,
  viewId,
}) {
  const [loading, setLoading] = useState(false);
  const [sourceData, setSourceData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [currentTableData, setCurrentTableData] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalPages, setTotalPages] = useState(0);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const { value: objectValue, valueName: ObjectName } = useSelector(
    (state) => state.selectedObject,
  );
  const { pathname } = useLocation();
  // Check if sourceData is an object with multiple tables or just an array
  const isMultipleTablesData =
    sourceData && typeof sourceData === "object" && !Array.isArray(sourceData);
  const tableNames = isMultipleTablesData ? Object.keys(sourceData) : [];

  const fetchTableData = async (page = 0, size = pagination.pageSize || 10) => {
    try {
      setLoading(true);
      if (isSummary) {
        const response = await getRegisterRequest(
          `/AssetRegister/${objectValue}/get?page=${page}&size=${size}`,
          {
            filterKey: `${
              apiFilterKey.SUMMARY
            }_${ObjectName}_${localStorage.getItem("user-id")}`,
            filterExpression: {
              conditions: selectedSlice.map((v) => ({
                field: v.tableName,
                operator: "Is any of",
                value: "yes",
              })),
              logic: "AND",
            },
          },
        );
        // expected response.data contains pagination metadata similar to register
        const apiData = response.data;
        setSourceData(apiData.data || []);
        setFilteredTableData(
          apiData.totalFilterRecords || apiData.totalRecords || 0,
        );
        setTotalPages(apiData.totalPages || 0);
        setPagination((prev) => ({ ...prev, pageIndex: page, pageSize: size }));
        return;
      }
      if (isVennMatrix) {
        if (selectedSlice.length > 1) {
          const response = await postDataRequest(
            "/table/get/VennChart/tableData",
            {
              tableData: selectedSlice,
            },
          );
          setSourceData(response.data);
          return;
        } else {
          const response = await postDataRequest("/view/dashboard/filter", {
            tableName: selectedSlice[0].tableName,
            filters: {},
          });
          setSourceData(response.data);
          return;
        }
      }

      const filters = {};

      Object.keys(selectedSlice).forEach((rawKey) => {
        // Skip the 'count' key
        if (rawKey === "count") return;

        let filterKey = rawKey.replace(/[{}\*]/g, "").trim();

        const rawValue = selectedSlice[rawKey];
        let filterValue;

        if (Array.isArray(rawValue)) {
          filterValue = rawValue;
        } else if (typeof rawValue === "string") {
          filterValue = rawValue.replace(/[{}"\[\]]/g, "").trim();
        } else {
          filterValue = rawValue;
        }

        filters[filterKey] = Array.isArray(filterValue)
          ? filterValue
          : [filterValue];
      });

      const response = await postDataRequest("/view/dashboard/filter", {
        tableName: selectedTableName,
        filters: filters,
        viewId: viewId ? viewId : null,
      });
      setSourceData(response.data);
    } catch (error) {
      console.log(error, "fetching click table data");
    } finally {
      setLoading(false);
    }
  };

  // Update current table data when sourceData or activeTab changes
  useEffect(() => {
    if (isMultipleTablesData && tableNames.length > 0) {
      const currentTableName = tableNames[activeTab];
      setCurrentTableData(sourceData[currentTableName] || []);
    } else if (Array.isArray(sourceData)) {
      setCurrentTableData(sourceData);
    } else {
      setCurrentTableData([]);
    }
  }, [sourceData, activeTab, isMultipleTablesData, tableNames]);

  useEffect(() => {
    fetchTableData(pagination.pageIndex, pagination.pageSize);
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePaginationChange = (pageSize, page) => {
    fetchTableData(page, pageSize);
    setPagination({
      pageSize: pageSize,
      pageIndex: page,
    });
  };

  const handleDownload = (option) => {
    if (option === "") return;
    const filename = isMultipleTablesData
      ? `/${tableNames[activeTab]}`
      : "/register";
    if (option === "Excel") exportToExcel(filename, currentTableData);
    if (option === "PDF") exportToPDF(filename, currentTableData);
    if (option === "CSV") exportToCSV(filename, currentTableData);
    setIsModalOpen(false);
  };

  const handleIconClick = () => {
    setIsModalOpen((prev) => !prev);
  };

  const column = currentTableData.length
    ? Object.keys(currentTableData[0]).map((key) => ({
        accessorKey: key,
        header: key,
      }))
    : [];

  return (
    <div className="relative">
      <div className="w-[80vw] h-[70vh] overflow-y-scroll">
        <div className="flex justify-between">
          <h2 className="text-xl font-bold mb-4 absolute">Slice Details</h2>
          <FiDownload
            className="cursor-pointer mr-8 absolute right-0 top-0 mt-4"
            onClick={handleIconClick}
            size={24}
          />
        </div>

        {/* Show tabs only when we have multiple tables */}
        {isMultipleTablesData && tableNames.length > 1 && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="table tabs"
            >
              {tableNames.map((tableName, index) => (
                <Tab key={tableName} label={tableName} id={`tab-${index}`} />
              ))}
            </Tabs>
          </Box>
        )}

        <div className="relative flex justify-end mx-4 mt-2">
          {isModalOpen && (
            <div className="absolute top-0 right-0 z-9999 mt-2 bg-white border rounded-md shadow-md">
              <ul className="py-1">
                {options.map((option) => (
                  <li
                    key={option}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      handleDownload(option);
                    }}
                  >
                    {option}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-full">
            <CircularProgress />
          </div>
        ) : currentTableData.length ? (
          <DataTable
            data={currentTableData}
            columns={column}
            enableRowOrdering={false}
            enableRowSelection={false}
            enableFiltering={false}
            enableFilter={false}
            enableAction={false}
            onDataChange={() => {}}
            enableEditing={false}
            enableGrouping={false}
            enableColumnOrdering={false}
            enableColumnVisibility={false}
            enableToSearch={false}
            // className="relative"
            totalRecords={isSummary ? filteredTableData : undefined}
            pagination={isSummary ? pagination : undefined}
            totalPages={isSummary ? totalPages : undefined}
            onPaginationChange={isSummary ? handlePaginationChange : undefined}
            isLoading={loading}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            No Data Found
          </div>
        )}
      </div>
    </div>
  );
}

ChartTable.propTypes = {
  selectedTableName: PropTypes.string.isRequired,
  selectedSlice: PropTypes.object.isRequired,
  isVennMatrix: PropTypes.bool,
};

export default ChartTable;
