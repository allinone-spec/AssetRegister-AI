import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChartComponent from "../../../ChartComponent";
import { patchRequest, postDataRequest } from "../../../../Service/api.service";
import { postDataRequest as postAdminRequest } from "../../../../Service/admin.save";
import toast from "react-hot-toast";
import { AiOutlineBarChart } from "react-icons/ai";
import ChartTable from "./ChartTable";
import DataTable from "../../../Common/DataTable";

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

const AllChartsDrawer = ({ graphData, routeName, onClose }) => {
  const { dashboardData } = useSelector((state) => state.dashboard);
  const [loading, setLoading] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewChartModal, setPreviewChartModal] = useState(false);
  const [graphTableData, setGraphTableData] = useState(null);

  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );

  const heading = useMemo(
    () => graphData?.dashBoardName || "",
    [graphData?.dashBoardName],
  );

  const [selectedChartType, setSelectedChartType] = useState(
    () => graphData?.chartType || charts[0],
  );

  useEffect(() => {
    if (graphData?.chartType) {
      setSelectedChartType(graphData.chartType);
    }
  }, [graphData?.chartType]);

  useEffect(() => {
    if (graphData?.columnNames) {
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
          .catch(() => setGraphTableData(null));
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
          .catch(() => setGraphTableData(null));
      }
    }
  }, [graphData?.columnNames]);

  const transformData = useCallback(
    (columnNamesWithValuesANDCounting) => {
      if (
        !columnNamesWithValuesANDCounting ||
        typeof columnNamesWithValuesANDCounting !== "object"
      ) {
        return [];
      }

      const data = [];

      if (
        ["Venn Chart", "Matrix Chart"].includes(selectedChartType) &&
        Array.isArray(columnNamesWithValuesANDCounting)
      ) {
        return columnNamesWithValuesANDCounting.map((item) => {
          if (typeof item === "object" && item !== null) {
            return {
              label: item.label || item.Label || item.name || "",
              size: item.size || item.Size || item.value || 0,
            };
          }
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

            if (cleanKey.startsWith("count=")) {
              const countValue = cleanKey.split("=")[1];
              const actualCount = parseInt(countValue) * count;
              data.push({
                [cleanKey.split("=")[0]]: `${countValue}`,
                size: actualCount,
              });
            } else {
              const tokens = cleanKey.split(/\s*,\s*/);
              const rowObject = {};
              let currentKey = null;
              let currentValue = null;

              tokens.forEach((token) => {
                if (token.includes("=")) {
                  if (currentKey) {
                    rowObject[currentKey] = currentValue;
                  }
                  const parts = token.split(/=(.+)/);
                  currentKey = (parts[0] || "").trim();
                  currentValue = parts[1] !== undefined ? parts[1].trim() : "";
                } else {
                  if (currentKey) {
                    currentValue = currentValue
                      ? `${currentValue}, ${token.trim()}`
                      : token.trim();
                  } else {
                    if (!rowObject.Value) rowObject.Value = token.trim();
                    else
                      rowObject.Value = `${rowObject.Value}, ${token.trim()}`;
                  }
                }
              });

              if (currentKey) rowObject[currentKey] = currentValue;
              rowObject["count"] = count;
              data.push(rowObject);
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
                data.push(rowObject);
              }
            }
          }
        }
      }

      return data;
    },
    [selectedChartType],
  );

  const transformedData = useMemo(() => {
    const dataSource =
      graphTableData || graphData?.columnNamesWithValuesANDCounting || {};
    if (graphData?.chartType === "Matrix Chart" && dataSource?.length) {
      return (
        dataSource?.map((v) => ({
          label: `${v.x} , ${v.y}`,
          size: v.v,
        })) || []
      );
    }
    return transformData(dataSource);
  }, [graphData?.columnNamesWithValuesANDCounting, graphTableData]);

  const headerKeys = useMemo(
    () => (transformedData.length > 0 ? Object.keys(transformedData[0]) : []),
    [transformedData.length],
  );

  const ChartselectedTableName = useMemo(
    () => Object.keys(graphData?.columnNames || {}),
    [graphData?.columnNames],
  );

  const selectedTableName = useMemo(() => {
    const chartSelected = ChartselectedTableName;
    return Array.isArray(dashboardData?.tableName || chartSelected)
      ? dashboardData.tableName?.[0] || chartSelected[0]
      : dashboardData?.tableName || chartSelected[0];
  }, [dashboardData?.tableName, ChartselectedTableName]);

  const handleChangeTableGraphAnalyist = useCallback((event) => {
    setSelectedChartType(event.target.value);
  }, []);

  const handlePreviewChart = useCallback(() => {
    setPreviewChartModal((prev) => !prev);
  }, []);

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
    [selectedChartType, graphData?.columnNames],
  );

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

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No chart data available</p>
      </div>
    );
  }

  if (showModal && selectedSlice) {
    return (
      <div className="flex flex-col w-full px-2 py-4 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <button
            onClick={handleCloseModal}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-sub hover:text-accent hover:bg-accent/5 rounded-lg border border-border-theme transition"
          >
            ← Back
          </button>
          <span className="text-xs font-bold text-text-sub uppercase tracking-wide">
            Detail View
          </span>
        </div>
        <ChartTable
          selectedTableName={selectedTableName}
          selectedSlice={selectedSlice}
          viewId={graphData?.viewId}
          isVennMatrix={["Venn Chart", "Matrix Chart"].includes(
            selectedChartType,
          )}
        />
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
    <div className="flex flex-col w-full px-2 py-4 space-y-4">
      <div className="w-full flex flex-wrap gap-4 justify-between items-center">
        {/* <h2 className="text-lg font-semibold text-gray-800">{heading}</h2> */}

        <button
          onClick={handlePreviewChart}
          className="flex items-center gap-2 px-3 py-2 bg-surface text-text-primary font-medium text-sm rounded shadow hover:text-accent transition"
        >
          <AiOutlineBarChart className="text-xl text-accent" />
          {previewChartModal ? "Hide Preview" : "Chart Preview"}
        </button>

        <select
          className="w-[12rem] h-[36px] px-3 py-1 rounded-lg shadow font-semibold text-sm border border-gray-200 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          value={selectedChartType}
          onChange={handleChangeTableGraphAnalyist}
        >
          {charts.map((chart, index) => (
            <option key={index} value={chart}>
              {chart}
            </option>
          ))}
        </select>
        {permissionList.includes(routeName) &&
          permissionDetails[routeName]?.hasWriteOnly && (
            <button
              className={`bg-accent text-white w-[12rem] h-[36px] rounded-lg shadow font-semibold text-lg ${
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

      {previewChartModal && (
        <div className="w-full bg-surface rounded-lg p-4 border border-accent-glow">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Chart Configuration
          </h3>
          {Object.entries(graphData?.columnNames || {}).length > 0 ? (
            <div className="space-y-3 max-h-[60vh] w-auto overflow-y-auto p-2">
              {Object.entries(graphData.columnNames).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-surface border border-accent-glow rounded-md p-4 flex flex-row sm:items-start space-x-20 shadow-sm hover:shadow-md transition"
                >
                  <span className="text-accent font-medium text-sm sm:w-32">
                    {key}
                  </span>
                  <p className="text-sm text-text-sub leading-relaxed flex-1">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-500 text-sm italic">
              No column data available
            </p>
          )}
        </div>
      )}

      {selectedChartType !== "Pivot" && (
        <div className="w-full h-[50vh]">
          <ChartComponent
            isHideDrawer={false}
            setSelectedParentSlice={setSelectedSlice}
            setShowParentModal={setShowModal}
            key={`${graphData?.id || "default"}-${selectedChartType}`}
            ChartselectedTableName={ChartselectedTableName}
            ChartselectedColumns={graphData?.columnNames || {}}
            chartType={selectedChartType}
            chartData={{
              ...graphData,
              columnNamesWithValuesANDCounting:
                graphTableData || graphData?.columnNamesWithValuesANDCounting,
            }}
            isCountColum={Object.values(graphData?.columnNames || []).find(
              (v) =>
                v.includes("count") && graphData?.sourceType === "Register",
            )}
            count={
              Object.keys(
                graphTableData ||
                  graphData?.columnNamesWithValuesANDCounting ||
                  {},
              ).length
            }
            routeName={routeName}
            description={graphData?.description || ""}
            viewId={graphData?.viewId}
          />
        </div>
      )}

      <main className="w-full bg-surface rounded-lg p-4">
        {transformedData?.length > 0 ? (
          <section className="w-full">
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Application Data
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

        {/* {showModal && selectedSlice && (
          <ResizableBottomDrawer
            open={showModal}
            onClose={handleCloseModal}
            title="Detail View"
            defaultHeight={700}
            minHeight={150}
            maxHeight={900}
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
        )} */}
      </main>
    </div>
  );
};

export default AllChartsDrawer;
