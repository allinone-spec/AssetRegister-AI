import React, { useState, useMemo, useEffect } from "react";
import { FormFolder } from "../../../../Data/DashboardModalData";
import { GrFormNextLink } from "react-icons/gr";
import { getRequest } from "../../../../Service/api.service";
import { useDispatch, useSelector } from "react-redux";
import { setDashboardData } from "../../../../redux/Slices/DashboardSlice";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

// Import existing field components
import InputField from "../../../Common/Fileds/InputField";
import SelectField from "../../../Common/Fileds/SelectField";
import MultiSelect from "../../../Common/Fileds/MultiSelect";
import CommonButton from "../../../Common/CommonButton";

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

const AddFolder = ({
  textColor,
  gotoNext,
  setObjectId,
  setObjectValue,
  selectedFolder,
  folderData,
  sourceType,
}) => {
  const dispatch = useDispatch();
  const { state } = folderData ? { state: folderData } : useLocation();
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
  const [userData, setUserData] = React.useState([]);
  const [groupData, setGroupData] = React.useState([]);

  const flattenedFolders = useMemo(
    () => flattenFolders(extractFolders(FormFolder)),
    [],
  );

  // Synchronize local state with Redux dashboardData
  useEffect(() => {
    // Set objectId from multiple sources: state, selectedObject, or folderData
    const currentObjectId =
      state?.objectId || selectedObject || folderData?.objectId || "All Object";
    setDashboardObjectId(currentObjectId);
    setObjectId(currentObjectId);

    // Set folder ID from navigation state or props
    const folderId = state?.folderId;
    if (folderId) {
      setDashboardFolderId(folderId);
      dispatch(setDashboardData({ field: "folderId", value: folderId }));
    }

    // Set objectId in Redux if we have a valid value
    if (currentObjectId && currentObjectId !== "All Object") {
      dispatch(setDashboardData({ field: "objectId", value: currentObjectId }));
    }
  }, [selectedObject, state?.objectId, state?.folderId, folderData]);

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
            <>
              <SelectField
                label="Select Folder"
                name="folderId"
                value={dashboardFolderId || ""}
                onChange={handleChange}
                disabled={!!state?.folderId}
                className="mb-4"
              >
                <option value="">Select Folder</option>
                {myFolders?.length > 0 ? (
                  renderFolderOptions(myFolders)
                ) : (
                  <option disabled>Loading...</option>
                )}
              </SelectField>

              <SelectField
                label="Select Object"
                name="objectId"
                value={
                  state?.objectId
                    ? state?.objectId
                    : selectedObject || dashboardObjectId || ""
                }
                onChange={handleChange}
                disabled={!!state?.objectId || !!selectedObject}
                className="mb-4"
              >
                <option value="">All Object</option>
                {objectData.length > 0 ? (
                  objectData?.map((obj) => (
                    <option key={obj.objectId} value={obj.objectId}>
                      {obj.objectName}
                    </option>
                  ))
                ) : (
                  <option disabled>Loading...</option>
                )}
              </SelectField>

              {/* Dashboard Name Input */}
              <InputField
                label="Dashboard Name"
                type="text"
                name="dashboardName"
                placeholder="Enter Dashboard Name"
                value={dashboardData?.dashboardName || ""}
                onChange={handleChange}
                className={`mb-4 ${
                  dashboardNameMateched
                    ? "border-red-500 text-red-600 font-semibold"
                    : ""
                }`}
              />
              {dashboardNameMateched && (
                <p className="text-red-500 text-sm mt-1" aria-live="polite">
                  DashboardName already exists. Please choose a different name.
                </p>
              )}

              {/* Description Input */}
              <div className="mb-4">
                <label className="text-xs font-semibold uppercase tracking-widest text-text-sub mb-2 block">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Description"
                  value={dashboardData?.description || ""}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg shadow-sm bg-input-bg border-theme text-text-primary placeholder:text-text-sub focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-200"
                  rows="4"
                ></textarea>
              </div>

              {/* Visibility Selection */}
              <div className="mb-6">
                <label className="text-xs font-semibold uppercase tracking-widest text-text-sub mb-2 block">
                  Visibility
                </label>
                <div className="flex items-center space-x-6 mb-6">
                  {["Public", "Private", "Restricted"].map((option, index) => (
                    <label
                      key={index}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="folderType"
                        value={option}
                        checked={dashboardData?.folderType === option}
                        onChange={(e) => {
                          handleChange(e);
                          handleVisibilityChange(option.toLowerCase());
                        }}
                        className="w-4 h-4 text-accent bg-input-bg border-theme focus:ring-accent focus:ring-2"
                      />
                      <span className="capitalize text-text-primary">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>

            <section className="w-full flex justify-end">
              <button
                type="submit"
                className="text-right bg-accent flex cursor-pointer w-fit items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={checkDashboardAvalibale}
              >
                <span className="text-[0.8rem] text-white">Next</span>
                <GrFormNextLink className="w-8 text-white" />
              </button>
            </section>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <MultiSelect
                label="Users"
                required={false}
                options={userData}
                value={dashboardData?.userIds || []}
                onChange={(selectedUserIds) => {
                  dispatch(
                    setDashboardData({
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
                value={dashboardData?.groupIds || []}
                onChange={(selectedGroupIds) => {
                  dispatch(
                    setDashboardData({
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

            {/* Navigation Buttons */}
            <section className="w-full flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setShowList(false)}
                className="px-4 py-2 text-sm text-text-sub hover:text-text-primary transition-colors duration-200 font-medium hover:bg-input-bg rounded-lg"
              >
                ← Back
              </button>
              <CommonButton
                onClick={handleSubmit}
                disabled={checkDashboardAvalibale}
              >
                Next
              </CommonButton>
            </section>
          </>
        )}
      </form>
    </div>
  );
};

export default AddFolder;
