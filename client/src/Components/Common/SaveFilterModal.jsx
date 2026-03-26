import React, { useEffect, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
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
import SubmitBtn from "./SubmitBtn";
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
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10
          transition-opacity duration-300 ${
            saveFilter ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
    >
      <div
        className={`bg-white p-6 rounded-lg w-1/2 relative h-[90vh] overflow-y-scroll 
            transform transition-transform duration-300 ${
              saveFilter ? "scale-100" : "scale-95"
            }`}
      >
        <main className="h-auto">
          <button
            className="absolute top-3 right-3"
            onClick={closeFilterSaveModal}
          >
            <AiOutlineClose size={24} />
          </button>
          <h2 className="text-xl font-bold mb-4">Review & Save Your Filter</h2>
          <form onSubmit={handleSubmit} className="py-5">
            <section className="flex w-full justify-between">
              <div className="w-[48%]">
                <label className="block mb-1">View Name *</label>
                <input
                  type="text"
                  name="viewName"
                  value={formData.viewName}
                  onChange={(e) => handlechange(e)}
                  required
                  className="w-full p-2 border rounded mb-4 bg-gray-100 "
                />
                {viewNameError && (
                  <p className="text-red-500 text-sm">{viewNameError}</p>
                )}
              </div>
              {hideFields ? (
                <div className="w-[48%]">
                  <label className="block mb-1">Job Name</label>
                  <input
                    type="text"
                    name="jobName"
                    value={formData.jobName}
                    readOnly
                    className="w-full p-2 border rounded mb-4 bg-gray-100 cursor-not-allowed"
                  />
                </div>
              ) : (
                <div className="w-[48%]">
                  <label className="block mb-1">Select Folder</label>
                  <select
                    name="folderId"
                    className="w-full p-2 border rounded mb-4"
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

            <section className="flex w-full justify-between">
              {hideFields && (
                <div className="w-[48%]">
                  <label className="block mb-1">Select Folder</label>
                  <select
                    name="folderId"
                    className="w-full p-2 border rounded mb-4"
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
                <div className="w-[48%]">
                  <label className="block mb-1">Table Name</label>
                  <input
                    type="text"
                    name="tableName"
                    value={formData.tableName}
                    readOnly
                    className="w-full p-2 border rounded mb-4 bg-gray-100 cursor-not-allowed"
                  />
                </div>
              )}
            </section>
            <label className="block mb-1">Access Type</label>
            <div className="flex items-center space-x-6 mb-6">
              {["Public", "Private", "Restricted"].map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="accessType"
                    value={option}
                    checked={formData?.accessType === option}
                    onChange={(e) => {
                      handleAccessType(e);
                    }}
                    className="form-radio"
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>
            {formData.accessType === "Restricted" && (
              <div className="flex w-full justify-between mb-4">
                <div className="w-[48%]">
                  <FormControl fullWidth>
                    <InputLabel id="multi-user-select-label">
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
                      renderValue={(selected) =>
                        selected
                          .map((id) => {
                            const user = userData.find((u) => u.userId === id);
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
                              checked={formData?.userIds.includes(user.userId)}
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
                <div className="w-[48%]">
                  <FormControl fullWidth>
                    <InputLabel>Select Group</InputLabel>
                    <Select
                      label="Select Group"
                      labelId="demo-multiple-chip-label"
                      id="demo-multiple-chip"
                      multiple
                      value={formData?.groupIds || []}
                      onChange={handleGroupSelect}
                      // input={<OutlinedInput label="Select Group" />}
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
              <div className="flex w-full  justify-between">
                <div className="w-[48%]">
                  <label className="block mb-1">Data Source</label>
                  <input
                    type="text"
                    value={formData.dataSource}
                    readOnly
                    className="w-full p-2 border rounded mb-4 bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
            )}
            <div className="mt-6 text-center">
              <SubmitBtn
                text="Save Filter"
                type="submit"
                disabled={loading}
                isLoading={loading}
              />
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};
