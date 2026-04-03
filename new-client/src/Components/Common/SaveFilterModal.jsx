import React, { useEffect, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";
import { getRequest } from "../../Service/api.service";
import { postDataRequest } from "../../Service/api.service";
import { toast } from "react-hot-toast";
import {
  Checkbox,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export const SaveFilterModal = ({
  jobName,
  saveFilter,
  closeFilterSaveModal,
  filters,
  dataSource,
  tableName,
  hideFields = true,
}) => {
  const { pathname } = useLocation();
  const objectId = useSelector((state) => state.selectedObject.value);
  const [loading, setLoading] = useState(false);
  const [myFolders, setMyFolders] = useState([]);
  const [viewNameError, setViewNameError] = useState("");
  const [userData, setUserData] = React.useState([]);
  const [groupData, setGroupData] = React.useState([]);
  const [formData, setFormData] = useState({
    viewName: "",
    jobName: jobName,
    dataSource: dataSource,
    folderId: "",
    accessType: "",
    tableName: tableName,
    filters,
    userIds: [],
    objectId,
    groupIds: [],
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, tableName: tableName }));
  }, [tableName]);

  const handlechange = (e) => {
    const value = e.target.value;
    if (value.trim() === "" && value !== "")
      setViewNameError("View name cannot contain only spaces");
    else if (!/^[a-zA-Z0-9\s]*$/.test(value) && value !== "")
      setViewNameError(
        "Only letters, numbers are allowed. No special characters.",
      );
    else setViewNameError("");

    setFormData((prev) => ({
      ...prev,
      viewName: value,
    }));
  };

  useEffect(() => {
    setFormData((prev) => ({ ...prev, filters }));
  }, [filters]);

  const handleUserSelect = (event) => {
    const { value } = event.target;
    const updatedUserIds = typeof value === "string" ? value.split(",") : value;
    setFormData((prev) => ({ ...prev, userIds: updatedUserIds }));
  };

  const handleGroupSelect = (event) => {
    const { value } = event.target;
    const updatedUserIds = typeof value === "string" ? value.split(",") : value;
    setFormData((prev) => ({ ...prev, groupIds: updatedUserIds }));
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getRequest("/user/readAll");
        if (response?.status === 200) {
          setUserData(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setUserData([]);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const getAllGroudIds = async () => {
      try {
        const response = await getRequest("/groups/readAll");
        if (response?.status === 200) {
          setGroupData(response?.data || []);
        }
      } catch (error) {
        console.error("error", error);
        setGroupData([]);
      }
    };
    getAllGroudIds();
  }, []);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const user = localStorage.getItem("user-id");
        const sourceType = "Report";
        const response = await getRequest(`/folder/${user}/user/${sourceType}`);
        console.log(response.data, "respone data folder");
        setMyFolders(response?.data || []);
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };
    fetchFolders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewNameError) return;

    if (!formData?.folderId) return toast.error("Select the Folder");
    setLoading(true);
    try {
      const response = await postDataRequest(
        pathname === "/data-console/register/detailed"
          ? "/view/saved/register"
          : "/view/saved",
        { ...formData, viewName: formData?.viewName.trim() },
      );
      if (response.status === 200) {
        toast.success("Successfully Submitted Filter");
        closeFilterSaveModal();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save Filter");
    } finally {
      setLoading(false);
    }
  };

  const handleAccessType = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      ["accessType"]: value,
    }));
  };

  const renderFolderOptions = (folders, depth = 0) => {
    return folders.flatMap((folder) => {
      const indent = "—".repeat(depth);
      const options = [
        <option key={folder.id} value={folder.id}>
          {indent} {folder.folderName}
        </option>,
      ];
      if (folder.childFolders && folder.childFolders.length > 0) {
        options.push(...renderFolderOptions(folder.childFolders, depth + 1));
      }

      return options;
    });
  };

  return (
    <AnimatePresence>
      {saveFilter && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50 z-40 !m-0"
            onClick={closeFilterSaveModal}
          />

          {/* Side Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col !m-0 p-5"
            style={{ width: "min(600px, 85vw)" }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Review & Save Your Filter
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Configure filter settings and access permissions
                </p>
              </div>
              <button
                onClick={closeFilterSaveModal}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <AiOutlineClose size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            {/* <div className="flex-1 overflow-y-auto px-6 py-4"> */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    View Name *
                  </label>
                  <input
                    type="text"
                    name="viewName"
                    value={formData.viewName}
                    onChange={(e) => handlechange(e)}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter view name..."
                  />
                  {viewNameError && (
                    <p className="text-red-500 text-sm mt-1">{viewNameError}</p>
                  )}
                </div>

                {hideFields && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Job Name
                    </label>
                    <input
                      type="text"
                      name="jobName"
                      value={formData.jobName}
                      readOnly
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                    />
                  </div>
                )}

                {!hideFields && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Folder
                    </label>
                    <select
                      name="folderId"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.folderId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          folderId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Folder</option>
                      {myFolders.length > 0 ? (
                        renderFolderOptions(myFolders)
                      ) : (
                        <option disabled>Loading...</option>
                      )}
                    </select>
                  </div>
                )}
              </section>

              <section className="space-y-4">
                {hideFields && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Folder
                    </label>
                    <select
                      name="folderId"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.folderId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          folderId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Folder</option>
                      {myFolders.length > 0 ? (
                        renderFolderOptions(myFolders)
                      ) : (
                        <option disabled>Loading...</option>
                      )}
                    </select>
                  </div>
                )}

                {hideFields && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Table Name
                    </label>
                    <input
                      type="text"
                      name="tableName"
                      value={formData.tableName}
                      readOnly
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                    />
                  </div>
                )}
              </section>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Access Type
                </label>
                <div className="flex flex-col gap-3">
                  {["Public", "Private", "Restricted"].map((option, index) => (
                    <label key={index} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="accessType"
                        value={option}
                        checked={formData?.accessType === option}
                        onChange={(e) => {
                          handleAccessType(e);
                        }}
                        className="form-radio text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {formData.accessType === "Restricted" && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <FormControl fullWidth>
                      <InputLabel
                        id="multi-user-select-label"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Select User
                      </InputLabel>
                      <Select
                        label="Select User"
                        labelId="multi-user-select-label"
                        id="multi-user-select"
                        multiple
                        value={formData?.userIds || []}
                        onChange={handleUserSelect}
                        input={<OutlinedInput label="Select User" />}
                        className="bg-white dark:bg-gray-700"
                        renderValue={(selected) =>
                          selected
                            .map((id) => {
                              const user = userData.find(
                                (u) => u.userId === id,
                              );
                              return user
                                ? `${user.firstName} ${user.lastName}`
                                : id;
                            })
                            .join(", ")
                        }
                      >
                        {userData.length > 0 ? (
                          userData.map((user) => (
                            <MenuItem key={user.userId} value={user.userId}>
                              <Checkbox
                                checked={formData?.userIds.includes(
                                  user.userId,
                                )}
                              />
                              {user.firstName} {user.lastName}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>Loading...</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </div>

                  <div>
                    <FormControl fullWidth>
                      <InputLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Group
                      </InputLabel>
                      <Select
                        label="Select Group"
                        labelId="demo-multiple-chip-label"
                        id="demo-multiple-chip"
                        multiple
                        value={formData?.groupIds || []}
                        onChange={handleGroupSelect}
                        className="bg-white dark:bg-gray-700"
                        renderValue={(selectedIds) =>
                          selectedIds
                            .map((id) => {
                              const group = groupData?.find(
                                (g) => g.groupId === id,
                              );
                              return group ? group.groupName : id;
                            })
                            .join(", ")
                        }
                      >
                        {groupData?.length > 0 ? (
                          groupData.map((group) => (
                            <MenuItem key={group.groupId} value={group.groupId}>
                              <Checkbox
                                checked={formData?.groupIds.includes(
                                  group.groupId,
                                )}
                              />
                              {group.groupName}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>Loading...</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </div>
                </div>
              )}

              {hideFields && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Source
                  </label>
                  <input
                    type="text"
                    value={formData.dataSource}
                    readOnly
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
              )}
              {/* </div> */}

              {/* Footer */}
              <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={closeFilterSaveModal}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || viewNameError}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Saving..." : "Save Filter"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
