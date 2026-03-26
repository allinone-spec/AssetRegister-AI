import React, { useEffect, useState } from "react";
import { FormFolder } from "../../../../Data/DashboardModalData";
import { useDispatch, useSelector } from "react-redux";
import { setFoldersData } from "../../../../redux/Slices/FolderSlice";
import { setDashboardData } from "../../../../redux/Slices/DashboardSlice";
import {
  createFolder,
  getRequest,
  postDataRequest,
} from "../../../../Service/api.service";
import { useTheme } from "../../../../ThemeContext";
import { GrFormNextLink } from "react-icons/gr";
import {
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
} from "@mui/material";
import { Box } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { baseUrl } from "../../../../Utility/baseUrl";

const CreateFolder = ({ textColor, lightbackground }) => {
  const { userId: folderId } = useParams();
  const dispatch = useDispatch();
  const { foldersData } = useSelector((state) => state.folder);
  const { state } = useLocation();

  const [showList, setShowList] = useState(false);
  const [selectedUserGroup, setSelectedUserGroup] = useState("");
  const [myFolders, setMyFolders] = useState([]);
  const [loadingMyFolders, setLoadingMyFolders] = useState([]);
  const [objectData, setObjectData] = useState([]);
  const theme = useTheme();
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

  useEffect(() => {
    const fetchAllObjects = async () => {
      try {
        const response = await getRequest("/objects/readAll");
        setObjectData(response?.data || []);
      } catch (error) {
        console.error("Error fetching objects:", error);
        setObjectData([]);
      }
    };
    fetchAllObjects();
  }, []);

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
                sourceType: state?.sourceType,
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

          if (response.status === 200) {
            setLoading(false);
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
          setLoading(false);
        }
      };
      createdFolder();
    }
  };

  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: 200,
        width: 250,
      },
    },
  };

  const handleObjectChange = (event) => {
    const { value } = event.target;
    const updatedObjectIds =
      typeof value === "string" ? value.split(",") : value;
    setFolderData((pre) => ({ ...pre, objectIds: value }));
    dispatch(setFoldersData({ field: "objectIds", value: updatedObjectIds }));
  };

  const handleUserChange = (event) => {
    const { value } = event.target;
    const updatedUserIds = typeof value === "string" ? value.split(",") : value;
    setFolderData((pre) => ({ ...pre, userIds: value }));
    dispatch(setFoldersData({ field: "userIds", value: updatedUserIds }));
  };

  const handleGroupChange = (event) => {
    const { value } = event.target;
    const updatedGroupIds =
      typeof value === "string" ? value.split(",") : value;
    setFolderData((pre) => ({ ...pre, groupIds: value }));
    dispatch(setFoldersData({ field: "groupIds", value: updatedGroupIds })); // Store in Redux
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
    <div className="h-full max-w-full py-2 mx-auto flex flex-col justify-between">
      <form
        onSubmit={handleSubmit}
        className="flex h-full flex-col justify-between"
      >
        {!showList ? (
          <>
            <label className="block text-lg font-semibold mb-2">
              Folder Type
            </label>
            <div className="flex items-center space-x-6 mb-6">
              {["Parent", "Child"].map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="folderType"
                    value={option}
                    checked={
                      (option === "Child" && state?.selectedFolder?.id) ||
                      option === folderType
                    }
                    onChange={() => {
                      if (!state?.selectedFolder) {
                        setFolderType(option);
                      }
                    }}
                    disabled={state?.selectedFolder?.id}
                    className="form-radio h-4 w-4 text-blue-500 focus:ring-blue-500 disabled:opacity-100 disabled:bg-blue-500 disabled:checked:bg-blue-500"
                  />
                  <span className="capitalize text-gray-800">{option}</span>
                </label>
              ))}
            </div>
            {folderType !== "Parent" && (
              <select
                id="folder"
                name="folderId"
                className="w-full p-3 border rounded-md shadow-sm mb-4"
                value={
                  state?.selectedFolder?.id || folderData.parentFolderId || ""
                }
                defaultValue={""}
                required
                onChange={(e) =>
                  setFolderData((prev) => ({
                    ...prev,
                    parentFolderId: e.target.value,
                  }))
                }
                disabled={Boolean(state?.selectedFolder?.id)}
              >
                <option value="">
                  {folderType !== "Parent"
                    ? "Select Parent Folder"
                    : "Select"}{" "}
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
              </select>
            )}

            {/* Object Dropdown */}
            {/* <select
                            id="object"
                            name="objectId"
                            className="w-full p-3 border rounded-md shadow-sm mb-4"
                            value={foldersData?.objectId || ""}
                            onChange={handleChange}
                        >
                            <option value="">Select Object</option>
                            {objectData.map((obj) => (
                                <option key={obj.objectId} value={obj.objectId}>
                                    {obj.objectName}
                                </option>
                            ))}
                        </select> */}

            {/* Dashboard Name Input */}
            <input
              type="text"
              id="folderName"
              name="folderName"
              placeholder="Enter Folder Name"
              value={folderData?.folderName || ""}
              className="w-full p-3 border rounded-md shadow-sm mb-4"
              onChange={(e) =>
                setFolderData((pre) => ({ ...pre, folderName: e.target.value }))
              }
              required
            />

            {/* Description Input */}
            {/* <textarea
                            id="description"
                            name="description"
                            placeholder="Description"
                            value={foldersData?.description || ""}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-md shadow-sm mb-4"
                            rows="4"
                        ></textarea> */}

            {/* Visibility Selection */}
            <label className="block text-lg font-semibold mb-2">
              Visibility
            </label>
            <div className="flex items-center space-x-6 mb-6">
              {["Public", "Private", "Restricted"].map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="accessType"
                    value={option}
                    checked={folderData?.accessType === option}
                    onChange={(e) => {
                      handleChange(e);
                      handleVisibilityChange(option.toLowerCase());
                    }}
                    className="form-radio"
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>

            {/* Submit Button */}
            <section className="w-full flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`text-right flex ${
                  loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                } w-fit items-center`}
              >
                <span
                  className="text-[0.8rem] py-1 px-2 rounded-xl shadow-md font-semibold"
                  style={{ backgroundColor: lightbackground }}
                >
                  {loading ? "Creating Folder ..." : "Save"}
                </span>
              </button>
            </section>
          </>
        ) : (
          <>
            {/* User or Group Selection */}
            <div>
              <FormControl
                sx={{
                  m: 1,
                  width: "100%",
                  bgcolor: "white",
                  height: "60px",
                  border: "1px solid gray",
                  borderRadius: "10px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              >
                <InputLabel id="multi-user-select-label">
                  Select User
                </InputLabel>
                <Select
                  labelId="multi-user-select-label"
                  id="multi-user-select"
                  multiple
                  value={foldersData?.userIds || []} // Ensure it's always an array
                  onChange={handleUserChange}
                  input={<OutlinedInput label="Select User" />}
                  renderValue={(selected) =>
                    selected
                      .map((id) => {
                        const user = userData.find((u) => u.userId === id);
                        return user ? `${user.firstName} ${user.lastName}` : "";
                      })
                      .join(", ")
                  }
                >
                  {userData.map((user) => (
                    <MenuItem key={user.userId} value={user.userId}>
                      <Checkbox
                        checked={foldersData?.userIds.includes(user.userId)}
                      />
                      {user.firstName} {user.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                sx={{
                  m: 1,
                  width: "100%",
                  height: "60px",
                  bgcolor: "white",
                  border: "1px solid gray",
                  borderRadius: "10px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              >
                <InputLabel id="demo-multiple-checkbox-label">
                  Select Group
                </InputLabel>
                <Select
                  labelId="demo-multiple-checkbox-label"
                  id="demo-multiple-checkbox"
                  multiple
                  value={folderData?.groupIds || []}
                  onChange={handleGroupChange}
                  input={<OutlinedInput label="Select Group" />}
                  renderValue={(selectedIds) =>
                    selectedIds
                      .map((id) => {
                        const group = groupData?.find((g) => g.groupId === id);
                        return group ? group.groupName : id;
                      })
                      .join(", ")
                  }
                  MenuProps={MenuProps}
                >
                  {groupData?.map((group) => (
                    <MenuItem key={group.groupId} value={group.groupId}>
                      <Checkbox
                        checked={folderData?.groupIds.includes(group.groupId)}
                      />
                      {group.groupName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* <FormControl
                                sx={{
                                    m: 1,
                                    width: "100%",
                                    height: "60px",
                                    bgcolor: "white",
                                    border: "1px solid gray",
                                    borderRadius: "10px",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        border: "none",
                                    },
                                }}
                            >
                                <InputLabel id="demo-multiple-checkbox-label">Select Objects</InputLabel>
                                <Select
                                    labelId="demo-multiple-checkbox-label"
                                    id="demo-multiple-checkbox"
                                    multiple
                                    value={folderData?.objectIds || []} // Ensure it's always an array
                                    onChange={handleObjectChange}
                                    input={<OutlinedInput label="Select Objects" />}
                                    renderValue={(selectedIds) =>
                                        selectedIds
                                            .map((id) => {
                                                const object = objectData?.find((obj) => obj.objectId === id);
                                                return object ? object.objectName : id;
                                            })
                                            .join(", ") // Show selected groups as a comma-separated string
                                    }
                                    MenuProps={MenuProps}
                                >
                                    {objectData?.map((object) => {
                                        return (
                                            <MenuItem key={object.objectId} value={object.objectId}>
                                                <Checkbox checked={folderData?.objectIds.includes(object.objectId)} />
                                                {object.objectName}
                                            </MenuItem>
                                        )
                                    })}
                                </Select>
                            </FormControl> */}
            </div>

            {/* Navigation Buttons */}
            <section className="w-full flex items-center justify-between">
              <p
                className="text-[0.8rem] cursor-pointer"
                onClick={() => setShowList(false)}
              >
                Back
              </p>
            </section>
          </>
        )}
      </form>
    </div>
  );
};

export default CreateFolder;
