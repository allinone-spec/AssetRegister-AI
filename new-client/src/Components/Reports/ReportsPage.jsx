import { useMemo, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import PageLayout from "../Common/PageLayout";
import { peekReportJobFromSavedInsightNav } from "../../Utils/globalChatInsightNav";
import AT_AR_Rules from "../core/DataConsole/Reports/AT_AR_Rules";
import ReportsSidebar from "./ReportsSidebar";
import OrginalSource from "../core/DataConsole/Reports/OrginalSource";
import FileList from "../core/DataConsole/Reports/FileList";
import { ReportSidebarDrawer } from "../Common/sideDrawer/ReportSidebarDrawer";

const SOURCE_TO_TAB = {
  "original-source": "Original Source",
  "by-ar-resource": "By AR Source",
};

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const sourceFromUrl = searchParams.get("source");

  const [activeTab, setActiveTab] = useState(
    () => SOURCE_TO_TAB[sourceFromUrl] || "Original Source",
  );

  useEffect(() => {
    const t = SOURCE_TO_TAB[sourceFromUrl];
    if (t) setActiveTab(t);
  }, [sourceFromUrl]);

  /**
   * Job to open after the hub loads: router state from “Go to insight”, else sessionStorage peek (e.g. F5).
   * Do not call navigate() to clear `location.state` after opening — that replace navigation remounts the route and feels like a full reload.
   * `openReportInsightJob` in state is harmless; child panels use a ref so the drawer opens only once.
   */
  const pendingOpenJobName = useMemo(() => {
    const fromState = location.state?.openReportInsightJob;
    if (fromState != null && String(fromState).trim() !== "") {
      return String(fromState).trim();
    }
    if (!sourceFromUrl) return null;
    return peekReportJobFromSavedInsightNav(sourceFromUrl);
  }, [location.state, sourceFromUrl]);
  const [editJob, setEditJob] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [drawerMode, setDrawerMode] = useState("detail");
  const [updateData, setUpdateData] = useState(false);
  const [fileListData, setFileListData] = useState(null);

  const handleDrawer = (val) => {
    setOpenDrawer(val);
    setEditJob(true);
  };

  const tabMap = () => {
    switch (activeTab) {
      case "Original Source":
        return (
          <OrginalSource
            routeName="Reports"
            handleDrawer={handleDrawer}
            setEditJob={setEditJob}
            editJob={editJob}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            isDrawer
            updateData={updateData}
            setUpdateData={setUpdateData}
            openJobNameFromQuery={
              sourceFromUrl === "original-source" ? pendingOpenJobName : null
            }
          />
        );
      case "By AR Source":
        return (
          <AT_AR_Rules
            routeName="Reports"
            handleDrawer={handleDrawer}
            setEditJob={setEditJob}
            editJob={editJob}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            isDrawer
            updateData={updateData}
            setUpdateData={setUpdateData}
            openJobNameFromQuery={
              sourceFromUrl === "by-ar-resource" ? pendingOpenJobName : null
            }
          />
        );
      case "Create Folder":
        return null;
      case "File List":
        return (
          <FileList
            routeName="Reports"
            fileListData={fileListData}
            setEditJob={setEditJob}
            setOpenDrawer={setOpenDrawer}
          />
        );
      default:
        return (
          <AT_AR_Rules
            routeName="Reports"
            handleDrawer={handleDrawer}
            setEditJob={setEditJob}
            editJob={editJob}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            isDrawer
            updateData={updateData}
            setUpdateData={setUpdateData}
            openJobNameFromQuery={
              sourceFromUrl === "by-ar-resource" ? pendingOpenJobName : null
            }
          />
        );
    }
  };

  const activeTabHandler = (val, data) => {
    if (val === "Create Folder") {
      setDrawerMode("folder");
      setOpenDrawer(data || fileListData || true);
      setFileListData(data);
      return;
    } else {
      setFileListData(data);
      setActiveTab(val);
      setEditJob(false);
      setOpenDrawer(null);
      setDrawerMode("detail");
      if (val === "Original Source" || val === "By AR Source") {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (val === "Original Source") next.set("source", "original-source");
            else next.set("source", "by-ar-resource");
            return next;
          },
          { replace: true },
        );
      }
    }
  };

  const handleViewClick = (view) => {
    setOpenDrawer(view);
    setEditJob(true);
    setDrawerMode("detail");
  };

  return (
    <div className="flex">
      <PageLayout className="flex-1 bg-surface rounded-xl shadow-sm p-8 h-[90vh] my-4 mx-8">
        {/* Header */}
        <div className="mb-6 pb-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
          <p className="text-sm text-text-sub mt-1">
            Manage your account Reports and set e-mail preferences.
          </p>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex gap-10">
          <ReportsSidebar
            active={activeTab}
            onChange={activeTabHandler}
            onViewClick={handleViewClick}
          />
          <div className="flex-1 min-w-0">{tabMap()}</div>
        </div>
      </PageLayout>
      <ReportSidebarDrawer
        activeTab={activeTab}
        job={openDrawer || {}}
        open={openDrawer}
        setEditJob={setEditJob}
        editJob={editJob}
        mode={drawerMode}
        folderData={fileListData}
        setUpdateData={setUpdateData}
        onClose={() => {
          setEditJob(false);
          setOpenDrawer(null);
          setDrawerMode("detail");
        }}
        onSave={() => {
          setOpenDrawer(null);
          setDrawerMode("detail");
        }}
        setDrawerMode={setDrawerMode}
      />
    </div>
  );
}
