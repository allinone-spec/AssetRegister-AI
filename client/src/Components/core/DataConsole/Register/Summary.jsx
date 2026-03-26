import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import MatrixChart from "../../../Common/MatrixChart";
import {
  getCommonRegisterRequest,
  getSummaryMatrixRequest,
} from "../../../../Service/Console.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import ChartTable from "../CreateDashboard/ChartTable";
import { useTheme } from "../../../../ThemeContext";
import VennChart from "../../../Common/VennChart";
import DataTable from "../../../Common/DataTable";
import { set } from "react-hook-form";

// Function to convert API response to chart format
function convertApiResponseToChartData(apiResponse) {
  const chartData = [];
  const tableNames = new Set();

  // Extract unique table names from API response keys and clean brackets
  Object.keys(apiResponse).forEach((key) => {
    const [table1, table2] = key.split(" & ");
    // Remove square brackets from table names
    const cleanTable1 = table1.replace(/^\[|\]$/g, "");
    const cleanTable2 = table2.replace(/^\[|\]$/g, "");
    tableNames.add(cleanTable1);
    tableNames.add(cleanTable2);
  });

  const tableNamesArray = Array.from(tableNames);

  // Convert each API response entry to chart data format
  Object.entries(apiResponse).forEach(([key, value]) => {
    const [table1, table2] = key.split(" & ");
    // Remove square brackets from table names
    const cleanTable1 = table1.replace(/^\[|\]$/g, "");
    const cleanTable2 = table2.replace(/^\[|\]$/g, "");
    chartData.push({
      x: cleanTable1,
      y: cleanTable2,
      v: value,
    });
    // Add reverse pair if not same
    if (cleanTable1 !== cleanTable2) {
      chartData.push({
        x: cleanTable2,
        y: cleanTable1,
        v: value,
      });
    }
  });

  return {
    tableName: tableNamesArray,
    chartData: chartData,
  };
}

const charts = ["Venn Chart", "Matrix Chart"];

export default function Summary() {
  const [chartConfig, setChartConfig] = useState(null);
  const [vennChartData, setVennChartData] = useState([]);
  const selectedValue = useSelector((state) => state.selectedObject.value);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState(charts[0]);
  const abortControllerRef = useRef(null);
  const { bgColor } = useTheme();

  useEffect(() => {
    dispatch(setHeadingTitle("Summary"));
  }, []);

  const fetchSourceData = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    try {
      const response = await getSummaryMatrixRequest(selectedValue, signal);

      if (response?.status === 200) {
        const apiData = response.data || {};
        const converted = convertApiResponseToChartData(apiData);
        setChartConfig(converted);
      } else {
        setChartConfig({});
      }
    } catch (error) {
      if (error.name !== "AbortError") setChartConfig({});
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedValue) {
      fetchSourceData();
      getCommonRegisterRequest(`/AssetRegister/${selectedValue}/venn`).then(
        ({ data }) => {
          const formattedData = data.map((d) => ({
            ...d,
            label: d.sets.length === 1 ? d.sets[0] : d.sets.join(" ∩ "),
          }));
          setVennChartData(formattedData);
        },
      );
    } else {
      setLoading(false);
      setChartConfig({});
    }
  }, [selectedValue]);

  const handleChangeChartType = useCallback((event) => {
    setSelectedChartType(event.target.value);
  }, []);

  const handleRowClick = useCallback(
    (item) => {
      setShowModal(true);
      if (selectedChartType === "Matrix Chart") {
        setSelectedSlice(
          item.label?.split(" , ")?.map((v) => ({
            tableName: v?.trim(),
          })),
        );
      } else {
        setSelectedSlice(
          item.label?.split(" ∩ ")?.map((v) => ({
            tableName: v?.trim(),
          })),
        );
      }
    },
    [selectedChartType],
  );

  if (!chartConfig) {
    return <div>Loading...</div>;
  }

  const tableData =
    selectedChartType === "Venn Chart"
      ? vennChartData.map((v) => ({ label: v.label, count: v.size }))
      : chartConfig?.chartData?.length
        ? chartConfig?.chartData?.map((v) => ({
            label: `${v.x} , ${v.y}`,
            count: v.v,
          }))
        : [];

  const column = Object.keys(tableData?.length ? tableData[0] : [])?.map(
    (key) => ({
      accessorKey: key,
      header: key,
      enableGrouping: false,
      enableLinkHandler: key === "count" ? (val) => handleRowClick(val) : "",
    }),
  );

  return (
    <PageLayout className="p-3">
      {chartConfig?.tableName?.length && selectedValue && (
        <div className="flex justify-end">
          <select
            style={{
              backgroundColor: bgColor.backgroundColor,
              color: bgColor.layoutTextColor,
            }}
            className="w-[15rem] h-[44px] px-4 py-2 rounded-lg shadow font-semibold text-lg mb-1"
            value={selectedChartType}
            onChange={handleChangeChartType}
          >
            {charts.map((chart, index) => (
              <option key={index} value={chart}>
                {chart} Sections
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : chartConfig?.tableName?.length ? (
        selectedChartType === "Matrix Chart" ? (
          <MatrixChart
            tableName={chartConfig.tableName}
            columnNames={chartConfig.tableName} // You may need to adjust this based on your needs
            chartData={chartConfig.chartData}
            showLabelValuesStatus={true}
            showLabelsStatus={true}
            setSelectedSlice={setSelectedSlice}
            setShowModal={setShowModal}
          />
        ) : (
          <VennChart
            tableName={["AC_CSV_Intunedemo", "AC_CSV_ServiceNowDemo"]}
            columnNames={{
              AC_CSV_Intunedemo: ["Manufacturer"],
              AC_CSV_ServiceNowDemo: ["ManufacturerValue"],
            }}
            setSelectedSlice={setSelectedSlice}
            setShowModal={setShowModal}
            vennChartData={vennChartData}
            showLabelsStatus
          />
        )
      ) : (
        <div className="flex justify-center items-center h-full">
          {selectedValue
            ? "Data Not Found"
            : "Please select object from dropdown to show data"}
        </div>
      )}
      <main className="w-full bg-white rounded-lg shadow-md sm:p-6 p-2">
        {tableData?.length > 0 && selectedValue ? (
          <section className="w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              📄 Application Data
            </h2>
            <DataTable
              columns={column}
              data={tableData}
              enableRowSelection={false}
              enableRowOrdering={false}
              enableColumnOrdering={false}
              enableColumnVisibility={false}
              enableToSearch={false}
              enableEditing={true}
              enableFilter={false}
              className="relative"
            />
          </section>
        ) : (
          selectedValue && (
            <p className="text-gray-500 text-center">No data available</p>
          )
        )}

        {showModal && selectedSlice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 max-w-[90%]">
              <ChartTable
                // selectedTableName={selectedTableName}
                selectedSlice={selectedSlice}
                isSummary
              />
              <button
                onClick={() => setShowModal(false)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </PageLayout>
  );
}
