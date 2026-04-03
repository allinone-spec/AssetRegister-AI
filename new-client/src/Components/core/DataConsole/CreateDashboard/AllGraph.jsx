import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  deleteRequest,
  getRequest,
  patchRequest,
  postDataRequest,
} from "../../../../Service/api.service";
import { useLocation, useParams } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import ReactECharts from "echarts-for-react";
import {
  Bar,
  Bubble,
  Doughnut,
  Line,
  Pie,
  PolarArea,
  Radar,
  Scatter,
} from "react-chartjs-2";
import { useDispatch, useSelector } from "react-redux";
import { setFolderData } from "../../../../redux/Slices/FolderDataSlice";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import {
  addToFavorites,
  removeFromFavorites,
} from "../../../../redux/Slices/FavoritesSlice";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";
import {
  MdDataExploration,
  MdFavorite,
  MdFavoriteBorder,
} from "react-icons/md";
import toast from "react-hot-toast";
import { DeleteConfirm } from "../../../Common/DeleteConfirm";
import CardChartComponent from "../../../Common/CardChartComponent";
import MatrixChart from "../../../Common/MatrixChart";
import VennChart from "../../../Common/VennChart";
import { AiOutlineClose, AiOutlineDelete, AiOutlineEdit } from "react-icons/ai";
import { IoMdMore } from "react-icons/io";
import {
  initializeChartSettings,
  toggleLabels,
  toggleLabelValues,
} from "../../../../redux/Slices/ToggleLabel";
import { CircularProgress } from "@mui/material";
import DataTable from "../../../Common/DataTable";
import { useTheme } from "../../../../context/ThemeContext";

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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const ResponsiveGridLayout = WidthProvider(Responsive);

