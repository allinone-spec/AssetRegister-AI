import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SettingsSidebar from "./Settingssidebar";
import SsoTable from "../../core/AdminConsole/Sso/SsoTable";
import ObjectConfig from "../../core/DataConsole/Settings/ObjectConfiguration";
import AddStmpForm from "../../core/AdminConsole/Stmp/AddStmpForm";
import { ScheduledEmailsTable } from "../../core/AdminConsole/ScheduledEmails";
import AiPromptSettings from "../../core/AdminConsole/Settings/AiPromptSettings";
import AiModelSettings from "../../core/AdminConsole/Settings/AiModelSettings";
import { SettingDrawer } from "../sideDrawer/SettingDrawer";
import PageLayout from "../PageLayout";

const TAB_FROM_QUERY = {
  "ai-prompts": "AI Prompts",
  "ai-model": "AI Model",
};

const QUERY_FROM_TAB = {
  "AI Prompts": "ai-prompts",
  "AI Model": "ai-model",
};

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && TAB_FROM_QUERY[tabFromUrl] ? TAB_FROM_QUERY[tabFromUrl] : "SSO Configuration";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [editJob, setEditJob] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TAB_FROM_QUERY[t]) {
      setActiveTab(TAB_FROM_QUERY[t]);
    }
  }, [searchParams]);

  const handleDrawer = (val) => {
    setOpenDrawer(val);
    if (editJob) setEditJob(false);
  };

  const tabMap = () => {
    switch (activeTab) {
      case "SSO Configuration":
        return (
          <SsoTable
            routeName="Settings"
            handleDrawer={handleDrawer}
            setEditJob={setEditJob}
            editJob={editJob}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            openDeleteModel={openDeleteModel}
            setOpenDeleteModel={setOpenDeleteModel}
            isDrawer
          />
        );
      case "SMTP Configuration":
        return <AddStmpForm routeName="Settings" />;
      case "Object":
        return (
          <ObjectConfig
            routeName="Settings"
            handleDrawer={handleDrawer}
            setEditJob={setEditJob}
            editJob={editJob}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            openDeleteModel={openDeleteModel}
            setOpenDeleteModel={setOpenDeleteModel}
            isDrawer
          />
        );
      case "Scheduled Emails":
        return (
          <ScheduledEmailsTable
            routeName="Settings"
            handleDrawer={handleDrawer}
            setEditJob={setEditJob}
            editJob={editJob}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            openDeleteModel={openDeleteModel}
            setOpenDeleteModel={setOpenDeleteModel}
            isDrawer
          />
        );
      case "AI Prompts":
        return <AiPromptSettings routeName="Settings" embedded />;
      case "AI Model":
        return <AiModelSettings routeName="Settings" embedded />;
      default:
        return (
          <SsoTable
            routeName="Settings"
            handleDrawer={handleDrawer}
            setEditJob={setEditJob}
            editJob={editJob}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            openDeleteModel={openDeleteModel}
            setOpenDeleteModel={setOpenDeleteModel}
          />
        );
    }
  };

  const activeTabHandler = (val) => {
    setActiveTab(val);
    setEditJob(false);
    setOpenDrawer(null);
    const q = QUERY_FROM_TAB[val];
    if (q) {
      setSearchParams({ tab: q });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="flex">
      <PageLayout className="flex-1 bg-surface text-primary rounded-xl border border-surface shadow-sm p-8 h-[90vh] my-4 mx-8">
        {/* Header */}
        <div className="mb-6 pb-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account settings and set e-mail preferences.
          </p>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex gap-10">
          <SettingsSidebar active={activeTab} onChange={activeTabHandler} />
          <div className="flex-1 min-w-0">{tabMap()}</div>
        </div>
      </PageLayout>
      <SettingDrawer
        setOpenDeleteModel={setOpenDeleteModel}
        job={openDrawer || {}}
        open={openDrawer}
        setEditJob={setEditJob}
        editJob={editJob}
        activeTab={activeTab}
        onClose={() => {
          setEditJob(false);
          setOpenDrawer(null);
        }}
      />
    </div>
  );
}
