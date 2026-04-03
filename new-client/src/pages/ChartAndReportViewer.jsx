import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AllChartsDrawer from "../Components/core/DataConsole/CreateDashboard/AllChartsDrawer";
import ReportsCommonTable from "../Components/core/DataConsole/Reports/JobData_Rules";
import FolderFilterView from "../Components/core/DataConsole/Reports/FoIderFilterView";

const ReportContent = ({ job, activeTab, routeName }) => {
  switch (activeTab) {
    case "Original Source":
      return (
        <ReportsCommonTable
          routeName={routeName || "Reports"}
          title="Original Source"
          type="getAC"
          data={job}
        />
      );
    case "By AR Source":
      return (
        <ReportsCommonTable
          routeName={routeName || "Reports"}
          title="By AR Source"
          type="getDC"
          data={job}
        />
      );
    case "File List":
      return <FolderFilterView routeName={routeName || "Reports"} data={job} />;
    default:
      return (
        <ReportsCommonTable
          routeName={routeName || "Reports"}
          title="Original Source"
          type="getAC"
          data={job}
        />
      );
  }
};

const ChartAndReportViewer = () => {
  const [searchParams] = useSearchParams();
  const [viewerData, setViewerData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const key = searchParams.get("key");
    if (!key) {
      setError("No data key provided.");
      return;
    }

    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        setError("Data not found. The link may have expired.");
        return;
      }
      const parsed = JSON.parse(raw);
      setViewerData(parsed);
    } catch {
      setError("Failed to load data.");
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-page-bg text-text-primary">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  if (!viewerData) {
    return (
      <div className="flex items-center justify-center h-screen bg-page-bg">
        <div className="text-text-sub">Loading...</div>
      </div>
    );
  }

  const isReport = viewerData.type === "report";
  const title = isReport
    ? "Reports Detail"
    : viewerData.chartData?.dashBoardName || "Chart Detail";

  return (
    <div className="min-h-screen bg-page-bg p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-text-primary">{title}</h1>
        <button
          onClick={() => window.close()}
          className="px-3 py-1.5 text-sm border border-border-theme rounded-lg text-text-sub hover:border-accent hover:text-accent transition-all"
        >
          Close Tab
        </button>
      </div>
      <div className="bg-surface rounded-xl p-5 border border-accent-muted">
        {isReport ? (
          <ReportContent
            job={viewerData.job}
            activeTab={viewerData.activeTab}
            routeName={viewerData.routeName}
          />
        ) : (
          <AllChartsDrawer
            graphData={viewerData.chartData}
            routeName={viewerData.routeName}
            onClose={() => window.close()}
          />
        )}
      </div>
    </div>
  );
};

export default ChartAndReportViewer;
