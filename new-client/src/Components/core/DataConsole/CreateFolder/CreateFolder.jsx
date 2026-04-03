import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, Check } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { baseUrl } from "../../../../Utility/baseUrl";
import { setFoldersData } from "../../../../redux/Slices/FolderSlice";
import { getRequest } from "../../../../Service/api.service";

// Import existing field components
import InputField from "../../../Common/Fileds/InputField";
import SelectField from "../../../Common/Fileds/SelectField";
import MultiSelect from "../../../Common/Fileds/MultiSelect";
import CommonButton from "../../../Common/CommonButton";

// Simple RadioGroup component for this specific use case
const RadioGroup = ({
  label,
  options = [],
  value,
  onChange,
  name,
  disabled = false,
  className = "",
}) => (
  <div className={className}>
    <label className="text-xs font-semibold uppercase tracking-widest text-text-sub mb-2 block">
      {label}
    </label>
    <div className="flex items-center space-x-6 mb-6">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={disabled}
            className="w-4 h-4 text-accent bg-input-bg border-theme focus:ring-accent focus:ring-2 disabled:opacity-100"
          />
          <span className="capitalize text-text-primary">{option.label}</span>
        </label>
      ))}
    </div>
  </div>
);

const CreateFolder = ({ sourceType, folderDetails }) => {
  const { userId: folderId } = folderDetails
    ? { userId: folderDetails.userId }
    : useParams();
  const dispatch = useDispatch();
  const { foldersData } = useSelector((state) => state.folder);
  const { state } = folderDetails
    ? { state: { ...folderDetails } }
    : useLocation();
  const [showList, setShowList] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [myFolders, setMyFolders] = useState([]);
  const [loadingMyFolders, setLoadingMyFolders] = useState([]);
  const [userData, setUserData] = React.useState([]);
  const [groupData, setGroupData] = React.useState([]);
  const [loading, setLoading] = useState(false);
  const [folderType, setFolderType] = useState(
    state?.selectedFolder?.id ? "Child" : "Parent",
  );
  const [folderData, setFolderData] = useState({
    folderName: "",
    accessType: "Public",
    parentFolderId: 0,
    userIds: [],
    groupIds: [],
    // objectIds: []
  });

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const user = localStorage.getItem("user-id");
        setLoadingMyFolders(true);
        if (folderId) {
          const response = await getRequest(
            `/folder/${folderId}/folder/${state?.sourceType}`,
          );
          setMyFolders(response?.data.childFolders || []);
        } else {
          const response = await getRequest(
            `/folder/${user}/user/${state?.sourceType}`,
          );
          setMyFolders(response?.data || []);
        }
      } catch (error) {
        console.error("Error fetching folders:", error);
      } finally {
        setLoadingMyFolders(false);
      }
    };
    if (state?.sourceType) fetchFolders();
  }, [state?.sourceType, folderId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFolderData((pre) => ({ ...pre, accessType: value }));
    dispatch(setFoldersData({ field: name, value }));
  };

  const handleVisibilityChange = (option) => {
    setShowList(option == "restricted");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      foldersData?.accessType == "Restricted" &&
      !foldersData.userIds.length &&
      !foldersData.groupIds.length
    ) {
      toast.error("Please select a User or Group before proceeding.");
      return;
    } else {
      const createdFolder = async () => {
        try {
          setLoading(true);
          const response = await axios
            .post(
              `${baseUrl}/folder/create`,
              {
                folderName: folderData.folderName,
                accessType: folderData.accessType,
                parentFolderId: folderData.parentFolderId || folderId,
                sourceType: state?.sourceType || sourceType,
                userIds: folderData.userIds,
                groupIds: folderData.groupIds,
                // objectIds: folderData.objectIds
              },
              {
                headers: {
                  userId: localStorage.getItem("user-id"),
                  "Content-Type": "application/json",
                },
              },
            )
            .catch((err) => {
              console.log("err folder create", err);
              toast.error(err?.response?.data?.error);
            });

          if (response?.status === 200) {
            toast.success("Folder created successfully");
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            setFolderData({
              folderName: "",
              accessType: "Public",
              parentFolderId: 0,
              userIds: [],
              groupIds: [],
              // objectIds: []
            });
            dispatch(setFoldersData());
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      createdFolder();
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setUserDropdownOpen(false);
        setGroupDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUserToggle = (userId) => {
    const updatedUserIds = folderData.userIds.includes(userId)
      ? folderData.userIds.filter((id) => id !== userId)
      : [...folderData.userIds, userId];

    setFolderData((prev) => ({ ...prev, userIds: updatedUserIds }));
    dispatch(setFoldersData({ field: "userIds", value: updatedUserIds }));
  };

  const handleGroupToggle = (groupId) => {
    const updatedGroupIds = folderData.groupIds.includes(groupId)
      ? folderData.groupIds.filter((id) => id !== groupId)
      : [...folderData.groupIds, groupId];

    setFolderData((prev) => ({ ...prev, groupIds: updatedGroupIds }));
    dispatch(setFoldersData({ field: "groupIds", value: updatedGroupIds }));
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

  const renderFolderOptions = (folders, level = 0) => {
    return folders?.map(({ id, folderName, childFolders }) => (
      <React.Fragment key={id}>
        <option value={id}>{"— ".repeat(level) + folderName}</option>
        {childFolders &&
          childFolders.length > 0 &&
          renderFolderOptions(childFolders, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="h-full max-w-full py-2 mx-auto flex flex-col justify-between bg-surface text-text-primary">
      <form
        onSubmit={handleSubmit}
        className="flex h-full flex-col justify-between"
      >
        {!showList ? (
          <>
            <RadioGroup
              label="Folder Type"
              name="folderType"
              value={folderType}
              onChange={(value) => {
                if (!state?.selectedFolder) {
                  setFolderType(value);
                }
              }}
              disabled={state?.selectedFolder?.id}
              options={[
                { value: "Parent", label: "Parent" },
                { value: "Child", label: "Child" },
              ]}
            />

            {folderType !== "Parent" && (
              <SelectField
                label="Parent Folder"
                required
                value={
                  state?.selectedFolder?.id || folderData.parentFolderId || ""
                }
                onChange={(e) =>
                  setFolderData((prev) => ({
                    ...prev,
                    parentFolderId: e.target.value,
                  }))
                }
                disabled={Boolean(state?.selectedFolder?.id)}
                className="mb-4"
              >
                <option value="">
                  {folderType !== "Parent" ? "Select Parent Folder" : "Select"}
                </option>

                {state?.selectedFolder && (
                  <option value={state.selectedFolder.id}>
                    {state.selectedFolder.folderName}
                  </option>
                )}

                {folderType !== "Parent" && myFolders?.length > 0 ? (
                  renderFolderOptions(myFolders)
                ) : (
                  <option disabled>
                    {loadingMyFolders ? "Loading..." : "No folders available"}
                  </option>
                )}
              </SelectField>
            )}

            <InputField
              label="Folder Name"
              placeholder="Enter Folder Name"
              value={folderData?.folderName || ""}
              onChange={(e) =>
                setFolderData((pre) => ({ ...pre, folderName: e.target.value }))
              }
              required
              className="mb-4"
            />

            <RadioGroup
              label="Visibility"
              name="accessType"
              value={folderData?.accessType}
              onChange={(value) => {
                handleChange({ target: { name: "accessType", value } });
                handleVisibilityChange(value.toLowerCase());
              }}
              options={[
                { value: "Public", label: "Public" },
                { value: "Private", label: "Private" },
                { value: "Restricted", label: "Restricted" },
              ]}
            />

            <section className="w-full flex justify-end">
              <CommonButton
                onClick={handleSubmit}
                disabled={loading}
                className="bg-accent"
              >
                {loading ? "Creating Folder ..." : "Save"}
              </CommonButton>
            </section>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <MultiSelect
                label="Users"
                required={false}
                options={userData}
                value={folderData.userIds}
                onChange={(selectedUserIds) => {
                  setFolderData((prev) => ({
                    ...prev,
                    userIds: selectedUserIds,
                  }));
                  dispatch(
                    setFoldersData({
                      field: "userIds",
                      value: selectedUserIds,
                    }),
                  );
                }}
                getOptionValue={(user) => user.userId}
                getOptionLabel={(user) => `${user.firstName} ${user.lastName}`}
                showSelectAll
                className="mb-4"
              />

              <MultiSelect
                label="Groups"
                required={false}
                options={groupData}
                value={folderData.groupIds}
                onChange={(selectedGroupIds) => {
                  setFolderData((prev) => ({
                    ...prev,
                    groupIds: selectedGroupIds,
                  }));
                  dispatch(
                    setFoldersData({
                      field: "groupIds",
                      value: selectedGroupIds,
                    }),
                  );
                }}
                getOptionValue={(group) => group.groupId}
                getOptionLabel={(group) => group.groupName}
                showSelectAll
                className="mb-4"
              />
            </div>

            <section className="w-full flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setShowList(false)}
                className="px-4 py-2 text-sm text-text-sub hover:text-text-primary transition-colors duration-200 font-medium hover:bg-input-bg rounded-lg"
              >
                ← Back
              </button>
              {/* <CommonButton
                onClick={handleSubmit}
                disabled={loading}
                backgroundColor={loading ? "#9ca3af" : undefined}
                className={`${
                  loading
                    ? "cursor-not-allowed opacity-50"
                    : "hover:opacity-90 shadow-md"
                } bg-accent`}
              >
                {loading ? "Creating Folder ..." : "Save Folder"}
              </CommonButton> */}
            </section>
          </>
        )}
      </form>
    </div>
  );
};

export default CreateFolder;
