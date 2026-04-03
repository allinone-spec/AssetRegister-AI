import { useState } from "react";
import { ResizableDrawer } from "./ResizableDrawer";
import {
  ActiveDirectory,
  AWSVM,
  AzureJobForm,
  CustomeAPI,
  FlatFileCSV,
  Flexera,
  GoogleCloud,
  ITune,
  ServiceNow,
  SQLForm,
  WindowDefenderForm,
} from "../../core/AdminConsole/Jobs";
import { Spark, STATUS_META, StatusPill, TYPE_ICONS } from "./utils";
import ARRulesConfig from "../../core/AdminConsole/ARRules/ARRulesManager";
import ARTable from "../../core/AdminConsole/ARMapping/Table";
import { EmailModal } from "../EmailModal";
import ApplicationMenu from "../../core/AdminConsole/Jobs/MenuPage";

// Menu items configuration
const JOB_TYPES = [
  { title: "Active Directory", type: "active-directory" },
  { title: "AWS EC2", type: "aws-vm" },
  { title: "Azure", type: "azure" },
  { title: "Flat File", type: "flat-file-csv" },
  { title: "FlexeraOne", type: "flexera" },
  { title: "Google Cloud", type: "google-cloud" },
  { title: "Intune", type: "itune" },
  { title: "Microsoft Defender", type: "ms-defender" },
  { title: "ServiceNow", type: "service-now" },
  { title: "Database SQL/MySQL", type: "sql" },
  { title: "Custom API", type: "custom-api" },
];

// Drawer sizing configuration
const DRAWER_SIZES = {
  jobForm: { width: "35%", maxWidth: "85%" },
  arMapping: { width: "70%", maxWidth: "85%" },
  email: { width: "50%", maxWidth: "70%" },
  menu: { width: "35%", maxWidth: "50%" },
  details: { width: "320px", maxWidth: "480px" },
};

