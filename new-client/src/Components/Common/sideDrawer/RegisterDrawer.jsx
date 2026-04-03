import { useState, useEffect } from "react";
import RegisterDetail from "../../core/DataConsole/Register/RegisterDetail";
import { ResizableDrawer } from "./ResizableDrawer";
import ChartTable from "../../core/DataConsole/CreateDashboard/ChartTable";
import DataTable from "../DataTable";

export function RegisterDrawer({
  open,
  onClose,
  activeTab,
  showModal,
  primaryKeyVal,
  selectedChartType,
  vennChartData = [],
  chartConfig = null,
  selectedSlice = null,
  handleRowClick,
}) {
  const [localSelectedSlice, setLocalSelectedSlice] = useState(selectedSlice);

  useEffect(() => {
    setLocalSelectedSlice(selectedSlice);
  }, [selectedSlice]);

  const EditForm = () => {
    switch (activeTab) {
      case "Summary": {
        if (localSelectedSlice) {
          return (
            <div className="flex flex-col w-full px-2 py-4 space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-500  absolute top-24 w-[93%]">
                <button
                  onClick={() => setLocalSelectedSlice(null)}
                  className="z-10 flex items-center gap-1 px-3 py-1.5 text-sm text-text-sub hover:text-accent hover:bg-accent/5 rounded-lg border border-gray-200 dark:border-gray-500 transition"
                >
                  ← Back
                </button>
                <span className="text-xs font-bold text-text-sub uppercase tracking-wide">
                  Detail View
                </span>
              </div>
              <ChartTable selectedSlice={localSelectedSlice} isSummary />;
            </div>
          );
        }

        const tableData =
          selectedChartType === "Venn Chart"
            ? vennChartData.map((v) => ({ label: v.label, count: v.size }))
            : chartConfig?.chartData?.length
              ? chartConfig.chartData.map((v) => ({
                  label: `${v.x} , ${v.y}`,
                  count: v.v,
                }))
              : [];

        const column = Object.keys(tableData?.length ? tableData[0] : {}).map(
          (key) => ({
            accessorKey: key,
            header: key,
            enableGrouping: false,
            enableLinkHandler:
              key === "count"
                ? (row) => {
                    if (selectedChartType === "Venn Chart") {
                      const entry = vennChartData.find(
                        (v) => v.label === row.label,
                      );
                      const slice = entry
                        ? entry.sets.map((t) => ({ tableName: t }))
                        : [{ tableName: row.label }];
                      setLocalSelectedSlice(slice);
                    } else {
                      const [x, y] = row.label
                        .split(" , ")
                        .map((s) => s.trim());
                      setLocalSelectedSlice(
                        [x, y].filter(Boolean).map((t) => ({ tableName: t })),
                      );
                    }
                  }
                : "",
          }),
        );

        return (
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
            className="h-full"
          />
        );
      }
      case "Register":
        return (
          <RegisterDetail columnName={showModal} primaryValue={primaryKeyVal} />
        );
      default:
        return (
          <RegisterDetail columnName={showModal} primaryValue={primaryKeyVal} />
        );
    }
  };

  return (
    <ResizableDrawer
      open={open}
      onClose={onClose}
      title={activeTab}
      defaultWidth="50%"
      minWidth={280}
      maxWidth="80%"
    >
      <EditForm />
    </ResizableDrawer>
  );
}
