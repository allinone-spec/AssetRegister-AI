import { Chart, registerables } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { useEffect, useRef, useState, useMemo, memo } from "react";
import { color } from "chart.js/helpers";
import { postDataRequest } from "../../Service/admin.save";
import { useTheme } from "../../context/ThemeContext";
Chart.register(...registerables, MatrixController, MatrixElement);

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A569BD",
  "#D35400",
];

const MatrixChart = memo(
  ({
    showPadding = false,
    tableName,
    columnNames,
    chartData,
    callApi,
    setSelectedSlice,
    setShowModal,
    // showLabelValuesStatus,
    // showLabelsStatus,
  }) => {
    if (Object.keys(columnNames)?.length < 1) {
      return (
        <div className="text-red-500">
          ⚠️ Matrix diagram requires at least one tables.
        </div>
      );
    }
    const chartRef = useRef(null);
    const [matrixData, setMatrixData] = useState([]);
    const chartInstance = useRef(null);
    const { isDark } = useTheme();

    // const columnNamesArray = useMemo(
    //   () => Object.values(columnNames),
    //   [columnNames]
    // );

    useEffect(() => {
      const fetchData = async () => {
        if (chartData && Array.isArray(chartData)) {
          setMatrixData(chartData);
        } else {
          console.warn("chartData is not valid");
        }
      };
      if (!callApi) fetchData();
    }, [tableName, chartData, callApi]);

    useEffect(() => {
      if (callApi) {
        const payload = Object.entries(columnNames).map(([key, val]) => ({
          tableName: key,
          columnNames: val,
        }));
        postDataRequest("/table/get/MatrixChart/data", {
          tableData: payload,
        }).then(({ data }) => setMatrixData(data));
      }
    }, [callApi]);

    useEffect(() => {
      if (chartRef.current && matrixData.length > 0) {
        const ctx = chartRef.current.getContext("2d");

        // Destroy the previous chart instance if it exists
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
          type: "matrix",
          data: {
            datasets: [
              {
                label: "My Matrix",
                data: matrixData,
                backgroundColor(context) {
                  const value = context.dataset.data[context.dataIndex].v;
                  const alpha = ((value ? value + 50 : 10) - 5) / 40;

                  try {
                    return color(COLORS[context.dataIndex % COLORS.length])
                      .alpha(alpha)
                      .rgbString();
                  } catch (err) {
                    console.warn(
                      "Chart.js color helper failed, using fallback color.",
                      err,
                    );
                    return `rgba(0, 255, 0, ${alpha})`;
                  }
                },
                borderColor(context) {
                  const value = context.dataset.data[context.dataIndex].v;
                  const alpha = (value - 5) / 40;

                  try {
                    return color(
                      COLORS[(context.dataIndex + 1) % COLORS.length],
                    )
                      .alpha(alpha)
                      .rgbString();
                  } catch (err) {
                    console.warn(
                      "Chart.js color helper failed, using fallback border color.",
                      err,
                    );
                    return `rgba(0, 100, 0, ${alpha})`;
                  }
                },
                borderWidth: 1,
                width: ({ chart }) =>
                  (chart.chartArea || {}).width /
                    Object.keys(columnNames)?.length -
                  1,
                height: ({ chart }) =>
                  (chart.chartArea || {}).height /
                    Object.keys(columnNames)?.length -
                  1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              datalabels: {
                display: true, // showLabelValuesStatus
                color: isDark ? "#f1f5f9" : "black",
                font: {
                  size: 12,
                },
                formatter: (value) => value.v,
                anchor: "center",
                align: "center",
              },
              legend: false,
              tooltip: {
                callbacks: {
                  title() {
                    return "";
                  },
                  label(context) {
                    const v = context.dataset.data[context.dataIndex];
                    return ["x: " + v.x, "y: " + v.y, "v: " + v.v];
                  },
                },
              },
            },
            scales: {
              x: {
                type: "category",
                labels: tableName,
                offset: true,
                ticks: {
                  padding: showPadding ? 50 : 0,
                  display: true,
                },
                grid: {
                  display: false,
                },
              },
              y: {
                type: "category",
                labels: tableName,
                offset: true,
                ticks: {
                  display: true, // showLabelsStatus
                },
                grid: {
                  display: false,
                },
              },
            },
            elements: {
              matrix: {
                borderWidth: 1,
                width: 30,
                height: 30,
              },
            },
            onClick: (_, elements) => {
              if (elements.length > 0) {
                const index = elements[0].index;
                const item = matrixData[index];

                const tableNames = [
                  ...new Set(
                    Object.entries(item)
                      .filter(([key, _]) => key !== "v")
                      .map(([_, value]) => value),
                  ),
                ];

                const result = tableNames.map((tableName) => ({
                  tableName: tableName,
                  columnNames: columnNames[tableName] || [],
                }));
                if (setSelectedSlice && setShowModal) {
                  setSelectedSlice(result);
                  setShowModal(true);
                }
              }
            },
          },
        });
      }
    }, [matrixData, tableName]);

    return (
      <canvas
        ref={chartRef}
        style={{ width: "100%", height: "400px" }}
        className="bg-transparent"
      />
    );
  },
);

export default MatrixChart;