// Navigation breadcrumb component
const DrawerBreadcrumb = ({ onBack, title }) => (
  <div
    className="flex items-center gap-3 mb-4 pb-3 border-b"
    style={{ borderColor: "var(--border)" }}
  >
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
      style={{
        backgroundColor: "var(--input-bg)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      }}
    >
      ← Back to Menu
    </button>
    <div className="h-4 w-px" style={{ backgroundColor: "var(--border)" }} />
    <span className="text-sm font-medium" style={{ color: "var(--text-sub)" }}>
      {title}
    </span>
  </div>
);

// Job form renderer - maps job types to their respective components
const JobForm = ({ job, jobType, setEditJob }) => {
  const type = job?.jobType || jobType;
  if (!type) return null;

  const isEditMode = !!job;
  const commonProps = {
    setEditJob: () => setEditJob(false),
    routeName: "Saved Jobs",
    ...(isEditMode && { editJob: job }),
  };

  const jobTypeMap = {
    googlecloud: GoogleCloud,
    "google-cloud": GoogleCloud,
    aws: AWSVM,
    "aws-vm": AWSVM,
    "custom-api": CustomeAPI,
    custom: CustomeAPI,
    "flat-file-csv": FlatFileCSV,
    csv: FlatFileCSV,
    xlsx: FlatFileCSV,
    flexera: Flexera,
    azure: AzureJobForm,
    sql: SQLForm,
    itune: ITune,
    servicenow: ServiceNow,
    "service-now": ServiceNow,
    windowdefender: WindowDefenderForm,
    "ms-defender": WindowDefenderForm,
    "active-directory": ActiveDirectory,
  };

  const Component = jobTypeMap[type.toLowerCase()] || Flexera;
  return <Component {...commonProps} />;
};

// Edit form with navigation
const EditJobForm = ({ job, setEditJob }) => (
  <div>
    <DrawerBreadcrumb
      onBack={() => setEditJob(false)}
      title={`Edit Job - ${job?.jobName || ""}`}
    />
    <JobForm job={job} setEditJob={setEditJob} />
  </div>
);

// Add job form with navigation
const AddJobForm = ({ selectedJobType, onBack, setEditJob }) => {
  const jobTitle =
    JOB_TYPES.find((item) => item.type === selectedJobType)?.title || "Add Job";

  return (
    <div>
      <DrawerBreadcrumb onBack={onBack} title={jobTitle} />
      <JobForm jobType={selectedJobType} setEditJob={setEditJob} />
    </div>
  );
};

// Different content handlers
const ContentHandlers = {
  email: ({ emailProps, open, onClose }) => (
    <EmailModal
      {...emailProps}
      isEmailModalOpen={open}
      CloseEmailModal={onClose}
      isDrawer
    />
  ),

  arMapping: ({ job, onClose }) => {
    // Ensure we have the required data for AR Mapping
    const mappingData = {
      ...job,
      ACTableName: job?.ACTableName || job?.DCTableName || job?.tableName,
      filterId: job?.filterId || job?.id,
    };

    return (
      <ARTable
        key={
          mappingData?.filterId ||
          mappingData?.id ||
          mappingData?.ACTableName ||
          "ar-mapping"
        }
        data={mappingData}
        job={mappingData}
        onClose={onClose}
      />
    );
  },

  arRules: ({ job, setEditJob }) => {
    // Ensure we have the required data for AR Rules
    const rulesData = {
      ...job,
      DCTableName: job?.DCTableName || job?.ACTableName || job?.tableName,
      jobName: job?.jobName,
      id: job?.id || job?.ruleId,
      ruleId: job?.ruleId || job?.id,
    };

    return (
      <ARRulesConfig
        job={rulesData}
        editJobHandler={() => setEditJob(false)}
        routeName="AR Rules"
      />
    );
  },
};

// Determine drawer configuration based on current mode
const useDrawerConfig = ({
  emailMode,
  isAddMode,
  showJobForm,
  editJob,
  isARMapping,
  routeName,
  isARRules,
  isCopyMode,
  job,
}) => {
  const getTitle = () => {
    if (emailMode) return "Email & Schedule";
    if (isARMapping) return "AR Mapping";
    if (isARRules) return "AR Rules";
    if (isCopyMode) return `Copy Job - ${job?.jobName || ""}`;
    if (isAddMode) return showJobForm ? "Add New Job" : "Select Job Type";
    if (editJob) return `Edit Job - ${job?.jobName || ""}`;
    return `${routeName} Detail`;
  };

  const getSize = () => {
    if (editJob || showJobForm || isCopyMode) return DRAWER_SIZES.jobForm;
    if (isARMapping || isARRules) return DRAWER_SIZES.arMapping;
    if (emailMode) return DRAWER_SIZES.email;
    if (isAddMode) return DRAWER_SIZES.menu;
    return DRAWER_SIZES.details;
  };

  return { title: getTitle(), ...getSize() };
};

export function SavedJobDrawer({
  job,
  onClose,
  open,
  deleteActionHandler,
  setEditJob,
  editJob,
  heading,
  routeName,
  emailMode,
  emailProps,
}) {
  const [tab, setTab] = useState("info");
  const [selectedJobType, setSelectedJobType] = useState("");
  const m = STATUS_META["success"];

  // Mode detection
  const isARMapping =
    (heading === "AR Mapping" && open) || job?.mode === "ar-mapping";
  const isARRules = job?.mode === "ar-rules";
  const isAddMode = job?.mode === "add";
  const isCopyMode = job?.mode === "copy";
  const isEditMode = job?.mode === "edit" || editJob;
  const showJobForm = selectedJobType && isAddMode;

  // Drawer configuration
  const { title, width, maxWidth } = useDrawerConfig({
    emailMode,
    isAddMode,
    showJobForm,
    editJob: isEditMode,
    isARMapping,
    isARRules,
    isCopyMode,
    routeName,
    job,
  });

  // Handle back navigation
  const handleBackToMenu = () => {
    setSelectedJobType("");
    setEditJob(false);
  };

  // Generate key to force drawer re-render when mode changes
  const drawerKey = `${emailMode ? "email" : ""}${isARMapping ? "mapping" : ""}${isARRules ? "rules" : ""}${isAddMode ? "add" : ""}${isCopyMode ? "copy" : ""}${showJobForm ? "form" : ""}${isEditMode ? "edit" : ""}${heading || ""}`;

  // Main content renderer
  const DrawerContent = () => {
    // Email mode
    if (emailMode) {
      return ContentHandlers.email({ emailProps, open, onClose });
    }

    // AR Mapping mode
    if (isARMapping) {
      return ContentHandlers.arMapping({ job, onClose });
    }

    // AR Rules mode
    if (isARRules) {
      return ContentHandlers.arRules({ job, setEditJob });
    }

    // Copy mode (like add but with pre-filled data)
    if (isCopyMode) {
      return (
        <div>
          <DrawerBreadcrumb
            onBack={() => onClose()}
            title={`Copy Job - ${job?.jobName || ""}`}
          />
          <JobForm jobType={job?.jobType} setEditJob={() => onClose()} />
        </div>
      );
    }

    // Edit mode
    if (isEditMode && !isAddMode) {
      return <EditJobForm job={job} setEditJob={setEditJob} />;
    }

    // Add job mode
    if (isAddMode) {
      if (showJobForm) {
        return (
          <AddJobForm
            selectedJobType={selectedJobType}
            onBack={handleBackToMenu}
            setEditJob={(value) => !value && handleBackToMenu()}
          />
        );
      }

      return (
        <ApplicationMenu
          onJobTypeSelect={(jobType) => {
            setSelectedJobType(jobType);
            setEditJob(true);
          }}
          routeName="Add Job"
        />
      );
    }

    // Edit job mode (legacy - when editJob prop is true)
    if (editJob && !isAddMode && !isCopyMode) {
      if (heading === "AR Rules") {
        return ContentHandlers.arRules({ job, setEditJob });
      }
      return <EditJobForm job={job} setEditJob={setEditJob} />;
    }
    return (
      <>
        {/* Hero */}
        <div className="bg-accent-dim rounded-xl p-4 mb-4 border border-accent-muted">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg border border-accent-muted">
              {TYPE_ICONS[job.type] || "📦"}
            </div>
            <StatusPill status={job.status || "Success"} />
          </div>
          <div className="text-lg font-extrabold text-text-primary tracking-tight mb-1">
            {job.jobName}
          </div>
          <div className="text-xs text-text-sub font-mono">{job.id}</div>
        </div>

        {/* Tabs */}
        <div className="flex bg-nav-bg rounded-lg p-1 gap-0.5 mb-4">
          {["info", "history", "config"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg border-none cursor-pointer text-xs font-bold capitalize transition-all duration-150 ${
                tab === t
                  ? "bg-accent text-white"
                  : "bg-transparent text-text-sub hover:text-text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <>
            <div className="bg-surface rounded-2xl p-3 mb-3 border border-accent-muted">
              <div className="text-xs font-bold text-text-sub uppercase tracking-wide mb-2">
                7-day trend
              </div>
              <Spark
                data={[60, 72, 68, 80, 75, 90, 88]}
                color={m.fg}
                w={260}
                h={44}
              />
              <div className="flex justify-between mt-1 text-xs text-text-sub">
                <span>7d ago</span>
                <span>Today</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                ["Assets", job.assets > 0 ? job.assets.toLocaleString() : "—"],
                ["Duration", job.duration],
                ["Type", job.jobType],
                ["Last Run", job.lastExecutionDate],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="bg-surface rounded-lg p-3 border border-accent-muted"
                >
                  <div className="text-xs font-bold text-text-sub uppercase tracking-wide mb-1">
                    {k}
                  </div>
                  <div
                    className={`text-sm font-bold text-text-primary ${
                      k !== "Type" ? "font-mono" : ""
                    }`}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "history" && (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 p-3 bg-surface rounded-lg border border-accent-muted"
              >
                <div
                  className={`w-2 h-2 rounded flex-shrink-0 ${
                    i === 2 ? "bg-red-600" : "bg-green-600"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-text-primary">
                    Run #{String(5 - i).padStart(3, "0")}
                  </div>
                  <div className="text-xs text-text-sub font-mono mt-0.5">
                    2025-02-{27 - i}
                  </div>
                </div>
                <StatusPill status={i === 2 ? "Failed" : "Success"} />
              </div>
            ))}
          </div>
        )}

        {tab === "config" && (
          <div className="flex flex-col gap-2">
            {[
              ["Schedule", "Every 6 hours"],
              ["Timeout", "30 minutes"],
              ["Retry attempts", "3"],
              ["Notification", "admin@company.com"],
              ["Last modified", "2025-02-20"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="bg-surface rounded-lg p-3 border border-accent-muted"
              >
                <div className="text-xs font-bold text-text-sub uppercase tracking-wide mb-1">
                  {k}
                </div>
                <div className="text-sm font-semibold text-text-primary">
                  {v}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-4">
          <button className="p-2.5 bg-gradient-to-br from-accent to-accent/100 border-none rounded-2xl text-white text-sm font-bold cursor-pointer shadow-lg shadow-accent/5 hover:shadow-xl hover:shadow-accent/40 transition-all duration-200">
            ▶ Run Job Now
          </button>
          <button
            onClick={() => setEditJob(true)}
            className="p-2.5 bg-transparent border-2 border-accent-muted rounded-2xl text-text-primary text-sm font-semibold cursor-pointer hover:border-accent hover:text-accent transition-all duration-200"
          >
            ✎ Edit Configuration
          </button>
          <button
            onClick={() => deleteActionHandler && deleteActionHandler(job)}
            className="p-2.5 bg-transparent border-2 border-red-200 rounded-2xl text-red-600 text-sm font-semibold cursor-pointer hover:border-red-300 hover:text-red-700 transition-all duration-200"
          >
            ✕ Delete Job
          </button>
        </div>
      </>
    );
  };

  return (
    <ResizableDrawer
      key={drawerKey}
      open={open}
      onClose={onClose}
      title={title}
      defaultWidth={width}
      minWidth={280}
      maxWidth={maxWidth}
    >
      <DrawerContent />
    </ResizableDrawer>
  );
}
