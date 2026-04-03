import { useState } from "react";
import { useSelector } from "react-redux";
import PageLayout from "../Common/PageLayout";
import DashboardSidebar from "./DashboardSidebar";
import AllGraph from "../core/DataConsole/CreateDashboard/AllGraph";
import { DashboardSidebarDrawer } from "../Common/sideDrawer/DashboardSidebarDrawer";

export default function DashboardPage({ routeName = "Dashboard" }) {
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );

  const [activeTab, setActiveTab] = useState("Chart List");
  const [openDrawer, setOpenDrawer] = useState(null);
  const [drawerMode, setDrawerMode] = useState("chart");
  const [fileListData, setFileListData] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleChartClick = (chartData) => {
    setDrawerMode("chart");
    setOpenDrawer(chartData);
  };

  const handleCreateDashboard = (data) => {
    setFileListData(data);
    setDrawerMode("create");
    setOpenDrawer(data || fileListData || true);
  };

  const tabMap = () => {
    switch (activeTab) {
      case "Chart List":
        return (
          <AllGraph
            routeName={routeName}
            folderId={fileListData?.id}
            folderName={fileListData?.folderName}
            onChartClick={handleChartClick}
            onCreateDashboard={handleCreateDashboard}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isDrawerOpen={!!openDrawer}
            isEmbedded
            refreshKey={refreshKey}
          />
        );
      default:
        return (
          <AllGraph
            routeName={routeName}
            folderId={fileListData?.id}
            folderName={fileListData?.folderName}
            onChartClick={handleChartClick}
            onCreateDashboard={handleCreateDashboard}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isDrawerOpen={!!openDrawer}
            isEmbedded
            refreshKey={refreshKey}
          />
        );
    }
  };

  const activeTabHandler = (val, data) => {
    setFileListData(data);
    setActiveTab(val);
    setOpenDrawer(null);
    setDrawerMode("chart");
  };

  const handleTabSwitch = (tabName, folderData = null) => {
    if (tabName === "Create Folder") {
      setDrawerMode("folder");
      setOpenDrawer(true);
      setFileListData(folderData);
      return;
    }
    if (tabName === "Chart List" && !folderData) {
      activeTabHandler(tabName, null);
    } else {
      activeTabHandler(tabName, folderData);
    }
  };

  return (
    <div className="flex">
      <PageLayout className="flex-1 bg-surface dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 p-8 h-[90vh] my-4 mx-8">
        {/* Header */}
        {/* Header Section */}
        <div className="mb-6 pb-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-text-primary flex items-center gap-2">
                Dashboard
                {activeTab === "Chart List" && (
                  <h2 className="text-xl text-gray-900 dark:text-gray-100 font-bold">
                    - {fileListData?.folderName}
                  </h2>
                )}
              </h1>
              <p className="text-sm text-text-sub mt-1">
                Manage your dashboards, folders and chart visualizations.
              </p>
            </div>

            {/* Dashboard Controls - only show for Chart List */}
            {activeTab === "Chart List" && (
              <div className="flex items-center space-x-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    Grid View
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === "list"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    List View
                  </button>
                </div>

                {/* Additional Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    disabled={
                      permissionList.includes(routeName) &&
                      !permissionDetails[routeName]?.hasWriteOnly
                    }
                    className={`
                      ${
                        permissionList.includes(routeName) &&
                        !permissionDetails[routeName]?.hasWriteOnly
                          ? "opacity-50"
                          : "opacity-100"
                      }
                      px-4 py-2 bg-accent text-white dark:bg-accent-dark dark:text-white rounded-lg hover:opacity-80 transition-colors font-medium text-sm`}
                    onClick={() => handleCreateDashboard(fileListData)}
                  >
                    Add Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex gap-10">
          <DashboardSidebar
            active={activeTab}
            activeFolder={fileListData}
            onChange={handleTabSwitch}
            onFolderAutoSelect={(folder) => setFileListData(folder)}
            onChartClick={handleChartClick}
          />
          <div className="flex-1 min-w-0">{tabMap()}</div>
        </div>
      </PageLayout>
      <DashboardSidebarDrawer
        chartData={openDrawer}
        open={openDrawer}
        routeName={routeName}
        mode={drawerMode}
        folderData={fileListData}
        onClose={() => {
          setOpenDrawer(null);
          setDrawerMode("chart");
        }}
        onSave={() => {
          setOpenDrawer(null);
          setDrawerMode("chart");
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
