import { useState } from "react";
import PageLayout from "../Common/PageLayout";
import AT_AR_Rules from "../core/DataConsole/Reports/AT_AR_Rules";
import ReportsSidebar from "./ReportsSidebar";
import OrginalSource from "../core/DataConsole/Reports/OrginalSource";
import FileList from "../core/DataConsole/Reports/FileList";
import { ReportSidebarDrawer } from "../Common/sideDrawer/ReportSidebarDrawer";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("Original Source");
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
