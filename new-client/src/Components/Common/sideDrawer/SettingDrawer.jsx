import { useSelector } from "react-redux";
import AddSsoForm from "../../core/AdminConsole/Sso/AddSSoForm";
import { AddObjectDataModal } from "../AdddObjectModal";
import { EmailModal } from "../EmailModal";
import { ResizableDrawer } from "./ResizableDrawer";

const EditForm = ({
  job,
  editJob,
  setEditJob,
  activeTab,
  setIsEditModalOpen,
  setSelectedEmail,
}) => {
  switch (activeTab) {
    case "SSO Configuration":
      return (
        <AddSsoForm
          routeName="Settings"
          ssoData={job}
          editJob={editJob}
          setEditJob={setEditJob}
        />
      );
    case "Object":
      return (
        <AddObjectDataModal
          editJob={editJob}
          data={job}
          setEditJob={setEditJob}
        />
      );
    case "Scheduled Emails":
      return (
        <EmailModal
          isDrawer
          isEmailModalOpen
          CloseEmailModal={() => {
            setIsEditModalOpen(false);
            setSelectedEmail(null);
          }}
          routeName="Settings"
          jobName={job?.jobName || ""}
          tableName={job?.tableName || ""}
          viewId={job?.viewId || ""}
          isJob={true}
          scheduleType={job?.scheduleType || "email"}
          showScheduleManagement={false}
          editData={job}
          onUpdate={() => {}}
        />
      );
    default:
      return (
        <AddSsoForm
          routeName="Settings"
          ssoData={job}
          editJob={editJob}
          setEditJob={setEditJob}
        />
      );
  }
};

export function SettingDrawer({
  job,
  open,
  editJob,
  setEditJob,
  onClose,
  activeTab,
  setIsEditModalOpen,
  setSelectedEmail,
}) {
  return (
    <ResizableDrawer
      open={open}
      onClose={onClose}
      title={editJob ? `Add ${activeTab}` : `Update ${activeTab}`}
      defaultWidth="320px"
      minWidth={280}
      maxWidth="480px"
    >
      <EditForm
        job={job}
        editJob={editJob}
        setEditJob={setEditJob}
        activeTab={activeTab}
        setIsEditModalOpen={setIsEditModalOpen}
        setSelectedEmail={setSelectedEmail}
      />
    </ResizableDrawer>
  );
}
