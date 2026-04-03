import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import MatrixChart from "../../../Common/MatrixChart";
import {
  getCommonRegisterRequest,
  getSummaryMatrixRequest,
} from "../../../../Service/Console.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import VennChart from "../../../Common/VennChart";

const ResponsiveGridLayout = WidthProvider(Responsive);

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

export default function Summary({ onChartClick }) {
  const [chartConfig, setChartConfig] = useState(null);
  const [vennChartData, setVennChartData] = useState([]);
  const selectedValue = useSelector((state) => state.selectedObject.value);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [layouts, setLayouts] = useState({});
  const abortControllerRef = useRef(null);

  const handleCardClick = (e, chartType) => {
    if (e.target.closest(".chart-content")) return;
    onChartClick?.({ chartType, vennChartData, chartConfig });
  };

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

  const handleChartClick = useCallback(
    (selectedSlice, chartType) => {
      setSelectedSlice(selectedSlice);
      onChartClick?.({ selectedSlice, chartType, vennChartData, chartConfig });
    },
    [vennChartData, chartConfig, onChartClick],
  );

  // Matrix chart click handler
  const handleMatrixClick = useCallback(
    (selectedSlice) => {
      handleChartClick(selectedSlice, "Matrix Chart");
    },
    [handleChartClick],
  );

  // Venn chart click handler
  const handleVennClick = useCallback(
    (selectedSlice) => {
      handleChartClick(selectedSlice, "Venn Chart");
    },
    [handleChartClick],
  );

  // Grid layout configuration
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
  const cols = { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 };

  // Generate layouts for charts
  const generateLayouts = () => {
    const baseLayouts = {
      lg: [
        { i: "venn-chart", x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
        { i: "matrix-chart", x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
      ],
    };

    // Generate responsive layouts
    return {
      lg: baseLayouts.lg,
      md: baseLayouts.lg.map((item) => ({ ...item, w: item.w })),
      sm: baseLayouts.lg.map((item) => ({ ...item, w: 12, x: 0 })),
      xs: baseLayouts.lg.map((item) => ({ ...item, w: 12, x: 0 })),
      xxs: baseLayouts.lg.map((item) => ({ ...item, w: 12, x: 0 })),
    };
  };

  if (!chartConfig) {
    return <div>Loading...</div>;
  }

  return (
    <PageLayout className="p-3 overflow-hidden !h-full">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <CircularProgress />
            </div>
          ) : chartConfig?.tableName?.length &&
            selectedValue &&
            vennChartData?.length ? (
            <ResponsiveGridLayout
              className="layout"
              layouts={generateLayouts()}
              breakpoints={breakpoints}
              cols={cols}
              rowHeight={60}
              onLayoutChange={(layout, layouts) => setLayouts(layouts)}
              isDraggable={false}
              isResizable={true}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              resizeHandles={["e", "n", "s", "w"]}
              compactType="vertical"
              preventCollision={false}
              bounds="parent"
              draggableCancel=".chart-content, .chart-clickable"
            >
              {/* Venn Chart */}
              <div
                key="venn-chart"
                className="bg- rounded-xl shadow-sm border border-gray-200 dark:border-gray-500 p-4 cursor-pointer"
                onClick={(e) => handleCardClick(e, "Venn Chart")}
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                      Venn Chart
                    </h3>
                  </div>
                  <div className="flex-1 overflow-hidden chart-content chart-clickable">
                    <VennChart
                      tableName={["AC_CSV_Intunedemo", "AC_CSV_ServiceNowDemo"]}
                      columnNames={{
                        AC_CSV_Intunedemo: ["Manufacturer"],
                        AC_CSV_ServiceNowDemo: ["ManufacturerValue"],
                      }}
                      setSelectedSlice={handleVennClick}
                      setShowModal={() => {}}
                      vennChartData={vennChartData}
                      showLabelsStatus
                    />
                  </div>
                </div>
              </div>

              {/* Matrix Chart */}
              <div
                key="matrix-chart"
                className="bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-500 p-4 cursor-pointer"
                onClick={(e) => handleCardClick(e, "Matrix Chart")}
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                      Matrix Chart
                    </h3>
                  </div>
                  <div className="flex-1 overflow-hidden chart-content chart-clickable">
                    <MatrixChart
                      tableName={chartConfig.tableName}
                      columnNames={chartConfig.tableName}
                      chartData={chartConfig.chartData}
                      showLabelValuesStatus={true}
                      showLabelsStatus={true}
                      setSelectedSlice={handleMatrixClick}
                      setShowModal={() => {}}
                    />
                  </div>
                </div>
              </div>
            </ResponsiveGridLayout>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <h3 className="text-text-primary mb-2">
                  {!selectedValue
                    ? "Please select object from dropdown to show data"
                    : "Loading chart data..."}
                </h3>
                {!chartConfig?.tableName?.length && selectedValue && (
                  <p className="text-text-secondary">No chart data available</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* {showModal && selectedSlice && (
          <ResizableBottomDrawer
            open={showModal}
            onClose={() => setShowModal(false)}
            title="Detail View"
            defaultHeight={700}
            minHeight={150}
            maxHeight={900}
          >
            <ChartTable selectedSlice={selectedSlice} isSummary />
          </ResizableBottomDrawer>
        )} */}
      </div>
    </PageLayout>
  );
}