const AllGraph = ({
  routeName,
  onChartClick,
  isEmbedded = false,
  folderId: propFolderId,
  folderName: propFolderName,
  viewMode = "grid",
  setViewMode,
  onCreateDashboard,
  isDrawerOpen = false, // Add prop to track drawer state
  refreshKey,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isDark } = useTheme();
  const { folderId: paramFolderId } = useParams();
  const folderId = propFolderId || paramFolderId;
  const [loading, setLoading] = useState(false);
  const [layouts, setLayouts] = useState({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGraphId, setSelectedGraphId] = useState();
  const [selectedChartId, setSelectedChartId] = useState();
  const [isOpenInput, setIsOpenInput] = useState(null);
  const [filteredGraph, setFilterdGraph] = useState([]);
  const [renameLoader, setRenameLoader] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [newDashboardName, setNewDashboardName] = useState("");
  // const [showLabels, setShowLabels] = useState(false);
  // const [menuOpen, setMenuOpen] = useState(false);
  const [savePositionLoading, setSavePositionLoading] = useState(false); // Add this state
  const [isDragging, setIsDragging] = useState(false);
  const [justDragged, setJustDragged] = useState(false);
  const dragBlockTimeoutRef = useRef(null);
  const clickStartRef = useRef({ x: 0, y: 0 });
  const MOVE_THRESHOLD = 5; // px

  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );

  const selectedObject = useSelector((state) => state.selectedObject.value);
  // const handleLabels = useSelector(
  //   (state) =>
  //     state.labelToggle.chartSettings[selectedChartId]?.showLabels || false
  // );
  // const showLabelValues = useSelector(
  //   (state) =>
  //     state.labelToggle.chartSettings[selectedChartId]?.showLabelValues || false
  // );

  const chartSettings = useSelector((state) => state.labelToggle.chartSettings);
  const { chartFavorites } = useSelector((state) => state.favorites);

  const toggleLabelValue = () => dispatch(toggleLabelValues(selectedChartId));

  const handleToggleLabels = (selectedChartId) => {
    dispatch(toggleLabels(selectedChartId));
  };

  useEffect(() => {
    const storedData = localStorage.getItem("folderGraphData")
      ? JSON.parse(localStorage.getItem("folderGraphData"))
      : [];
    setAllGraphData(storedData);
  }, []);

  const [allGraphData, setAllGraphData] = useState(
    localStorage.getItem("folderGraphData")
      ? JSON.parse(localStorage.getItem("folderGraphData"))
      : [],
  );

  const handleDelete = () => {
    setIsModalOpen(true);
  };

  const handleFavorite = async (graph, e) => {
    e.stopPropagation();
    try {
      const response = await patchRequest(`/dashboard/${graph.id}/update`, {
        favourite: !graph.favourite,
      });

      if (response?.status === 200) {
        // Update the local state
        const updatedGraphData = allGraphData.map((item) =>
          item.id === graph.id ? { ...item, favourite: !item.favourite } : item,
        );
        setAllGraphData(updatedGraphData);
        localStorage.setItem(
          "folderGraphData",
          JSON.stringify(updatedGraphData),
        );
        // Update Redux favorites store
        if (!graph.favourite) {
          // Adding to favorites
          dispatch(
            addToFavorites({
              type: "chart",
              chart: {
                id: graph.id,
                dashBoardName: graph.dashBoardName,
                chartType: graph.chartType,
                folderId: folderId,
                folderName: heading, // Use the current folder name
                favourite: true,
                ...response.data,
              },
            }),
          );
        } else {
          // Removing from favorites
          dispatch(
            removeFromFavorites({
              type: "chart",
              chartId: graph.id,
            }),
          );
        }

        toast.success(
          graph.favourite ? "Removed from favorites" : "Added to favorites",
        );
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const { headingTitle } = useSelector((state) => state.title);
  const heading = propFolderName || location.state?.folderName || headingTitle;

  useEffect(() => {
    dispatch(setHeadingTitle(heading));
  }, [dispatch, heading]);

  const fetchAllGraphs = async () => {
    setLoading(true);
    try {
      if (!folderId) {
        return;
      }
      const response = await getRequest(
        `/dashboard/${folderId}/withUniqueColumnsValues`,
      );
      if (response?.status === 200) {
        const graphData = response?.data || [];
        setAllGraphData(graphData);
        localStorage.setItem("folderGraphData", JSON.stringify(graphData));

        const chartSettingsData = graphData
          .filter((graph) => graph.widgetPosition)
          .map((graph) => ({
            chartId: graph.id,
            showLabels: graph.widgetPosition.showLabel || false,
            showLabelValues: graph.widgetPosition.showLabelValue || false,
          }));

        if (chartSettingsData.length > 0) {
          dispatch(initializeChartSettings(chartSettingsData));
        }
      }
    } catch (error) {
      toast.error(error.response.data?.message, "Error fetching graphs:");
      setAllGraphData([]);
      localStorage.setItem("folderGraphData", "[]");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGraphs();
  }, [folderId, refreshKey]);

  // const generateColor = (id) => {
  //   const hash = id
  //     .split("")
  //     .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  //   const colorCode = `hsl(${hash % 360}, 70%, 50%)`;
  //   return colorCode;
  // };

  const allCharts = useMemo(
    () => ({
      "Pie Chart": Pie,
      "Bar Chart": Bar,
      "Line Chart": Line,
      "Matrix Chart": "",
      "Venn Chart": <VennChart />,
      "Card Chart": CardChartComponent,
      "Doughnut Chart": Doughnut,
      "Radar Chart": Radar,
      "Polar Area Chart": PolarArea,
      "Bubble Chart": Bubble,
      "Scatter Chart": Scatter,
    }),
    [],
  );

  const chartSettingsRef = useRef(chartSettings);

  useEffect(() => {
    chartSettingsRef.current = chartSettings;
  }, [chartSettings]);

  // Save positions to API
  const savePositions = async (currentLayouts) => {
    if (savePositionLoading) return;

    setSavePositionLoading(true);
    try {
      const positionsData = [];
      const currentChartSettings = chartSettingsRef.current; // Get latest value

      filteredGraph.forEach((graph) => {
        const layoutItem = currentLayouts.lg?.find(
          (item) => item.i === graph.id.toString(),
        );

        if (layoutItem) {
          const chartSetting = currentChartSettings[graph.id] || {};

          positionsData.push({
            position_id: graph.widgetPosition?.position_id || 0,
            userId: graph.userId || 0,
            dashBoardId: graph.id,
            showLabel: chartSetting.showLabels || false,
            showLabelValue: chartSetting.showLabelValues || false,
            x: layoutItem.x,
            y: layoutItem.y,
            width: Math.min(Math.max(layoutItem.w, 4), 12), // Ensure width is within bounds
            height: Math.min(Math.max(layoutItem.h, 4), 10), // Ensure height is within bounds
            rowOrder: layoutItem.y,
          });
        }
      });

      if (positionsData.length > 0) {
        await postDataRequest("/dashboard/savePositions", positionsData);
        // Optionally show success message
        // toast.success("Positions saved successfully");
      }
    } catch (error) {
      console.error("Error saving positions:", error);
      toast.error("Failed to save positions");
    } finally {
      setSavePositionLoading(false);
    }
  };

  // Breakpoints and column configurations
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
  const cols = { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 };

  // Handle layout change
  const onLayoutChange = (layout, layouts) => {
    setLayouts(layouts);
    // Debounce the save operation
    // const timeoutId = setTimeout(() => {
    //   savePositions(layouts);
    // }, 1000); // Save after 1 second of inactivity

    // return () => clearTimeout(timeoutId);
  };

  // Handle drag start - mark dragging
  const onDragStart = () => {
    setIsDragging(true);
    if (dragBlockTimeoutRef.current) {
      clearTimeout(dragBlockTimeoutRef.current);
      dragBlockTimeoutRef.current = null;
    }
  };

  // Handle drag stop - immediate save
  const onDragStop = (layout, oldItem, newItem) => {
    const currentLayouts = { ...layouts, lg: layout };
    savePositions(currentLayouts);
    setIsDragging(false);

    // Only mark as justDragged if position actually changed
    const moved =
      oldItem &&
      newItem &&
      (oldItem.x !== newItem.x ||
        oldItem.y !== newItem.y ||
        oldItem.w !== newItem.w ||
        oldItem.h !== newItem.h);

    if (moved) {
      setJustDragged(true);
      if (dragBlockTimeoutRef.current) {
        clearTimeout(dragBlockTimeoutRef.current);
      }
      dragBlockTimeoutRef.current = setTimeout(() => {
        setJustDragged(false);
        dragBlockTimeoutRef.current = null;
      }, 200);
    }
  };

  // Handle resize stop - immediate save
  const onResizeStop = (layout, oldItem, newItem) => {
    const currentLayouts = { ...layouts, lg: layout };
    savePositions(currentLayouts);

    // Only block if size actually changed
    const resized =
      oldItem &&
      newItem &&
      (oldItem.w !== newItem.w || oldItem.h !== newItem.h);
    if (resized) {
      setJustDragged(true);
      if (dragBlockTimeoutRef.current) {
        clearTimeout(dragBlockTimeoutRef.current);
      }
      dragBlockTimeoutRef.current = setTimeout(() => {
        setJustDragged(false);
        dragBlockTimeoutRef.current = null;
      }, 0);
    }
  };

  const handleNavigate = (data) => {
    if (onChartClick) {
      onChartClick(data);
      localStorage.setItem("folderData", JSON.stringify(data));
      return;
    }
    dispatch(setFolderData(data));
    // Navigation handled by parent component when not embedded
    console.warn("handleNavigate called but onChartClick not provided");
    localStorage.setItem("folderData", JSON.stringify(data));
  };

  // Mouse-based click vs drag discrimination
  const handleCardMouseDown = (e) => {
    clickStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCardMouseUp = (graph, e) => {
    e.stopPropagation();
    const { x, y } = clickStartRef.current;
    const dx = Math.abs(e.clientX - x);
    const dy = Math.abs(e.clientY - y);

    const isClick = dx <= MOVE_THRESHOLD && dy <= MOVE_THRESHOLD;
    // If it's a genuine click and not part of a drag/resize, navigate
    if (isClick && !isDragging && !justDragged) {
      handleNavigate(graph);
    }
  };

  const handleDeleteDashboard = async () => {
    setDeleteLoading(true);
    const toastId = toast.loading("Deleting dashboard...");
    try {
      const response = await deleteRequest(
        `/dashboard/${selectedGraphId.id}/delete`,
      );
      if (response.status === 200) {
        // Check if the deleted chart is in favorites and remove it
        const isChartFavorited = chartFavorites.some(
          (chart) => chart.id === selectedGraphId.id,
        );

        if (isChartFavorited) {
          dispatch(
            removeFromFavorites({ type: "chart", chartId: selectedGraphId.id }),
          );
        }

        setIsModalOpen(false);
        setShowModal(null);
        toast.success("Successfully Deleted");
        fetchAllGraphs();
      }
    } catch (error) {
      console.error("Error deleting graph:", error);
      toast.error(
        error.response?.data?.error || "Failed to delete. Please try again.",
      );
    } finally {
      setDeleteLoading(false);
      toast.dismiss(toastId);
    }
  };

  useEffect(() => {
    if (selectedObject) {
      const filterdData = allGraphData?.filter(
        (box) => box.object?.objectId == selectedObject,
      );
      setFilterdGraph(filterdData);
    } else {
      setFilterdGraph(allGraphData);
    }
  }, [allGraphData, selectedObject]);

  // Cleanup any pending timers on unmount
  useEffect(() => {
    return () => {
      if (dragBlockTimeoutRef.current) {
        clearTimeout(dragBlockTimeoutRef.current);
      }
    };
  }, []);

  const memoizedGraphData = useMemo(() => allGraphData, [allGraphData]);

  const transformChartData = (data) => {
    const transformedData = [];
    if (data && data?.columnNamesWithValuesANDCounting) {
      for (const key in data?.columnNamesWithValuesANDCounting) {
        const keyValuePairs = key.slice(1, -1).split(", ");
        const dataPoint = {};
        keyValuePairs?.forEach((pair) => {
          const [dataKey, dataValue] = pair.split("=");
          dataPoint[dataKey] = dataValue;
        });
        transformedData.push({
          ...dataPoint,
          count: data?.columnNamesWithValuesANDCounting[key],
        });
      }
    }
    return transformedData.sort((a, b) => b.count - a.count);
  };

  const transformMatrixtData = (columnNames, dataWithCounts) => {
    if (!columnNames || !dataWithCounts) return [];
    const result = [];

    const tableNames = Object.keys(columnNames);

    for (let i = 0; i < tableNames.length; i++) {
      const table1 = tableNames[i];

      for (let j = 0; j < tableNames.length; j++) {
        const table2 = tableNames[j];

        if (table1 === table2) {
          result.push({
            x: table1,
            y: table2,
            v: 0,
          });
          continue;
        }

        const minMatchValue = findMinMatchingOSValue(
          dataWithCounts[table1] || {},
          dataWithCounts[table2] || {},
          columnNames[table1][0],
          columnNames[table2][0],
        );

        result.push({
          x: table1,
          y: table2,
          v: minMatchValue,
        });
      }
    }

    return result;
  };

  const findMinMatchingOSValue = (
    table1Data,
    table2Data,
    table1Column,
    table2Column,
  ) => {
    let minValue = Infinity;
    let matchFound = false;

    const table1OSValues = {};
    Object.keys(table1Data).forEach((key) => {
      const match = key.match(new RegExp(`\\{${table1Column}=(.+?)\\}`));
      if (match && match[1]) {
        const osValue = match[1];
        table1OSValues[osValue] = table1Data[key];
      }
    });

    const table2OSValues = {};
    Object.keys(table2Data).forEach((key) => {
      const match = key.match(new RegExp(`\\{${table2Column}=(.+?)\\}`));
      if (match && match[1]) {
        const osValue = match[1];
        table2OSValues[osValue] = table2Data[key];
      }
    });

    for (const [os1, count1] of Object.entries(table1OSValues)) {
      for (const [os2, count2] of Object.entries(table2OSValues)) {
        if (os1 === os2 && os1 !== "NULL" && os1 !== "null") {
          matchFound = true;
          const currentMin = Math.min(count1, count2);
          minValue = Math.min(minValue, currentMin);
        }
      }
    }

    return matchFound ? minValue : 0;
  };

  const transformMatrixtableData = (data) => {
    if (!data) return [];
    const tableNames = Object.keys(data).filter((key) =>
      Array.isArray(data[key]),
    );
    return tableNames;
  };

  const handleRightClick = (data) => {
    setSelectedChartId(data.id);
    setShowModal(data);
    setIsOpenInput({ dashBoardName: data.dashBoardName, id: data.id });
    setNewDashboardName(data.dashBoardName);
  };

  const handleUpdateDashboard = async (e) => {
    if (e) {
      const toastId = toast.loading("Updating dashboard name...");
      setRenameLoader(true);
      try {
        const payload = {
          dashboardName: newDashboardName || "Default Dashboard Name",
        };

        const response = await patchRequest(
          `/dashboard/${isOpenInput.id}/update`,
          payload,
        );
        if (response.status === 200) {
          setIsOpenInput(null);
          fetchAllGraphs();
          setShowModal(null);
          toast.success("Dashboard Name Updated Successfully");
        }
      } catch (error) {
        console.error("Failed to update dashboard name:", error);
        toast.error(
          error.response?.data?.error || "Failed to update Dashboard Name",
        );
      } finally {
        toast.dismiss(toastId);
        setRenameLoader(false);
      }
    }
  };

  const getLimitedChartData = (transformedData, maxItems = 50) => {
    const sortedData = transformedData.sort((a, b) => b.count - a.count);
    // .slice(0, maxItems);s

    return sortedData;
  };

  // Generate responsive layouts
  const generateResponsiveLayouts = (graphs) => {
    const layouts = {};

    // Get layout from saved positions with height constraints
    const defaultLayout = graphs.map((graph, index) => {
      const widgetPosition = graph.widgetPosition;

      if (widgetPosition) {
        // When drawer is open, force single column but keep relative Y order
        if (isDrawerOpen) {
          return {
            i: graph.id.toString(),
            x: 0, // Force start at left
            y: widgetPosition.y || 0, // Keep original Y position for consistency
            w: 12, // Full width when drawer is open
            h: Math.min(Math.max(widgetPosition.height || 5, 4), 10),
            minW: 12, // Force full width
            maxW: 12,
            minH: 4,
            maxH: 10,
          };
        } else {
          // Normal saved position layout when drawer is closed
          return {
            i: graph.id.toString(),
            x: widgetPosition.x || 0,
            y: widgetPosition.y || 0,
            w: Math.min(Math.max(widgetPosition.width || 6, 4), 12),
            h: Math.min(Math.max(widgetPosition.height || 5, 4), 10),
            minW: 4,
            maxW: 12,
            minH: 4,
            maxH: 10,
          };
        }
      }

      // Default layout if no saved position
      if (isDrawerOpen) {
        // Single column layout when drawer is open
        return {
          i: graph.id.toString(),
          x: 0,
          y: index * 6, // Simple vertical stacking
          w: 12, // Full width
          h: 5,
          minW: 12,
          maxW: 12,
          minH: 4,
          maxH: 10,
        };
      } else {
        // Normal grid layout when drawer is closed
        return {
          i: graph.id.toString(),
          x: (index % 2) * 6,
          y: Math.floor(index / 2) * 4,
          w: 6,
          h: 5,
          minW: 4,
          maxW: 12,
          minH: 4,
          maxH: 10,
        };
      }
    });

    // Mobile (xs, xxs) - 1 column
    const mobileLayout = graphs.map((graph, index) => ({
      i: graph.id.toString(),
      x: 0,
      y: index * 4,
      w: 12,
      h: 4,
      minW: 8,
      maxW: 12,
      minH: 4,
      maxH: 8, // Maximum height for mobile screens
    }));

    layouts.lg = defaultLayout;
    layouts.md = defaultLayout;
    layouts.sm = defaultLayout;
    layouts.xs = defaultLayout;
    layouts.xxs = mobileLayout;

    return layouts;
  };

  // Update label settings and save positions
  const updateLabelSettings = async (chartId, labelType, value) => {
    if (labelType === "showLabels") {
      handleToggleLabels(chartId);
    } else if (labelType === "showLabelValues") {
      toggleLabelValue();
    }

    // Save updated settings to positions
    setTimeout(() => {
      savePositions(layouts);
    }, 100);
  };

  const transformData = useCallback((columnNamesWithValuesANDCounting) => {
    if (
      !columnNamesWithValuesANDCounting ||
      typeof columnNamesWithValuesANDCounting !== "object"
    ) {
      return [];
    }

    const graphData = [];

    if (
      Object.keys(columnNamesWithValuesANDCounting).some(
        (key) => typeof columnNamesWithValuesANDCounting[key] === "number",
      )
    ) {
      for (const key in columnNamesWithValuesANDCounting) {
        if (columnNamesWithValuesANDCounting.hasOwnProperty(key)) {
          const count = columnNamesWithValuesANDCounting[key];
          const cleanKey = key.replace(/^{|}$/g, "");

          // Special handling for register count columns
          if (cleanKey.startsWith("count=")) {
            const countValue = cleanKey.split("=")[1];
            const actualCount = parseInt(countValue) * count;
            graphData.push({
              [cleanKey.split("=")[0]]: `${countValue}`,
              size: actualCount,
            });
          } else {
            // Improved parsing: tokens without '=' are continuations of the previous value
            const tokens = cleanKey.split(/\s*,\s*/);
            const rowObject = {};
            let currentKey = null;
            let currentValue = null;

            tokens.forEach((token) => {
              if (token.includes("=")) {
                // push previous key
                if (currentKey) {
                  rowObject[currentKey] = currentValue;
                }
                const parts = token.split(/=(.+)/);
                currentKey = (parts[0] || "").trim();
                currentValue = parts[1] !== undefined ? parts[1].trim() : "";
              } else {
                // continuation of previous value
                if (currentKey) {
                  currentValue = currentValue
                    ? `${currentValue}, ${token.trim()}`
                    : token.trim();
                } else {
                  // no current key, accumulate into a generic Value field
                  if (!rowObject.Value) rowObject.Value = token.trim();
                  else rowObject.Value = `${rowObject.Value}, ${token.trim()}`;
                }
              }
            });

            if (currentKey) rowObject[currentKey] = currentValue;
            rowObject["count"] = count;
            graphData.push(rowObject);
          }
        }
      }
    } else {
      for (const category in columnNamesWithValuesANDCounting) {
        if (columnNamesWithValuesANDCounting.hasOwnProperty(category)) {
          const categoryData = columnNamesWithValuesANDCounting[category];

          for (const key in categoryData) {
            if (categoryData.hasOwnProperty(key)) {
              const count = categoryData[key];
              const cleanKey = key.replace(/^{|}$/g, "");
              const keyValuePairs = cleanKey.split(", ");
              const rowObject = {};

              keyValuePairs.forEach((pair) => {
                const [k, v] = pair.split("=");
                if (k && v !== undefined) {
                  rowObject[k.trim()] = v?.trim();
                }
              });
              rowObject["count"] = count;
              graphData.push(rowObject);
            }
          }
        }
      }
    }

    return graphData;
  }, []);

  // ECharts configuration function for pie and doughnut charts
  const createEChartsOption = useCallback(
    (chartType, limitedData, showLabelsStatus, showLabelValuesStatus) => {
      if (!limitedData || limitedData.length === 0) {
        return {};
      }

      const chartData = limitedData.map((item, index) => {
        const nonCountFields = Object.entries(item)
          .filter(([key]) => key !== "count" && key !== "tableName")
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");

        // Create a shorter, more user-friendly label for legend
        const shortLabel = Object.entries(item)
          .filter(([key]) => key !== "count" && key !== "tableName")
          .map(([_, value]) => {
            // Truncate long values and add ellipsis
            const strValue = String(value);
            return strValue.length > 30
              ? strValue.substring(0, 30) + "..."
              : strValue;
          })
          .join(", ");

        const baseLabel = nonCountFields || "Unknown";
        const value = Number(item.count) || 0;

        return {
          name: shortLabel || "Unknown",
          fullName: baseLabel,
          customName: baseLabel,
          value: value,
          itemStyle: {
            color: COLORS[index % COLORS.length],
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
          show: showLabelsStatus,
          type: "scroll",
          orient: "vertical",
          top: "center",
          left: 0,
          padding: [5, 5, 5, 5],
          itemGap: 10,
          itemWidth: 14,
          itemHeight: 14,
          textStyle: {
            fontSize: 10,
            color: "var(--text-primary)",
            overflow: "truncate",
            width: 120,
          },
          formatter: function (name) {
            return name;
          },
          pageButtonItemGap: 5,
          pageButtonGap: 20,
          pageButtonPosition: "end",
          pageFormatter: "{current}/{total}",
          pageIconColor: "var(--text-sub)",
          pageIconInactiveColor: "var(--text-faint)",
          pageIconSize: 12,
          pageTextStyle: {
            color: "var(--text-primary)",
            fontSize: 10,
          },
          animation: true,
          animationDurationUpdate: 800,
        },
        grid: {
          bottom: 10,
        },
        series: [
          {
            name: "Chart Data",
            type: "pie",
            stillShowZeroSum: false,
            radius: chartType === "Doughnut Chart" ? ["35%", "75%"] : "75%",
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
              show: showLabelValuesStatus,
              position: "outside",
              formatter: function (params) {
                const percentage = ((params.value / totalValue) * 100).toFixed(
                  1,
                );
                return `${percentage}%`;
              },
              fontSize: 10,
              fontWeight: "bold",
              distanceToLabelLine: 3,
            },
            labelLine: {
              show: showLabelValuesStatus,
              length: 8,
              length2: 3,
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
    [],
  );

  return (
    <div className={isEmbedded ? "" : "min-h-screen bg-page-bg"}>
      <main className={isEmbedded ? "" : "px-6 pb-6"}>
        <div className="min-h-[80vh]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-surface rounded-xl shadow-theme border border-theme p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-4 bg-input-bg rounded w-1/4"></div>
                      <div className="h-4 bg-input-bg rounded w-4"></div>
                    </div>
                    <div className="h-72 bg-input-bg rounded-lg mb-4"></div>
                    <div className="h-4 bg-input-bg rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-input-bg rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGraph?.length !== 0 ? (
            viewMode === "list" ? (
              // List View
              <div className="space-y-4">
                {filteredGraph?.map((graph, index) => {
                  // Get the current label settings for this specific chart
                  const currentChartSettings = chartSettings?.[graph?.id] || {};
                  const savedPosition = graph?.widgetPosition || {};

                  const showLabelsStatus =
                    currentChartSettings.showLabels !== undefined
                      ? currentChartSettings.showLabels
                      : savedPosition.showLabel || false;

                  const showLabelValuesStatus =
                    currentChartSettings.showLabelValues !== undefined
                      ? currentChartSettings.showLabelValues
                      : savedPosition.showLabelValue || false;

                  return (
                    <div
                      key={graph?.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(graph);
                      }}
                      className="bg-surface rounded-xl shadow-theme hover:shadow-accent border border-theme p-6 cursor-pointer transition-all duration-300 hover:border-accent/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-16 h-16 bg-accent-dim rounded-lg flex items-center justify-center">
                            <span className="text-xl font-bold text-accent">
                              {graph?.chartType?.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-primary truncate">
                              {graph?.dashBoardName}
                            </h3>
                            <p className="text-sm text-sub mt-1">
                              {graph?.chartType} • {graph?.accessType}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-faint">
                                Labels: {showLabelsStatus ? "On" : "Off"}
                              </span>
                              <span className="text-xs text-faint">
                                Values: {showLabelValuesStatus ? "On" : "Off"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {graph.favourite ? (
                            <button
                              onClick={(e) => handleFavorite(graph, e)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <MdFavorite size={20} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleFavorite(graph, e)}
                              className="p-2 text-faint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <MdFavoriteBorder size={20} />
                            </button>
                          )}
                          {permissionList.includes(routeName) &&
                            permissionDetails[routeName]?.hasWriteOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRightClick(graph);
                                }}
                                className="p-2 text-sub hover:bg-accent-dim rounded-lg transition-colors"
                              >
                                <IoMdMore size={20} />
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Grid View
              <ResponsiveGridLayout
                className="layout"
                layouts={generateResponsiveLayouts(filteredGraph)}
                breakpoints={breakpoints}
                cols={cols}
                rowHeight={60}
                onLayoutChange={onLayoutChange}
                onDragStart={onDragStart}
                onDragStop={onDragStop}
                onResizeStop={onResizeStop}
                resizeHandles={["e", "n", "s", "w"]}
                isDraggable={!isDrawerOpen} // Disable dragging when drawer is open
                isResizable={!isDrawerOpen} // Disable resizing when drawer is open
                margin={[16, 16]}
                draggableCancel={[".IoMdMore"]}
                containerPadding={[0, 0]}
                compactType="vertical"
                preventCollision={false}
                bounds="parent"
              >
                {filteredGraph?.map((graph, index) => {
                  // Get the current label settings for this specific chart
                  const currentChartSettings = chartSettings?.[graph?.id] || {};
                  const savedPosition = graph?.widgetPosition || {};

                  // Use Redux state if available, otherwise use saved position data
                  const showLabelsStatus =
                    currentChartSettings.showLabels !== undefined
                      ? currentChartSettings.showLabels
                      : savedPosition.showLabel || false;

                  const showLabelValuesStatus =
                    currentChartSettings.showLabelValues !== undefined
                      ? currentChartSettings.showLabelValues
                      : savedPosition.showLabelValue || false;

                  const ChartComponentData = allCharts[graph?.chartType];
                  const transformedData = transformChartData(graph);
                  const limitedData = getLimitedChartData(transformedData, 50);
                  const storedColors = transformedData.map(
                    (_, i) => COLORS[i % COLORS.length],
                  );

                  const chartData = {
                    labels: limitedData.map((item, index) => {
                      const label = Object.values(item)
                        .filter((value) => typeof value !== "number")
                        .join(", ");
                      return label.length > 20
                        ? `${label.substring(0, 5)}...`
                        : label;
                    }),
                    datasets: [
                      {
                        label: "Count",
                        data: transformedData.map((item) => item.count),
                        backgroundColor: storedColors,
                        borderWidth: 1,
                      },
                    ],
                  };

                  const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: {
                        top: ["Pie Chart", "Doughnut Chart"].includes(
                          graph?.chartType,
                        )
                          ? 20
                          : 0,
                        bottom: ["Pie Chart", "Doughnut Chart"].includes(
                          graph?.chartType,
                        )
                          ? 20
                          : 0,
                      },
                    },
                    plugins: {
                      legend: {
                        // display: false, // Use the corrected value
                        display: showLabelsStatus, // Use the corrected value
                        position: "left",
                        align: "center",
                        labels: {
                          color: isDark ? "#f1f5f9" : "#333",
                          boxWidth: 8,
                          font: {
                            size: 10,
                          },
                          generateLabels: (chart) => {
                            const data = chart.data;
                            return data.labels.map((label, i) => {
                              const item = transformedData[i];
                              const fullLabel = item
                                ? Object.entries(item)
                                    .map(([key, value], i) => {
                                      //  `${key}: ${value}`;
                                      return i == 0 ? value : "";
                                    })
                                    .join("")
                                : // .join(", ")
                                  String(label);

                              const truncatedLabel =
                                fullLabel.length > 20
                                  ? `${fullLabel.substring(0, 10)}...`
                                  : fullLabel;

                              return {
                                text: fullLabel,
                                fontColor: isDark ? "#f1f5f9" : "#333",
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
                          if (
                            ["Pie Chart", "Doughnut Chart"].includes(
                              graph?.chartType,
                            )
                          ) {
                            const total = context.dataset.data.reduce(
                              (sum, val) => {
                                return sum + val;
                              },
                              0,
                            );

                            const percentage = ((value / total) * 100).toFixed(
                              1,
                            );

                            return `${percentage}%`;
                          } else {
                            return value > 1000
                              ? `${(value / 1000).toFixed(1)}k`
                              : value;
                          }
                        },
                        // formatter: (_, context) => {
                        //   const label =
                        //     context.chart.data.labels[context.dataIndex];
                        //   return label;
                        // },
                        color: "var(--text-primary)",
                        display: showLabelValuesStatus,
                        font: {
                          weight: "bold",
                          size: 10,
                        },
                        anchor: "end",
                        align: "end",
                        offset: 5,
                        clamp: true,
                      },
                      tooltip: {
                        enabled: true,
                        mode: "nearest",
                        intersect: false,
                        callbacks: {
                          title: function (context) {
                            const index = context[0].dataIndex;
                            const item = limitedData[index];
                            if (!item) return "";

                            return Object.entries(item)
                              .filter(([key]) => key !== "count")
                              .map(([key, value]) => `${key}: ${value}`)
                              .join("\n");
                          },
                          label: function (context) {
                            const index = context.dataIndex;
                            const item = limitedData[index];
                            if (!item) return "";

                            return `Count: ${item.count.toLocaleString()}`;
                          },
                        },
                        titleFont: {
                          size: 12,
                        },
                        bodyFont: {
                          size: 11,
                        },
                        maxWidth: 300,
                        wrap: true,
                      },
                    },
                  };

                  return (
                    <div
                      key={graph?.id.toString()}
                      className="group relative transition-all duration-300 hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                    >
                      {/* Enhanced Chart Card */}
                      <div
                        onMouseDown={handleCardMouseDown}
                        onMouseUp={(e) => handleCardMouseUp(graph, e)}
                        className="chatCard relative bg-surface/90 backdrop-blur-sm shadow-theme hover:shadow-accent rounded-2xl h-full w-full cursor-default transition-all duration-300 border border-accent-glow hover:border-accent/30 overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="absolute top-0 left-0 right-0 z-20 bg-nav-bg/95 backdrop-blur-sm p-2 border-b border-theme">
                          <div className="flex items-center justify-between">
                            {/* Center - Dashboard Name */}
                            {/* <div className="flex-1 text-center pl-16"> */}
                            <h3 className="ms-1 text-xl font-bold text-primary truncate">
                              {graph?.dashBoardName}
                              {/* {isOpenInput?.id === graph?.id ? (
                                  <input
                                    value={
                                      isOpenInput?.dashBoardName ||
                                      showModal?.dashBoardName
                                    }
                                    onChange={(e) =>
                                      setIsOpenInput((prev) => ({
                                        ...prev,
                                        dashBoardName: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) =>
                                      handleUpdateDashboard(
                                        e,
                                        isOpenInput?.id,
                                        isOpenInput?.dashBoardName
                                      )
                                    }
                                    className="bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500 w-full text-center"
                                    type="text"
                                  />
                                ) : (
                                  graph?.dashBoardName
                                )} */}
                            </h3>
                            {/* </div> */}

                            {/* Right side - Menu button */}
                            <div className="flex items-center">
                              {/* Left side - Favorite button */}
                              {graph.favourite ? (
                                <button
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onMouseUp={(e) => e.stopPropagation()}
                                  onClick={(e) => handleFavorite(graph, e)}
                                  className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove from favorites"
                                >
                                  <MdFavorite size={18} />
                                </button>
                              ) : (
                                <button
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onMouseUp={(e) => e.stopPropagation()}
                                  onClick={(e) => handleFavorite(graph, e)}
                                  className="p-1.5 text-faint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Add to favorites"
                                >
                                  <MdFavoriteBorder size={18} />
                                </button>
                              )}
                              {permissionList.includes(routeName) &&
                                permissionDetails[routeName]?.hasWriteOnly && (
                                  <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRightClick(graph);
                                    }}
                                    className="IoMdMore p-1.5 text-sub hover:text-primary hover:bg-input-bg rounded-lg transition-colors"
                                  >
                                    <IoMdMore size={18} />
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Chart Content Area */}
                        <div className="pt-14 pb-10 px-4 h-full flex flex-col justify-center relative">
                          {/* Chart Background Gradient */}
                          <div className="absolute inset-0 bg-surface pointer-events-none"></div>

                          <div className="relative z-10 h-full flex flex-col justify-center">
                            {graph?.chartType ? (
                              graph.chartType === "Card Chart" ? (
                                ChartComponentData ? (
                                  <CardChartComponent
                                    chartData={chartData}
                                    columnNames={graph?.columnNames}
                                    tableName={transformMatrixtableData(
                                      graph?.columnNames,
                                    )}
                                    count={
                                      Object.keys(
                                        graph?.columnNamesWithValuesANDCounting ||
                                          {},
                                      ).length
                                    }
                                  />
                                ) : (
                                  <p className="text-center text-sm text-gray-500">
                                    Chart Component not found
                                  </p>
                                )
                              ) : graph.chartType === "Matrix Chart" ? (
                                <MatrixChart
                                  // tableName={transformMatrixtableData(
                                  //   graph?.columnNames
                                  // )}
                                  columnNames={graph?.columnNames}
                                  showLabelValuesStatus={showLabelValuesStatus}
                                  showLabelsStatus={showLabelsStatus}
                                  // chartData={
                                  //   transformMatrixtData(
                                  //     graph?.columnNames,
                                  //     graph?.columnNamesWithValuesANDCounting
                                  //   ) || []
                                  // }
                                  callApi
                                />
                              ) : graph.chartType === "Venn Chart" ? (
                                <VennChart
                                  showLabelValuesStatus={showLabelValuesStatus}
                                  showLabelsStatus={showLabelsStatus}
                                  tableName={transformMatrixtableData(
                                    graph?.columnNames,
                                  )}
                                  columnNames={graph?.columnNames}
                                  chartData={
                                    graph?.columnNamesWithValuesANDCounting ||
                                    []
                                  }
                                />
                              ) : graph.chartType === "Pivot" ? (
                                <div className="h-[250px] overflow-auto">
                                  <DataTable
                                    columns={(() => {
                                      const transformedData = transformData(
                                        graph?.columnNamesWithValuesANDCounting,
                                      );
                                      const headerKeys =
                                        transformedData.length > 0
                                          ? Object.keys(transformedData[0])
                                          : [];
                                      return headerKeys.map((key) => ({
                                        accessorKey: key.replace(/[{}]/g, ""),
                                        header: key.replace(/[{}]/g, ""),
                                        enableGrouping: false,
                                      }));
                                    })()}
                                    data={transformData(
                                      graph?.columnNamesWithValuesANDCounting,
                                    )}
                                    enableRowSelection={false}
                                    enableRowOrdering={false}
                                    enableColumnOrdering={false}
                                    enableColumnVisibility={false}
                                    enableToSearch={false}
                                    enableEditing={true}
                                    enableFilter={false}
                                  />
                                </div>
                              ) : ChartComponentData ? (
                                <>
                                  {graph.chartType === "Pie Chart" ? (
                                    <ReactECharts
                                      option={createEChartsOption(
                                        "Pie Chart",
                                        limitedData,
                                        showLabelsStatus,
                                        showLabelValuesStatus,
                                      )}
                                      style={{ height: "100%", width: "100%" }}
                                      opts={{ renderer: "canvas" }}
                                    />
                                  ) : graph.chartType === "Doughnut Chart" ? (
                                    <ReactECharts
                                      option={createEChartsOption(
                                        "Doughnut Chart",
                                        limitedData,
                                        showLabelsStatus,
                                        showLabelValuesStatus,
                                      )}
                                      style={{ height: "100%", width: "100%" }}
                                      opts={{ renderer: "canvas" }}
                                    />
                                  ) : (
                                    <ChartComponentData
                                      data={chartData}
                                      options={chartOptions}
                                      showLabelsStatus={showLabelsStatus}
                                    />
                                  )}
                                </>
                              ) : (
                                <p className="text-center text-sm text-gray-500">
                                  Chart Component not found
                                </p>
                              )
                            ) : (
                              <p className="text-center text-sm text-gray-500">
                                No chart available
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bottom Right Metadata */}
                        <div className="absolute bottom-3 right-3 z-20 flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs bg-blue-100/80 backdrop-blur-sm text-blue-700 rounded-md font-medium border border-blue-200/50">
                            {graph?.accessType}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-100/80 backdrop-blur-sm text-gray-600 rounded-md font-medium border border-gray-200/50">
                            {graph?.chartType}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ResponsiveGridLayout>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-center max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-accent-dim rounded-full flex items-center justify-center">
                  <MdDataExploration className="text-4xl text-accent" />
                </div>
                <h3 className="text-2xl font-semibold text-primary mb-2">
                  No Charts Available
                </h3>
                <p className="text-sub mb-6">
                  Start building your dashboard by adding your first chart.
                  Create visualizations to analyze your data.
                </p>
                <button
                  disabled={
                    permissionList.includes(routeName) &&
                    !permissionDetails[routeName]?.hasWriteOnly
                  }
                  className={`${
                    permissionList.includes(routeName) &&
                    !permissionDetails[routeName]?.hasWriteOnly
                      ? "opacity-50"
                      : "opacity-100"
                  } px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium`}
                  onClick={() => {
                    if (onCreateDashboard) {
                      onCreateDashboard({
                        folderName: propFolderName,
                        folderId: folderId,
                      });
                    }
                  }}
                >
                  Create New Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-theme max-w-md w-full mx-4 overflow-hidden border border-theme">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-theme bg-nav-bg">
              <h3 className="text-lg font-semibold text-primary">
                Chart Settings
              </h3>
              <p className="text-sm text-sub mt-1">
                Customize your chart appearance and behavior
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Chart Name Input */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Chart Name
                </label>
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-input-bg text-primary"
                  placeholder="Enter chart name..."
                />
              </div>

              {/* Toggle Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-input-bg rounded-lg border border-theme">
                  <div>
                    <h4 className="font-medium text-primary">Show Labels</h4>
                    <p className="text-sm text-sub">Display chart legends</p>
                  </div>
                  <button
                    onClick={() =>
                      updateLabelSettings(selectedChartId, "showLabels")
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      (
                        chartSettings?.[selectedChartId]?.showLabels !==
                        undefined
                          ? chartSettings[selectedChartId].showLabels
                          : showModal?.widgetPosition?.showLabel || false
                      )
                        ? "bg-accent"
                        : "bg-border"
                    }`}
                  >
                    <div
                      className={`absolute left-1 top-1 w-4 h-4 bg-surface rounded-full shadow-sm transform transition-transform ${
                        (
                          chartSettings?.[selectedChartId]?.showLabels !==
                          undefined
                            ? chartSettings[selectedChartId].showLabels
                            : showModal?.widgetPosition?.showLabel || false
                        )
                          ? "translate-x-6"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-input-bg rounded-lg border border-theme">
                  <div>
                    <h4 className="font-medium text-primary">
                      Show Label Values
                    </h4>
                    <p className="text-sm text-sub">
                      Display data values on chart
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateLabelSettings(selectedChartId, "showLabelValues")
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      (
                        chartSettings?.[selectedChartId]?.showLabelValues !==
                        undefined
                          ? chartSettings[selectedChartId].showLabelValues
                          : showModal?.widgetPosition?.showLabelValue || false
                      )
                        ? "bg-accent"
                        : "bg-border"
                    }`}
                  >
                    <div
                      className={`absolute left-1 top-1 w-4 h-4 bg-surface rounded-full shadow-sm transform transition-transform ${
                        (
                          chartSettings?.[selectedChartId]?.showLabelValues !==
                          undefined
                            ? chartSettings[selectedChartId].showLabelValues
                            : showModal?.widgetPosition?.showLabelValue || false
                        )
                          ? "translate-x-6"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-surface border-t border-accent-dim">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setSelectedGraphId(showModal);
                    handleDelete();
                  }}
                  className="px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors font-medium"
                >
                  Delete Chart
                </button>
                <button
                  onClick={!renameLoader ? handleUpdateDashboard : undefined}
                  disabled={renameLoader}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    renameLoader
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-accent text-white"
                  }`}
                >
                  {renameLoader ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <DeleteConfirm
        isOpen={isModalOpen}
        close={() => setIsModalOpen(false)}
        handleDelete={handleDeleteDashboard}
        deleteLoading={deleteLoading}
      />
    </div>
  );
};

export default AllGraph;
