import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import { getCommonRegisterRequest } from "../Service/Console.service";
import { postDataRequest } from "../Service/api.service";
import { HiOutlineDotsVertical } from "react-icons/hi";
import ReactECharts from "echarts-for-react";

import {
  Pie,
  Line,
  Bar,
  Doughnut,
  Radar,
  PolarArea,
  Bubble,
  Scatter,
} from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useLocation, useParams } from "react-router-dom";
import VennChart from "./Common/VennChart";
import MatrixChart from "./Common/MatrixChart";
import CardChartComponent from "./Common/CardChartComponent";
import { toggleLabels, toggleLabelValues } from "../redux/Slices/ToggleLabel";
import { useSelector, useDispatch } from "react-redux";
import ChartTable from "./core/DataConsole/CreateDashboard/ChartTable";
import { MdDownload } from "react-icons/md";
import { useTheme } from "../ThemeContext";

ChartJS.register(
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels,
);

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A569BD",
  "#D35400",
  "#2E86C1",
  "#45B39D",
  "#F4D03F",
  "#EC7063",
  "#AF7AC5",
  "#5D6D7E",
  "#B03A2E",
  "#2874A6",
  "#239B56",
  "#9B59B6",
  "#F39C12",
  "#1ABC9C",
];

const ChartComponent = ({
  ChartselectedTableName,
  ChartselectedColumns,
  chartType,
  chartData,
  count,
  showLabelsStatus,
  data,
  routeName,
  objectId,
  isCountColum,
  description,
  viewId,
}) => {
  const { id } = useParams();
  const chartRef = useRef(null);
  const { bgColor } = useTheme();
  const dispatch = useDispatch();
  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );
  const location = useLocation();

  const [columnValue, setColumnValue] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const { dashboardData } = useSelector((state) => state.dashboard);
  const [loading, setLoading] = useState(false);

  // const [showLabels, setShowLabels] = useState(showLabelsStatus || false);
  // const [showLabelValues, setShowLabelValues] = useState(false);

  // const toggleLabelValues = () => setShowLabelValues((prev) => !prev);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chartWidth, setChartWidth] = useState(100);
  const [chartHeight, setChartHeight] = useState(70);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleLabels = useSelector(
    (state) => state.labelToggle.chartSettings[id]?.showLabels || false,
  );
  const showLabelValues = useSelector(
    (state) => state.labelToggle.chartSettings[id]?.showLabelValues || false,
  );

  const handleToggleLabels = () => {
    dispatch(toggleLabels(id));
  };

  const countOccurrences = useCallback((data) => {
    if (!Array.isArray(data)) return [];

    const counts = {};
    data?.forEach((record) => {
      const key = JSON.stringify(record);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object?.entries(counts)?.map(([key, count]) => ({
      ...JSON.parse(key),
      count,
    }));
  }, []);

  const formatApiResponse = useCallback((responseData) => {
    if (!responseData) return [];

    let formattedData = [];

    // Handle array of objects format
    if (Array.isArray(responseData)) {
      responseData.forEach((item) => {
        if (item && typeof item === "object" && item.data) {
          // Process the data object within each item
          Object.entries(item.data).forEach(([key, count]) => {
            // Parse the key format like "{OperatingSystem=Microsoft Windows 10 Enterprise}"
            const cleanKey = key.replace(/^{|}$/g, ""); // Remove outer braces
            const pairs = cleanKey.split(",").map((pair) => pair.trim());
            const dataPoint = {
              count,
              tableName: item.tableName || "Unknown", // Include table name for reference
            };

            pairs.forEach((pair) => {
              const equalIndex = pair.indexOf("=");
              if (equalIndex > -1) {
                const fieldName = pair.substring(0, equalIndex).trim();
                const value = pair.substring(equalIndex + 1).trim();
                if (fieldName && value !== undefined) {
                  dataPoint[fieldName] =
                    value === "" ? "Empty" : value === "NULL" ? "NULL" : value;
                }
              }
            });

            formattedData.push(dataPoint);
          });
        }
      });
    }
    // Handle single object format
    else if (typeof responseData === "object") {
      Object.entries(responseData).forEach(([key, count]) => {
        const cleanKey = key.replace(/^{|}$/g, "");
        const pairs = cleanKey.split(",").map((pair) => pair.trim());
        const dataPoint = { count };

        pairs.forEach((pair) => {
          const equalIndex = pair.indexOf("=");
          if (equalIndex > -1) {
            const fieldName = pair.substring(0, equalIndex).trim();
            const value = pair.substring(equalIndex + 1).trim();
            if (fieldName && value !== undefined) {
              dataPoint[fieldName] =
                value === "" ? "Empty" : value === "NULL" ? "NULL" : value;
            }
          }
        });

        formattedData.push(dataPoint);
      });
    }

    // Sort by count in descending order
    return formattedData.sort((a, b) => b.count - a.count);
  }, []);

  // Get selected table and columns with memoization
  const selectedTableName = useMemo(() => {
    return Array.isArray(dashboardData?.tableName || ChartselectedTableName)
      ? dashboardData.tableName[0] || ChartselectedTableName[0]
      : dashboardData?.tableName || ChartselectedTableName;
  }, [dashboardData?.tableName, ChartselectedTableName]);

  const selectedColumns = useMemo(() => {
    return (
      dashboardData?.columnNames?.[selectedTableName] ||
      ChartselectedColumns ||
      []
    );
  }, [dashboardData?.columnNames, selectedTableName, ChartselectedColumns]);

  // Optimized API call with proper dependency management
  const fetchChartData = useCallback(async () => {
    if (!selectedTableName || selectedColumns?.length === 0) {
      console.warn(
        "No table name or columns selected",
        selectedTableName,
        selectedColumns,
      );
      setColumnValue([]);
      setOccurrences([]);
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        tableData: Object.entries(ChartselectedColumns)?.map(([key, val]) => ({
          tableName: key,
          columnNames: val,
        })),
        ...(viewId && {
          tableViewData: Object.entries(ChartselectedColumns)?.map(
            ([key, val]) => ({
              viewId,
              columnNames: val,
            }),
          ),
        }),
      };
      if (dashboardData.tableType === "register") {
        const columnNamesSeperatedCommas =
          ChartselectedColumns.register.join(",");

        const response = await getCommonRegisterRequest(
          `/AssetRegister/${objectId}/getAggregateData/${columnNamesSeperatedCommas}/columnName`,
        );
        if (response.status === 200) {
          const responseData = response?.data || {};

          const formattedData = formatApiResponse(responseData);
          setColumnValue(formattedData);
          setOccurrences(formattedData);
        }
        return;
      }

      const response = await postDataRequest(
        viewId
          ? "/dashboard/getAggregateDataView"
          : "/dashboard/getAggregateData",
        requestBody,
      );

      if (response.status === 200) {
        const responseData = response?.data || {};

        const formattedData = formatApiResponse(responseData);
        setColumnValue(formattedData);
        setOccurrences(formattedData);
      }
    } catch (error) {
      console.error("Error fetching column values:", error);
      toast.error(
        error?.response?.data?.message || "Failed to fetch column values",
      );
      setColumnValue([]);
      setOccurrences([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTableName, selectedColumns]);

  // Use effect with proper dependency array to prevent unnecessary API calls
  useEffect(() => {
    if (
      dashboardData?.chartType === "Venn Chart" ||
      chartType === "Venn Chart" ||
      dashboardData?.chartType === "Matrix Chart" ||
      chartType === "Matrix Chart"
    ) {
      setOccurrences([" "]);
    } else if (!location.state?.isFavorite) fetchChartData();
  }, [location.state?.isFavorite]);

  useEffect(() => {
    if (
      dashboardData?.chartType === "Venn Chart" ||
      chartType === "Venn Chart" ||
      dashboardData?.chartType === "Matrix Chart" ||
      chartType === "Matrix Chart"
    ) {
      setOccurrences([" "]);
    } else if (location.state?.isFavorite) {
      setLoading(true);
      const formattedData = formatApiResponse(
        chartData.columnNamesWithValuesANDCounting,
      );
      setColumnValue(formattedData);
      setOccurrences(formattedData);
      setLoading(false);
    }
  }, [location.state?.isFavorite, chartData.columnNamesWithValuesANDCounting]);

  useEffect(() => {
    if (Array.isArray(columnValue) && columnValue.length > 0) {
      // Check if it's old format (array without count field)
      const hasCountField = columnValue.some((item) => "count" in item);
      if (!hasCountField) {
        setOccurrences(countOccurrences(columnValue));
      }
    }
  }, [columnValue]);

  const handleDownloadChart = useCallback(() => {
    try {
      const chartElement = chartRef.current;
      if (!chartElement) {
        toast.error("Chart not found");
        return;
      }
      // First try to find a canvas (Chart.js charts)
      const canvas = chartElement.querySelector("canvas");
      if (canvas) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height + 30;
        const tempCtx = tempCanvas.getContext("2d");

        // Fill with white background
        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the original canvas on top
        tempCtx.drawImage(canvas, 0, 0);

        tempCanvas.toBlob(
          (blob) => {
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = url;
            downloadLink.download = `${"chart"}.${"png"}`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
          },
          "image/png",
          1.0,
        );
        return;
      }

      // If no canvas, try to find an SVG (VennChart uses SVG)
      const svg = chartElement.querySelector("svg");
      if (svg) {
        // Clone the SVG node to avoid mutations
        const clone = svg.cloneNode(true);
        // Inline computed styles to preserve appearance
        const copySvg = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([copySvg], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const image = new Image();
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = image.width || svg.clientWidth || 800;
            canvas.height = image.height || svg.clientHeight || 600;
            const ctx = canvas.getContext("2d");
            // White background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              const blobUrl = URL.createObjectURL(blob);
              const downloadLink = document.createElement("a");
              downloadLink.href = blobUrl;
              downloadLink.download = `${"venn-chart"}.${"png"}`;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(blobUrl);
            }, "image/png");
          } catch (error) {
            console.error("SVG to PNG conversion failed:", error);
            toast.error("Failed to download chart");
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        image.onerror = (e) => {
          console.error("Image load error for SVG:", e);
          toast.error("Failed to download chart");
          URL.revokeObjectURL(url);
        };
        // For cross-origin SVGs, ensure the server serves the SVG with appropriate CORS headers
        image.crossOrigin = "anonymous";
        image.src = url;
        return;
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download chart");
    }
  }, []);

  const transformChartData = (data) => {
    const transformedData = [];

    if (data?.columnNamesWithValuesANDCounting) {
      const responseData = data.columnNamesWithValuesANDCounting;

      // Handle array of objects format
      if (Array.isArray(responseData)) {
        responseData.forEach((dataObject) => {
          if (typeof dataObject === "object" && dataObject !== null) {
            Object.entries(dataObject).forEach(([key, count]) => {
              const cleanKey = key.replace(/^{|}$/g, "");
              const pairs = cleanKey.split(",").map((pair) => pair.trim());
              const dataPoint = { count };

              pairs.forEach((pair) => {
                const equalIndex = pair.indexOf("=");
                if (equalIndex > -1) {
                  const fieldName = pair.substring(0, equalIndex).trim();
                  const value = pair.substring(equalIndex + 1).trim();
                  if (fieldName && value !== undefined) {
                    dataPoint[fieldName] = value === "" ? "Empty" : value;
                  }
                }
              });

              transformedData.push(dataPoint);
            });
          }
        });
      }
      // Handle single object format
      else if (typeof responseData === "object") {
        Object.entries(responseData).forEach(([key, count]) => {
          const cleanKey = key.replace(/^{|}$/g, "");
          const pairs = cleanKey.split(",").map((pair) => pair.trim());
          const dataPoint = { count };

          pairs.forEach((pair) => {
            const equalIndex = pair.indexOf("=");
            if (equalIndex > -1) {
              const fieldName = pair.substring(0, equalIndex).trim();
              const value = pair.substring(equalIndex + 1).trim();
              if (fieldName && value !== undefined) {
                dataPoint[fieldName] = value === "" ? "Empty" : value;
              }
            }
          });

          transformedData.push(dataPoint);
        });
      }
    }
    // Handle direct array format
    else if (Array.isArray(data) && data.length > 0) {
      data.forEach((item) => {
        transformedData.push({ ...item });
      });
    }

    return transformedData;
  };

  // Chart Configuration
  const keys = occurrences?.length > 0 ? Object.keys(occurrences[0]) : [];
  const labelKey =
    keys.find((key) => key.toLowerCase().includes("version")) ||
    keys.find((key) => !key.toLowerCase().includes("count")) ||
    keys[0];
  const countKey =
    keys.find((key) => key.toLowerCase().includes("count")) ||
    keys.find((key) => typeof occurrences[0]?.[key] === "number") ||
    "count";

  // Get unique labels once for consistent color mapping
  const allLabels = Array.from(
    new Set(
      occurrences?.map((item) => {
        // Create a composite label from all non-count fields
        const nonCountFields = Object.entries(item)
          .filter(([key]) => key !== "count" && key !== "tableName")
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        return nonCountFields || item[labelKey] || "Unknown";
      }),
    ),
  );

  const getColor = (label) => {
    const index = allLabels.indexOf(label) % COLORS.length;
    return COLORS[index];
  };
  const transformedData = transformChartData(occurrences || chartData);
  const storedColors = transformedData.map((_, i) => COLORS[i % COLORS.length]);

  // Enhanced labels and values extraction
  const labels =
    occurrences?.map((item) => {
      // Always use the full composite label for multiple columns, but exclude 'count' and 'tableName'
      const nonCountFields = Object.entries(item)
        .filter(([key]) => key !== "count" && key !== "tableName")
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      return nonCountFields || item[labelKey] || "Unknown";
    }) || [];

  const values = occurrences?.map((item) => item[countKey] || 0) || [];

  const pieChartData = {
    labels,
    datasets: [
      {
        label: `Count`,
        data: values,
        backgroundColor: storedColors,
        hoverBackgroundColor: storedColors,
      },
    ],
  };

  const pieChartOptions = {
    plugins: {
      legend: {
        display: handleLabels,
        // display: false,
        position: "left",
        align: "center",
        labels: {
          boxWidth: 20,
          padding: 10,
          generateLabels: (chart) => {
            const data = chart.data;
            return data.labels.map((label, i) => {
              const item = occurrences[i];
              const fullLabel = item
                ? Object.entries(item)
                    // .filter(([key]) => key !== "count")
                    .map(([key, value], i) =>
                      i === Object.entries(item).length - 1 ? value : "",
                    )
                    .join("")
                : String(label);
              return {
                text: fullLabel,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle:
                  data.datasets[0].borderColor?.[i] ||
                  data.datasets[0].backgroundColor[i],
                index: i,
              };
            });
          },
        },
      },
      datalabels: {
        formatter: (value, context) => {
          if (["Pie Chart", "Doughnut Chart"].includes(chartType)) {
            const total = context.dataset.data.reduce((sum, val) => {
              const count = typeof val === "object" ? val?.label : val;
              return sum + count;
            }, 0);

            // Calculate percentage for current value
            const count = typeof value === "object" ? value?.label : value;
            const percentage = ((count / total) * 100).toFixed(1);

            return `${percentage}%`;
          } else {
            const count = typeof value === "object" ? value?.label : value;
            return count > 1000 ? `${(count / 1000).toFixed(1)}k` : count;
          }
        },
        color: "#000",
        display: showLabelValues,
        font: {
          weight: "bold",
          size: 12,
        },
        anchor: "end",
        align: "end",
        offset: 10,
        clamp: true,
      },
      tooltip: {
        callbacks: {
          title: function (context) {
            const index = context[0].dataIndex;
            const item = occurrences[index];
            if (!item) return "";
            return Object.entries(item)
              .filter(([key]) => key !== "count")
              .filter(([key]) => key !== "tableName")
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n");
          },
          label: function (context) {
            const index = context.dataIndex;
            const item = occurrences[index];
            if (!item) return "";

            return `Count: ${item.count.toLocaleString()}`;
          },
        },
      },
    },
    onClick: (event, elements, chart) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const item = occurrences[index];
        if (isCountColum) {
          setSelectedSlice(
            Object.fromEntries(
              Object.entries(item).filter(
                ([key]) => !["tableName"].includes(key),
              ),
            ),
          );
        } else
          setSelectedSlice(
            Object.fromEntries(
              Object.entries(item).filter(
                ([key, val]) => !["count", "tableName"].includes(key),
              ),
            ),
          );
        setShowModal(true);
      }
    },
    layout: {
      padding: {
        top: 40,
        bottom: 20,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // Rest of your chart configurations remain the same...
  const lineChartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: storedColors,
        hoverBackgroundColor: storedColors,
      },
    ],
  };

  const barChartData = { ...lineChartData };
  const doughnutChartData = { ...pieChartData };

  const radarChartData = {
    labels,
    datasets: [
      {
        label: `Count of ${countKey}`,
        data: values,
        backgroundColor: storedColors,
        hoverBackgroundColor: storedColors,
      },
    ],
  };

  const polarAreaChartData = { ...pieChartData };

  const bubbleChartData = {
    datasets: occurrences?.map((item, index) => {
      return {
        label: item[labelKey] || "Unknown",
        data: [
          {
            x: item.xValue || index,
            y: item[countKey],
            r: item.radius || 10,
            label:
              item.count || Object.values(item)[Object.values(item).length - 1],
          },
        ],
        backgroundColor: getColor(item[labelKey] || "Unknown"),
        borderColor: getColor(item[labelKey] || "Unknown"),
      };
    }),
  };

  const scatterChartData = {
    datasets: occurrences?.map((item, index) => ({
      label: item[labelKey] || "Unknown",
      data: [
        {
          x: index,
          y: item[countKey],
          label:
            item.count || Object.values(item)[Object.values(item).length - 1],
        },
      ],
      backgroundColor: getColor(item[labelKey] || "Unknown"),
      borderColor: getColor(item[labelKey] || "Unknown"),
    })),
  };

  // ECharts configuration for pie and doughnut charts
  const createEChartsOption = useCallback(
    (chartType) => {
      if (!occurrences || occurrences.length === 0) {
        return {};
      }

      const chartData = occurrences.map((item, index) => {
        const nonCountFields = Object.entries(item)
          .filter(([key]) => key !== "count" && key !== "tableName")
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");

        const shortLabel = Object.entries(item)
          .filter(([key]) => key !== "count" && key !== "tableName")
          .map(([_, value]) => {
            // Truncate long values and add ellipsis
            const strValue = String(value);
            return strValue.length > 30
              ? `${strValue.substring(0, 30)}...`
              : strValue;
          })
          .join(" , ");

        const baseLabel = nonCountFields || item[labelKey] || "Unknown";
        const value = Number(item[countKey]) || 0;

        return {
          name: shortLabel || "Unknown",
          fullName: baseLabel,
          customName: baseLabel,
          value: value,
          itemStyle: {
            color: storedColors[index % storedColors.length],
          },
        };
      });

      const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

      return {
        tooltip: {
          trigger: "item",
          formatter: function (params) {
            return `${
              params.data.fullName
            }<br/>Count: ${params.value.toLocaleString()}`;
          },
        },
        legend: {
          show: handleLabels,
          type: "scroll",
          orient: "vertical",
          top: "center",
          left: "left",
          padding: [5, 5, 5, 5],
          itemGap: 10,
          itemWidth: 14,
          itemHeight: 14,
          textStyle: {
            fontSize: 12,
            color: "#333",
            overflow: "truncate",
            width: 150,
          },
          formatter: function (name) {
            return name;
          },
          pageButtonItemGap: 5,
          pageButtonGap: 30,
          pageButtonPosition: "end",
          pageFormatter: "{current}/{total}",
          pageIconColor: "#2f4554",
          pageIconInactiveColor: "#aaa",
          pageIconSize: 15,
          pageTextStyle: {
            color: "#333",
          },
          animation: true,
          animationDurationUpdate: 800,
        },
        grid: {
          bottom: handleLabels ? 80 : 20,
        },
        series: [
          {
            name: "Chart Data",
            type: "pie",
            stillShowZeroSum: false,
            radius: chartType === "Doughnut Chart" ? ["40%", "60%"] : "65%",
            center: ["50%", "50%"],
            data: chartData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
            label: {
              show: showLabelValues,
              position: "outside",
              formatter: function (params) {
                const percentage = ((params.value / totalValue) * 100).toFixed(
                  1,
                );
                return `${percentage}%`;
              },
              fontSize: 12,
              fontWeight: "bold",
            },
            labelLine: {
              show: showLabelValues,
              length: 10,
              length2: 5,
              smooth: true,
            },
          },
        ],
        animation: true,
        animationType: "scale",
        animationEasing: "elasticOut",
        animationDuration: 1000,
      };
    },
    [
      occurrences,
      labelKey,
      countKey,
      storedColors,
      handleLabels,
      showLabelValues,
    ],
  );

  const previousCharts = {
    "Pie Chart": (
      <div className="w-full h-[70vh]">
        <ReactECharts
          option={createEChartsOption("Pie Chart")}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
          onEvents={{
            click: (params) => {
              const clickedItem = occurrences.find((item, index) => {
                const nonCountFields = Object.entries(item)
                  .filter(([key]) => key !== "count" && key !== "tableName")
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ");
                const baseLabel = nonCountFields || item[labelKey] || "Unknown";
                return (
                  baseLabel === params.data.fullName ||
                  baseLabel === params.data.customName
                );
              });

              if (clickedItem) {
                if (isCountColum) {
                  setSelectedSlice(
                    Object.fromEntries(
                      Object.entries(clickedItem).filter(
                        ([key]) => !["tableName"].includes(key),
                      ),
                    ),
                  );
                } else {
                  setSelectedSlice(
                    Object.fromEntries(
                      Object.entries(clickedItem).filter(
                        ([key]) => !["count", "tableName"].includes(key),
                      ),
                    ),
                  );
                }
                setShowModal(true);
              }
            },
          }}
        />
      </div>
    ),
    "Bar Chart": (
      <Bar
        data={barChartData}
        options={pieChartOptions}
        plugins={[ChartDataLabels]}
      />
    ),
    "Line Chart": (
      <Line
        data={lineChartData}
        options={pieChartOptions}
        plugins={[ChartDataLabels]}
      />
    ),
    "Matrix Chart":
      ChartselectedTableName?.length > 0 ? (
        <MatrixChart
          showPadding
          showLabelValuesStatus={showLabelValues}
          showLabelsStatus={handleLabels}
          setSelectedSlice={setSelectedSlice}
          setShowModal={setShowModal}
          // tableName={ChartselectedTableName}
          columnNames={ChartselectedColumns}
          // chartData={
          //   transformMatrixtData(
          //     ChartselectedColumns,
          //     chartData?.columnNamesWithValuesANDCounting || chartData
          //   ) || []
          // }
          chartData={
            location.state?.isFavorite
              ? chartData?.columnNamesWithValuesANDCounting
              : []
          }
          callApi={!location.state?.isFavorite}
        />
      ) : (
        <p>No data for Matrix Chart</p>
      ),

    "Venn Chart":
      ChartselectedTableName?.length > 0 ? (
        <VennChart
          tableName={ChartselectedTableName}
          columnNames={ChartselectedColumns}
          setSelectedSlice={setSelectedSlice}
          showLabelValuesStatus={showLabelValues}
          showLabelsStatus={handleLabels}
          setShowModal={setShowModal}
          height="80vh"
          width="100%"
          vennChartData={
            location.state?.isFavorite
              ? Object.values(chartData?.columnNamesWithValuesANDCounting || [])
                  .length
                ? chartData?.columnNamesWithValuesANDCounting
                : []
              : null
          }
        />
      ) : (
        <p>No data for Venn Diagram</p>
      ),
    "Card Chart":
      ChartselectedTableName?.length > 0 ? (
        <CardChartComponent
          tableName={ChartselectedTableName}
          columnNames={ChartselectedColumns}
          chartData={chartData || {}}
          count={count}
        />
      ) : (
        <p>No data for Card Chart</p>
      ),

    "Doughnut Chart": (
      <div className="w-full h-[70vh]">
        <ReactECharts
          option={createEChartsOption("Doughnut Chart")}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
          onEvents={{
            click: (params) => {
              const clickedItem = occurrences.find((item, index) => {
                const nonCountFields = Object.entries(item)
                  .filter(([key]) => key !== "count" && key !== "tableName")
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ");
                const baseLabel = nonCountFields || item[labelKey] || "Unknown";
                return (
                  baseLabel === params.data.fullName ||
                  baseLabel === params.data.customName
                );
              });

              if (clickedItem) {
                if (isCountColum) {
                  setSelectedSlice(
                    Object.fromEntries(
                      Object.entries(clickedItem).filter(
                        ([key]) => !["tableName"].includes(key),
                      ),
                    ),
                  );
                } else {
                  setSelectedSlice(
                    Object.fromEntries(
                      Object.entries(clickedItem).filter(
                        ([key]) => !["count", "tableName"].includes(key),
                      ),
                    ),
                  );
                }
                setShowModal(true);
              }
            },
          }}
        />
      </div>
    ),
    "Radar Chart": (
      <Radar
        data={radarChartData}
        options={pieChartOptions}
        plugins={[ChartDataLabels]}
      />
    ),
    "Polar Area Chart": (
      <PolarArea
        data={polarAreaChartData}
        options={pieChartOptions}
        plugins={[ChartDataLabels]}
      />
    ),
    "Bubble Chart": (
      <Bubble
        data={bubbleChartData}
        options={pieChartOptions}
        plugins={[ChartDataLabels]}
      />
    ),
    "Scatter Chart": (
      <Scatter
        data={scatterChartData}
        options={pieChartOptions}
        plugins={[ChartDataLabels]}
      />
    ),
  };

  return (
    <div className="flex w-full flex-col p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-end p-1">
        <div className="w-full flex justify-end items-center">
          <div className="inline-block text-left">
            {permissionList.includes(routeName) &&
              permissionDetails[routeName]?.hasWriteOnly && (
                <HiOutlineDotsVertical
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="w-5 h-5 text-gray-700 cursor-pointer hover:text-gray-900"
                />
              )}
            {menuOpen && (
              <div className="absolute right-10 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="p-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handleLabels}
                      onChange={handleToggleLabels}
                      className="hidden"
                    />
                    <div className="relative w-10 h-5 bg-gray-300 rounded-full">
                      <div
                        className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                          handleLabels ? "translate-x-5" : ""
                        }`}
                      />
                    </div>
                    <span className="ml-2 text-sm">Show Labels</span>
                  </label>
                </div>

                <div className="p-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLabelValues}
                      onChange={() => dispatch(toggleLabelValues(id))}
                      className="hidden"
                    />
                    <div className="relative w-10 h-5 bg-gray-300 rounded-full">
                      <div
                        className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                          showLabelValues ? "translate-x-5" : ""
                        }`}
                      />
                    </div>
                    <span className="ml-2 text-sm">Show Labels values</span>
                  </label>
                </div>
                <button
                  onClick={handleDownloadChart}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-gray-800 font-medium text-base rounded shadow hover:text-green-600 transition"
                >
                  <MdDownload
                    className="text-2xl"
                    color={bgColor.backgroundColor}
                  />
                  Download Chart
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <section
        className="flex items-center justify-center flex-col"
        ref={chartRef}
        style={{
          width: `${chartWidth}%`,
          height: `${chartHeight}vh`,
        }}
      >
        {loading ? (
          <span className="text-gray-500 text-sm">Loading chart...</span>
        ) : occurrences?.length > 0 ? (
          React.cloneElement(previousCharts[chartType], {
            width: chartWidth,
            height: chartHeight,
            showLabels: handleLabels,
          })
        ) : (
          <span className="text-gray-400 text-sm">
            No data found to display the chart.
          </span>
        )}
        <div className="text-gray-500 mt-3 text-sm z-10">{description}</div>
      </section>

      {showModal && selectedSlice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 max-w-[90%]">
            <ChartTable
              selectedTableName={selectedTableName}
              selectedSlice={selectedSlice}
              isVennMatrix={
                dashboardData?.chartType === "Venn Chart" ||
                chartType === "Venn Chart" ||
                dashboardData?.chartType === "Matrix Chart" ||
                chartType === "Matrix Chart"
              }
              viewId={viewId}
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
    </div>
  );
};

export default ChartComponent;
