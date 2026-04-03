import { useCallback } from "react";
import { ResizableDrawer } from "./ResizableDrawer";
import AllChartsDrawer from "../../core/DataConsole/CreateDashboard/AllChartsDrawer";
import NewDashboard from "../../core/DataConsole/CreateDashboard/index";
import CreateFolder from "../../core/DataConsole/CreateFolder/CreateFolder";

export function DashboardSidebarDrawer({
  chartData,
  onClose,
  open,
  routeName,
  mode = "chart",
  folderData,
  onSave,
}) {
  const isCreateMode = mode === "create";
  const isFolderMode = mode === "folder";

  const title = isFolderMode
    ? "Create New Folder"
    : isCreateMode
      ? "Create New Dashboard"
      : chartData?.dashBoardName || "Chart Detail";

  const handleOpenNewTab = useCallback(() => {
    if (!chartData) return;
    const key = `chart-viewer-${Date.now()}`;
    sessionStorage.setItem(key, JSON.stringify({ chartData, routeName, mode }));
    window.open(`${window.location.origin}/chart-viewer?key=${key}`, "_blank");
  }, [chartData, routeName, mode]);

  return (
    <ResizableDrawer
      open={open}
      onClose={onClose}
      title={title}
      defaultWidth="50%"
      minWidth={280}
      maxWidth="80%"
      onNewTab={mode === "chart" && chartData ? handleOpenNewTab : undefined}
      Maximize={mode === "chart"}
    >
      {isFolderMode ? (
        <CreateFolder
          sourceType="DashBoard"
          folderDetails={{
            sourceType: "DashBoard",
            userId: folderData?.id,
            selectedFolder: folderData,
          }}
          onSave={onSave || onClose}
        />
      ) : isCreateMode ? (
        <NewDashboard
          routeName={routeName}
          selectedFolder={folderData}
          folderData={{
            folderId: folderData?.id || folderData?.folderId,
            folderName: folderData?.folderName,
          }}
          onSave={onSave || onClose}
          sourceType="Dashboard"
        />
      ) : (
        chartData && (
          <AllChartsDrawer
            graphData={chartData}
            routeName={routeName}
            onClose={onClose}
          />
        )
      )}
    </ResizableDrawer>
  );
}
