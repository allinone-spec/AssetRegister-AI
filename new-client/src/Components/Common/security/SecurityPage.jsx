import { useState } from "react";
import SettingsSidebar from "./SecuritySidebar";
import PageLayout from "../PageLayout";
import UserTable from "../../core/DataConsole/Security/UserTable";
import RoleTable from "../../core/DataConsole/Security/Role";
import PermissionTypeTable from "../../core/DataConsole/Security/PermissionType";
import GroupsTable from "../../core/DataConsole/Security/Groups";
import { SecurityDrawer } from "../sideDrawer/SecurityDrawer";

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState("Users");
  const [editJob, setEditJob] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [updateData, setUpdateData] = useState(false);

  const handleDrawer = (val) => {
    setOpenDrawer(val);
    setEditJob(true);
  };

  const tabMap = () => {
    switch (activeTab) {
      case "Users":
        return (
          <UserTable
            routeName="Security"
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
      case "Roles":
        return (
          <RoleTable
            routeName="Security"
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
      case "Permissions":
        return (
          <PermissionTypeTable
            routeName="Security"
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
      case "Groups":
        return (
          <GroupsTable
            routeName="Security"
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
      default:
        return (
          <UserTable
            routeName="Security"
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

  const activeTabHandler = (val) => {
    setActiveTab(val);
    setEditJob(false);
    setOpenDrawer(null);
  };

  return (
    <div className="flex">
      <PageLayout className="flex-1 bg-surface rounded-xl shadow-sm p-8 h-[90vh] my-4 mx-8">
        {/* Header */}
        <div className="mb-6 pb-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-text-primary">Security</h1>
          <p className="text-sm text-text-sub mt-1">
            Manage your account security and set e-mail preferences.
          </p>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex gap-10">
          <SettingsSidebar active={activeTab} onChange={activeTabHandler} />
          <div className="flex-1 min-w-0">{tabMap()}</div>
        </div>
      </PageLayout>
      <SecurityDrawer
        activeTab={activeTab}
        job={openDrawer || {}}
        open={openDrawer}
        setEditJob={setEditJob}
        editJob={editJob}
        setUpdateData={setUpdateData}
        onClose={() => {
          setEditJob(false);
          setOpenDrawer(null);
        }}
      />
    </div>
  );
}
