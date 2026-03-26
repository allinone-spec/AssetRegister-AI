import React, { useState, useMemo, useEffect } from "react";
import { FormFolder } from "../../../../Data/DashboardModalData";
import { GrFormNextLink } from "react-icons/gr";
import { getRequest } from "../../../../Service/api.service";
import { useDispatch, useSelector } from "react-redux";
import { setDashboardData } from "../../../../redux/Slices/DashboardSlice";
import {
  Checkbox,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  useTheme,
} from "@mui/material";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

const extractFolders = (folders) =>
  folders
    .filter((item) => item.isFolder)
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      children: folder.Links ? extractFolders(folder.Links) : [],
    }));

const flattenFolders = (folders, path = "") =>
  folders.flatMap((folder) => {
    const fullPath = path ? `${path} / ${folder.name}` : folder.name;
    return [
      { id: folder.id, name: fullPath },
      ...flattenFolders(folder.children, fullPath),
    ];
  });

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function getStyles(name, userId, theme) {
  return {
    fontWeight: userId.includes(name)
      ? theme.typography.fontWeightMedium
      : theme.typography.fontWeightRegular,
  };
}

const AddFolder = ({ textColor, gotoNext, setObjectId, setObjectValue }) => {
  const dispatch = useDispatch();
  const { state } = useLocation();
  const { dashboardData } = useSelector((state) => state.dashboard);

  const [dashboardFolderId, setDashboardFolderId] = useState();
  const [dashboardObjectId, setDashboardObjectId] = useState();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const { dashboardName, folderId, objectId, description } = dashboardData;
  const [checkDashboardAvalibale, setCheckDashboardAvalibale] = useState(false);
  const [dashboardNameMateched, setDashboardNameMatched] = useState(false);
  const [showList, setShowList] = useState(false);
  const [myFolders, setMyFolders] = useState([]);
  const [objectData, setObjectData] = useState([]);
  const [allGraphData, setAllGraphData] = useState(
    JSON.parse(localStorage.getItem("folderGraphData")),
  );
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const theme = useTheme();
  const [userData, setUserData] = React.useState([]);
  const [groupData, setGroupData] = React.useState([]);

  const flattenedFolders = useMemo(
    () => flattenFolders(extractFolders(FormFolder)),
    [],
  );

  // Synchronize local state with Redux dashboardData
  useEffect(() => {
    setDashboardObjectId(state?.objectId || selectedObject || "All Object");
    setObjectId(state?.objectId || selectedObject || "All Object");

    // Set folder ID from navigation state if available
    if (state?.folderId) {
      setDashboardFolderId(state.folderId);
      dispatch(setDashboardData({ field: "folderId", value: state.folderId }));
    }
  }, [selectedObject, state?.objectId, state?.folderId]);

  // useEffect(() => {
  //     if (!dashboardData?.folderId && myFolders.length > 0) {
  //         dispatch(setDashboardData({ field: "folderId", value: myFolders[0].id }));
  //     }
  //     if (!dashboardData?.objectId && objectData.length > 0) {
  //         dispatch(setDashboardData({ field: "objectId", value: objectData[0].objectId }));
  //     }
  // }, [myFolders, objectData, dashboardData, dispatch]);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const user = localStorage.getItem("user-id");
        const sourceType = "Dashboard";
        const response = await getRequest(`/folder/${user}/user/${sourceType}`);
        setMyFolders(response?.data || []);
        fetchAllGraphs();
      } catch (error) {
        console.error("Error fetching folders:", error);
        setMyFolders([]);
      } finally {
        setFolderLoading(false);
      }
    };
    fetchFolders();
  }, []);

  useEffect(() => {
    const fetchAllObjects = async () => {
      setLoading(true);
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
    console.log("name, value ", name, value);
    if (name === "folderId") {
      setDashboardFolderId(value);
    } else if (name === "objectId") {
      setDashboardObjectId(value);
      setObjectId(value);
      setObjectValue(objectData.find((v) => v.objectId == value)?.objectName);
    }
    dispatch(setDashboardData({ field: name, value }));
  };

  const handleVisibilityChange = (option) => {
    setShowList(option === "restricted");
  };

  const fetchAllGraphs = async () => {
    setFolderLoading(true);

    try {
      if (!folderId) {
        return;
      }
      const response = await getRequest(
        `/dashboard/${folderId}/withUniqueColumnsValues`,
      );
      if (response?.status === 200) {
        setAllGraphData(response?.data || []);
        localStorage.setItem(
          "folderGraphData",
          JSON.stringify(response.data || []),
        );
      }
    } catch (error) {
      console.error("Error fetching graphs:", error);
      setAllGraphData([]);
      localStorage.setItem("folderGraphData", "[]");
    } finally {
      setFolderLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGraphs();
  }, [folderId]);

  useEffect(() => {
    if (selectedObject)
      dispatch(setDashboardData({ field: "objectId", value: selectedObject }));
  }, [selectedObject]);

  useEffect(() => {
    if (allGraphData) {
      setDashboardNameMatched(false);
      setCheckDashboardAvalibale(true);
      const check = isAvialableDashboardName(
        allGraphData,
        folderId,
        dashboardData?.dashboardName,
      );
      setDashboardNameMatched(check);
      setCheckDashboardAvalibale(false);
    }
  }, [dashboardData.dashboardName, folderId, allGraphData]);

  const isAvialableDashboardName = (folders, folderId, dashboardName) => {
    if (!dashboardName) return false;
    return folders.some((data) => {
      return data?.dashBoardName?.toLowerCase() === dashboardName.toLowerCase();
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (folderLoading) {
      toast.error(" Folder is Loading..");
      return;
    }
    if (dashboardData.folderType === "Restricted") {
      if (
        dashboardData.userIds.length === 0 &&
        dashboardData.groupIds.length === 0
      ) {
        toast.error(
          "Please select at least one User or Group for a Restricted folder.",
        );
        return;
      }
    } else {
      if (
        dashboardData.folderId == "Select Folder" ||
        !dashboardData.folderId ||
        !dashboardFolderId
      ) {
        toast.error("All fields are required");
        return;
      } else if (
        dashboardData.objectId == "All Object" ||
        dashboardObjectId == "All Object" ||
        !dashboardObjectId
      ) {
        toast.error("Select The Valid Object");
        return;
      } else if (!dashboardData.dashboardName) {
        toast.error("Enter Dashboard Name");
        return;
      }
    }
    if (dashboardNameMateched && !checkDashboardAvalibale) {
      toast.error("DashboardName already exists");
      return;
    }
    gotoNext(1);
  };

  const handleUserChange = (event) => {
    const { value } = event.target;
    const updatedUserIds = typeof value === "string" ? value.split(",") : value;
    dispatch(setDashboardData({ field: "userIds", value: updatedUserIds }));
  };

  const handleGroupChange = (event) => {
    const { value } = event.target;
    const updatedGroupIds =
      typeof value === "string" ? value.split(",") : value;
    dispatch(setDashboardData({ field: "groupIds", value: updatedGroupIds }));
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
        className="flex h-full flex-col justify```javascript
                -between"
      >
        {!showList ? (
          <>
            <>
              <select
                id="folder"
                name="folderId"
                className="w-full p-3 border rounded-md shadow-sm mb-4"
                value={dashboardFolderId}
                onChange={handleChange}
                disabled={!!state?.folderId}
              >
                <option value={null}>Select Folder</option>
                {myFolders?.length > 0 ? (
                  renderFolderOptions(myFolders)
                ) : (
                  <option disabled>Loading...</option>
                )}
              </select>

              <select
                id="object"
                name="objectId"
                className="w-full p-3 border rounded-md shadow-sm mb-4"
                value={
                  state?.objectId
                    ? state?.objectId
                    : selectedObject || dashboardObjectId || null
                }
                onChange={handleChange}
                disabled={!!state?.objectId || !!selectedObject}
              >
                <option value={null}>All Object</option>
                {objectData.length > 0 ? (
                  objectData?.map((obj) => (
                    <option key={obj.objectId} value={obj.objectId}>
                      {obj.objectName}
                    </option>
                  ))
                ) : (
                  <option disabled>Loading...</option>
                )}
              </select>

              {/* Dashboard Name Input */}
              <input
                type="text"
                id="dashboardName"
                name="dashboardName"
                placeholder="Enter Dashboard Name"
                value={dashboardData?.dashboardName || ""}
                className={`w-full p-3 border-2 rounded-md shadow-sm mb-4 ${
                  dashboardNameMateched
                    ? "text-red-600  font-semibold"
                    : "border-black"
                }`}
                onChange={handleChange}
              />
              {dashboardNameMateched && (
                <p className="text-red-500 text-sm mt-1" aria-live="polite">
                  DashboardName already exists. Please choose a different name.
                </p>
              )}

              {/* Description Input */}
              <textarea
                id="description"
                name="description"
                placeholder="Description"
                value={dashboardData?.description || ""}
                onChange={handleChange}
                className="w-full p-3 border rounded-md shadow-sm mb-4"
                rows="4"
              ></textarea>

              {/* Visibility Selection */}
              <label className="block text-lg font-semibold mb-2">
                Visibility
              </label>
              <div className="flex items-center space-x-6 mb-6">
                {["Public", "Private", "Restricted"].map((option, index) => (
                  <label key={index} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="folderType"
                      value={option}
                      checked={dashboardData?.folderType === option}
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
            </>

            <section className="w-full flex justify-end">
              <button
                type="submit"
                className="text-right flex cursor-pointer w-fit items-center"
                disabled={checkDashboardAvalibale}
              >
                <span className="text-[0.8rem]" style={{ color: textColor }}>
                  Next
                </span>
                <GrFormNextLink className="w-8" />
              </button>
            </section>
          </>
        ) : (
          <>
            <div>
              <FormControl
                sx={{
                  m: 1,
                  width: "100%",
                  bgcolor: "white",
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
                  value={dashboardData?.userIds || []}
                  onChange={handleUserChange}
                  input={<OutlinedInput label="Select User" />}
                  renderValue={(selected) =>
                    selected
                      .map((id) => {
                        const user = userData.find((u) => u.userId === id);
                        return user ? `${user.firstName} ${user.lastName}` : id;
                      })
                      .join(", ")
                  }
                >
                  {userData.length > 0 ? (
                    userData.map((user) => (
                      <MenuItem key={user.userId} value={user.userId}>
                        <Checkbox
                          checked={dashboardData?.userIds.includes(user.userId)}
                        />
                        {user.firstName} {user.lastName}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Loading...</MenuItem>
                  )}
                </Select>
              </FormControl>

              <FormControl
                sx={{
                  m: 1,
                  width: "100%",
                  bgcolor: "white",
                  border: "1px solid gray",
                  borderRadius: "10px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              >
                <InputLabel id="demo-multiple-chip-label">
                  Select Group
                </InputLabel>

                <Select
                  labelId="demo-multiple-chip-label"
                  id="demo-multiple-chip"
                  multiple
                  value={dashboardData?.groupIds || []} // Ensure it's always an array
                  onChange={handleGroupChange}
                  input={<OutlinedInput label="Select Group" />}
                  renderValue={
                    (selectedIds) =>
                      selectedIds
                        .map((id) => {
                          const group = groupData?.find(
                            (g) => g.groupId === id,
                          );
                          return group ? group.groupName : id;
                        })
                        .join(", ") // Display selected groups as a comma-separated string
                  }
                  MenuProps={MenuProps}
                >
                  {groupData?.length > 0 ? (
                    groupData.map((group) => (
                      <MenuItem key={group.groupId} value={group.groupId}>
                        <Checkbox
                          checked={dashboardData?.groupIds.includes(
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

export default AddFolder;
