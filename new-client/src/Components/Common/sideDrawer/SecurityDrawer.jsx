import UserAddUpdateForm from "../security/AddUpdateUser";
import AddUpdateRole from "../security/AddUpdateRole";
import AddUpdateGroup from "../security/AddUpdateGroup";
import AddUpdatePermission from "../security/AddUpdatePermission";
import { ResizableDrawer } from "./ResizableDrawer";

const EditForm = ({
  job,
  onClose,
  editJob,
  setEditJob,
  setUpdateData,
  activeTab,
}) => {
  switch (activeTab) {
    case "Users":
      return (
        <UserAddUpdateForm
          onClose={onClose}
          routeName="Security"
          data={job}
          setUpdateData={setUpdateData}
        />
      );
    case "Roles":
      return (
        <AddUpdateRole
          onClose={onClose}
          data={job}
          mode={editJob ? "edit" : "add"}
          setEditJob={setEditJob}
          setUpdateData={setUpdateData}
        />
      );
    case "Groups":
      return (
        <AddUpdateGroup
          onClose={onClose}
          data={job}
          mode={editJob ? "edit" : "add"}
          setEditJob={setEditJob}
          setUpdateData={setUpdateData}
        />
      );
    case "Permissions":
      return (
        <AddUpdatePermission
          onClose={onClose}
          data={job}
          mode={editJob ? "edit" : "add"}
          setEditJob={setEditJob}
          setUpdateData={setUpdateData}
        />
      );
    default:
      return (
        <UserAddUpdateForm
          onClose={onClose}
          routeName="Security"
          data={job}
          setUpdateData={setUpdateData}
        />
      );
  }
};

export function SecurityDrawer({
  job,
  onClose,
  editJob,
  setEditJob,
  open,
  setUpdateData,
  activeTab,
}) {
  return (
    <ResizableDrawer
      open={open}
      onClose={onClose}
      title={Object.keys(job).length ? `Edit ${activeTab}` : `Add ${activeTab}`}
      defaultWidth="320px"
      minWidth={280}
      maxWidth="480px"
    >
      <EditForm
        job={job}
        onClose={onClose}
        editJob={editJob}
        setEditJob={setEditJob}
        setUpdateData={setUpdateData}
        activeTab={activeTab}
      />
    </ResizableDrawer>
  );
}
