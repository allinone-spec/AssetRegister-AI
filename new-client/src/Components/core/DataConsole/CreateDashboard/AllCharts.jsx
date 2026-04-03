import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useTheme } from "../../../../ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import ChartComponent from "../../../ChartComponent";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { patchRequest, postDataRequest } from "../../../../Service/api.service";
import { postDataRequest as postAdminRequest } from "../../../../Service/admin.save";
import toast from "react-hot-toast";
import { IoArrowBack } from "react-icons/io5";
import { ChartPreviousModal } from "../../../Common/ChartPreviewModal";
import { AiOutlineBarChart } from "react-icons/ai";
import ChartTable from "./ChartTable";
import DataTable from "../../../Common/DataTable";
import { ResizableBottomDrawer } from "../../../Common/sideDrawer/ResizableBottomDrawer";

const charts = [
  "Pie Chart",
  "Bar Chart",
  "Line Chart",
  "Matrix Chart",
  "Venn Chart",
  "Card Chart",
  "Doughnut Chart",
  "Radar Chart",
  "Polar Area Chart",
  "Bubble Chart",
  "Scatter Chart",
  "Pivot",
];

const AllCharts = ({ routeName }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dashboardData } = useSelector((state) => state.dashboard);
  const { bgColor } = useTheme();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewChartModal, setPreviewChartModal] = useState(false);
  const [graphTableData, setGraphTableData] = useState(null);

  const { headingTitle } = useSelector((state) => state.title);
  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );

  // Memoize graphData to prevent unnecessary re-renders
  const graphData = useMemo(() => location.state?.data, [location.state?.data]);
  const isFavorite = useMemo(
    () => location.state?.isFavorite,
    [location.state?.isFavorite],
  );
  // Memoize heading calculation
  const heading = useMemo(
    () => graphData?.dashBoardName || headingTitle,
    [graphData?.dashBoardName, headingTitle],
  );

  // Initialize selectedChartType with useMemo to prevent re-initialization
  const [selectedChartType, setSelectedChartType] = useState(
    () => graphData?.chartType || charts[0],
  );

  // Fix useEffect with proper dependencies
  useEffect(() => {
    if (heading && heading !== headingTitle) {
      dispatch(setHeadingTitle(heading));
    }
  }, [heading, headingTitle]); // Added headingTitle to dependencies

  useEffect(() => {
    if (isFavorite && graphData?.columnNames) {
      const requestBody = {
        tableData: Object.entries(graphData.columnNames)?.map(([key, val]) => ({
          tableName: key,
          columnNames: val,
        })),
        ...(graphData?.viewId && {
          tableViewData: Object.entries(graphData.columnNames)?.map(
            ([_, val]) => ({
              viewId: graphData.viewId,
              columnNames: val,
            }),
          ),
        }),
      };
      if (
        graphData?.chartType === "Venn Chart" ||
        graphData?.chartType === "Matrix Chart"
      ) {
        postAdminRequest(
          graphData?.chartType === "Venn Chart"
            ? "/table/get/VennChart/data"
            : "/table/get/MatrixChart/data",
          requestBody,
        )
          .then((response) => setGraphTableData(response.data))
          .catch((error) => setGraphTableData(null));
      } else {
        postDataRequest(
          graphData?.viewId
            ? `/dashboard/getAggregateDataView`
            : "/dashboard/getAggregateData",
          requestBody,
        )
          .then((response) =>
            setGraphTableData(
              response.data.length ? response.data[0].data : null,
            ),
          )
          .catch((error) => setGraphTableData(null));
      }
    }
  }, [isFavorite, graphData?.columnNames]);

  // Memoize expensive computations
  const transformData = useCallback(
    (columnNamesWithValuesANDCounting) => {
      if (
        !columnNamesWithValuesANDCounting ||
        typeof columnNamesWithValuesANDCounting !== "object"
      ) {
        return [];
      }

      const graphData = [];

      if (
        ["Venn Chart", "Matrix Chart"].includes(selectedChartType) &&
        Array.isArray(columnNamesWithValuesANDCounting)
      ) {
        // For Venn/Matrix, expect array of objects with label/size
        return columnNamesWithValuesANDCounting.map((item) => {
          // If item is an object with label/size, use as is, else try to parse
          if (typeof item === "object" && item !== null) {
            return {
              label: item.label || item.Label || item.name || "",
              size: item.size || item.Size || item.value || 0,
            };
          }
          // If item is a string, try to parse as JSON
          try {
            const parsed = JSON.parse(item);
            return {
              label: parsed.label || parsed.Label || parsed.name || "",
              size: parsed.size || parsed.Size || parsed.value || 0,
            };
          } catch {
            return { label: String(item), size: 0 };
          }
        });
      } else if (
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
                    else
                      rowObject.Value = `${rowObject.Value}, ${token.trim()}`;
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
    },
    [selectedChartType],
  );
  // Memoize transformed data
  const transformedData = useMemo(() => {
    const dataSource = isFavorite
      ? graphTableData || {}
      : graphData?.columnNamesWithValuesANDCounting || {};
    if (graphData?.chartType === "Matrix Chart" && dataSource?.length) {
      return (
        dataSource?.map((v) => ({
          label: `${v.x} , ${v.y}`,
          size: v.v,
        })) || []
      );
    }
    const result = transformData(dataSource);
    return result;
  }, [graphData?.columnNamesWithValuesANDCounting, graphTableData, isFavorite]);

  // Memoize header keys
  const headerKeys = useMemo(
    () => (transformedData.length > 0 ? Object.keys(transformedData[0]) : []),
    [transformedData.length],
  );

  // Memoize chart selected table name
  const ChartselectedTableName = useMemo(
    () => Object.keys(graphData?.columnNames || {}),
    [graphData?.columnNames],
  );

  // Memoize selected table name
  const selectedTableName = useMemo(() => {
    const chartSelected = ChartselectedTableName;
    return Array.isArray(dashboardData?.tableName || chartSelected)
      ? dashboardData.tableName?.[0] || chartSelected[0]
      : dashboardData?.tableName || chartSelected[0];
  }, [dashboardData?.tableName, ChartselectedTableName]);

  // Memoize style objects
  const styles = useMemo(
    () => ({
      backgroundColor: bgColor.backgroundColor,
      buttonColor: bgColor.backgroundColor,
      textColor: bgColor.layoutTextColor,
    }),
    [bgColor],
  );

  const handleChangeTableGraphAnalyist = useCallback((event) => {
    setSelectedChartType(event.target.value);
  }, []);

  const handlePreviewChart = useCallback(() => {
    setPreviewChartModal(true);
  }, []);

  const handleClosePreviewChart = useCallback(() => {
    setPreviewChartModal(false);
  }, []);

  const handleUpdateDashboard = useCallback(async () => {
    const toastId = toast.loading("Updating dashboard...");
    setLoading(true);

    try {
      const folderData = localStorage.getItem("folderData")
        ? JSON.parse(localStorage.getItem("folderData"))
        : {};

      const {
        dashBoardName,
        folder,
        object,
        description,
        columnNames,
        tableNames,
        users,
        groups,
      } = folderData;

      const formattedColumnNames =
        columnNames && typeof columnNames === "object" ? columnNames : {};
      const formattedTableNames = Array.isArray(tableNames) ? tableNames : [];
      const isRestricted = folder?.folderType === "Restricted";

      const formattedUserIds = isRestricted
        ? users?.length
          ? users.map((user) => user.id)
          : [0]
        : [0];

      const formattedGroupIds = isRestricted
        ? groups?.length
          ? groups.map((group) => group.id)
          : [0]
        : [0];

      const payload = {
        dashboardName: dashBoardName,
        folderId: folder?.id || 0,
        objectId: object?.objectId || 0,
        folderType: folder?.folderType || "Public",
        description: description,
        chartType: selectedChartType,
        columnNames: formattedColumnNames,
        tableName: formattedTableNames,
        userIds: formattedUserIds,
        groupIds: formattedGroupIds,
      };

      localStorage.setItem(
        "SelectedObjectId",
        JSON.stringify(payload?.objectId),
      );

      const response = await patchRequest(
        `/dashboard/${folderData?.id}/update`,
        payload,
      );

      if (response.status === 200) {
        toast.success("Dashboard updated successfully");
        navigate(-1);
      }
    } catch (error) {
      console.error("Failed to update dashboard name:", error);
      toast.error(
        error.response?.data?.error || "Failed to update Dashboard Name",
      );
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  }, [selectedChartType]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedSlice(null);
  }, []);

  const handleRowClick = useCallback(
    (item) => {
      setShowModal(true);
      if ("Venn Chart" === selectedChartType) {
        const result = item.label.split("∩").map((tableName) => ({
          tableName: tableName?.trim(),
          columnNames: graphData.columnNames[tableName?.trim()] || [],
        }));
        setSelectedSlice(result);
      } else if ("Matrix Chart" === selectedChartType) {
        const tableNames = [
          ...new Set(
            item.label.split(",").map((tableName) => tableName?.trim()),
          ),
        ];
        const result = tableNames.map((tableName) => ({
          tableName: tableName?.trim(),
          columnNames: graphData.columnNames[tableName?.trim()] || [],
        }));
        setSelectedSlice(result);
      } else setSelectedSlice(item);
    },
    [selectedChartType],
  );

  // Early return if no graphData
  if (!graphData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading chart data...</p>
      </div>
    );
  }

  const column = headerKeys.map((key, index) => ({
    accessorKey: key.replace(/[{}]/g, ""),
    header: key.replace(/[{}]/g, ""),
    enableGrouping: false,
    enableLinkHandler:
      index === headerKeys.length - 1 ? (val) => handleRowClick(val) : "",
  }));

  return (
    <div className="flex flex-col min-h-screen w-full sm:px-6 px-2 py-4 space-y-6 bg-gray-50">
      <div className="w-full flex flex-wrap gap-4 justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-black px-3 py-2 font-semibold text-base transition active:scale-95"
        >
          <IoArrowBack className="text-xl" />
          <span>Back</span>
        </button>

        <button
          onClick={handlePreviewChart}
          className="flex items-center gap-2 px-3 py-2 bg-white text-gray-800 font-medium text-base rounded shadow hover:text-indigo-600 transition"
        >
          <AiOutlineBarChart className="text-2xl text-indigo-600" />
          Chart Preview
        </button>

        <div>
          <select
            style={{
              backgroundColor: styles.backgroundColor,
              color: styles.textColor,
            }}
            className="w-[15rem] h-[44px] px-4 py-2 rounded-lg shadow font-semibold text-lg mr-2"
            value={selectedChartType}
            onChange={handleChangeTableGraphAnalyist}
          >
            {charts.map((chart, index) => (
              <option key={index} value={chart}>
                {chart} Sections
              </option>
            ))}
          </select>

          {permissionList.includes(routeName) &&
            permissionDetails[routeName]?.hasWriteOnly && (
              <button
                style={{ backgroundColor: styles.buttonColor, color: "white" }}
                className={`w-[15rem] h-[44px] px-4 mt-2 rounded-lg shadow font-semibold text-lg ${
                  loading
                    ? "cursor-not-allowed opacity-50"
                    : "hover:opacity-90 transition"
                }`}
                onClick={handleUpdateDashboard}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Chart"}
              </button>
            )}
        </div>
      </div>

      <ChartPreviousModal
        isOpen={previewChartModal}
        CloseModal={handleClosePreviewChart}
      >
        {Object.entries(graphData?.columnNames || {}).length > 0 ? (
          <div className="space-y-3 max-h-[60vh] w-auto overflow-y-auto p-2">
            {Object.entries(graphData.columnNames).map(([key, value]) => (
              <div
                key={key}
                className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-row sm:items-start space-x-20 shadow-sm hover:shadow-md transition"
              >
                <span className="text-indigo-700 font-medium text-sm sm:w-32">
                  {key}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </p>
              </div>
            ))}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-row sm:items-start space-x-20 shadow-sm hover:shadow-md transition">
              <span className="text-indigo-700 font-medium text-sm sm:w-32">
                Source Table
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">
                {graphData?.tableNames?.map((item) => item).join("")}
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-row sm:items-start space-x-20 shadow-sm hover:shadow-md transition">
              <span className="text-indigo-700 font-medium text-sm sm:w-32">
                Source Object
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">
                {graphData?.object?.objectName}
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-row sm:items-start space-x-20 shadow-sm hover:shadow-md transition">
              <span className="text-indigo-700 font-medium text-sm sm:w-32">
                Source Type
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">
                {graphData?.sourceType || "N/A"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-red-500 text-sm italic mt-2">
            No column data available
          </p>
        )}
      </ChartPreviousModal>

      {selectedChartType !== "Pivot" && (
        <div className="w-full h-[70vh]">
          <ChartComponent
            ChartselectedTableName={ChartselectedTableName}
            ChartselectedColumns={graphData?.columnNames || {}}
            chartType={selectedChartType}
            chartData={{
              ...graphData,
              columnNamesWithValuesANDCounting: isFavorite
                ? graphTableData || {}
                : graphData?.columnNamesWithValuesANDCounting,
            }}
            isCountColum={Object.values(graphData?.columnNames || []).find(
              (v) =>
                v.includes("count") && graphData?.sourceType === "Register",
            )}
            count={
              Object.keys(
                (isFavorite
                  ? graphTableData || {}
                  : graphData?.columnNamesWithValuesANDCounting) || {},
              ).length
            }
            routeName={routeName}
            description={graphData?.description || ""}
            viewId={graphData?.viewId}
          />
        </div>
      )}

      <main className="w-full sm:p-6 p-2 bg-nav-bg">
        {transformedData?.length > 0 ? (
          <section className="w-full bg-nav-bg">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              📄 Application Data
            </h2>
            <DataTable
              columns={column}
              data={transformedData}
              enableRowSelection={false}
              enableRowOrdering={false}
              enableColumnOrdering={false}
              enableColumnVisibility={false}
              enableToSearch={false}
              enableEditing={true}
              enableFilter={false}
              isDownload
              className="relative"
            />
          </section>
        ) : (
          <p className="text-gray-500 text-center">No data available</p>
        )}

        <ResizableBottomDrawer
          open={showModal && selectedSlice}
          onClose={handleCloseModal}
        >
          <ChartTable
            selectedTableName={selectedTableName}
            selectedSlice={selectedSlice}
            viewId={graphData?.viewId}
            isVennMatrix={["Venn Chart", "Matrix Chart"].includes(
              selectedChartType,
            )}
          />
        </ResizableBottomDrawer>
      </main>
    </div>
  );
};

export default AllCharts;
