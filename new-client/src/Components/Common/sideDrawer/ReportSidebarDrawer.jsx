import { useCallback } from "react";
import { ResizableDrawer } from "./ResizableDrawer";
import FolderFilterView from "../../core/DataConsole/Reports/FoIderFilterView";
import ReportsCommonTable from "../../core/DataConsole/Reports/JobData_Rules";
import CreateFolder from "../../core/DataConsole/CreateFolder/CreateFolder";
import NewDashboard from "../../core/DataConsole/CreateDashboard/index";

const EditForm = ({ job, activeTab, onClose, setDrawerMode }) => {
  switch (activeTab) {
    case "Original Source":
      return (
        <ReportsCommonTable
          routeName="Reports"
          title="Original Source"
          type="getAC"
          data={job}
          setDrawerMode={setDrawerMode}
        />
      );
    case "By AR Source":
      return (
        <ReportsCommonTable
          routeName="Reports"
          title="By AR Source"
          type="getDC"
          onClose={onClose}
          data={job}
          setDrawerMode={setDrawerMode}
        />
      );
    case "File List":
      return (
        <FolderFilterView
          routeName="Reports"
          onClose={onClose}
          data={job}
          setDrawerMode={setDrawerMode}
        />
      );
    default:
      return (
        <ReportsCommonTable
          routeName="Reports"
          title="Original Source"
          type="getAC"
          data={job}
        />
      );
  }
};

export function ReportSidebarDrawer({
  job,
  onClose,
  open,
  activeTab,
  mode,
  folderData,
  onSave,
  routeName,
  setDrawerMode,
}) {
  const isFolderMode = mode === "folder";
  const isCreateDashboardMode = mode === "create-dashboard";
  const isReportMode = !isFolderMode && !isCreateDashboardMode;

  const title = isFolderMode
    ? "Create New Folder"
    : isCreateDashboardMode
      ? "Create New Dashboard"
      : "Reports Detail";

  const handleOpenNewTab = useCallback(() => {
    if (!job) return;
    const key = `report-viewer-${Date.now()}`;
    sessionStorage.setItem(
      key,
      JSON.stringify({ job, activeTab, routeName, type: "report" }),
    );
    window.open(`${window.location.origin}/chart-viewer?key=${key}`, "_blank");
  }, [job, activeTab, routeName]);

  return (
    <ResizableDrawer
      open={open}
      onClose={onClose}
      title={title}
      defaultWidth="50%"
      minWidth={280}
      maxWidth="80%"
      onNewTab={isReportMode && job ? handleOpenNewTab : undefined}
      Maximize={isReportMode}
    >
      {isFolderMode ? (
        <CreateFolder
          sourceType="Report"
          folderDetails={{
            sourceType: "Report",
            userId: folderData?.id,
            selectedFolder: folderData,
          }}
          onSave={onSave || onClose}
        />
      ) : isCreateDashboardMode ? (
        <NewDashboard
          routeName={routeName}
          sourceType="Report"
          selectedFolder={folderData}
          folderData={{
            tableType:
              activeTab === "Original Source"
                ? "original-source"
                : "by-ar-resource",
            tableName:
              activeTab === "Original Source"
                ? job?.ACTableName
                : job?.DCTableName,
            objectId: job?.objectId,
            daysFilterShow: true,
            folderId: folderData?.id || folderData?.folderId,
            folderName: folderData?.folderName,
          }}
          onSave={onSave || onClose}
        />
      ) : (
        <EditForm
          job={job}
          activeTab={activeTab}
          onClose={onClose}
          setDrawerMode={setDrawerMode}
        />
      )}
    </ResizableDrawer>
  );
}
