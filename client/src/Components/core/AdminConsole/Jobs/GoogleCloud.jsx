import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../ThemeContext";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import PageLayout from "../../../Common/PageLayout";
import {
  postDataRequest,
  patchRequest,
  getRequest as forConsoleApi,
} from "../../../../Service/Console.service";

import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { getRequest } from "../../../../Service/api.service";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";

const GoogleCloud = ({ routeName }) => {
  const location = useLocation();

  const { data } = location?.state || {};
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
    getValues,
  } = useForm({
    defaultValues: {
      disable: "no",
      inRegister: "yes",
      ...data,
    },
  });

  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [objectLoading, setObjectLoading] = useState(false);
  const [projectIds, setProjectIds] = useState([]);
  const [projectIdError, setProjectIdError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [postScript, setPostScript] = useState("");
  const [titleResponse, setTitleResponse] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const dispatch = useDispatch();
  const [objectIds, setObjectIds] = useState([]);
  const [showRunJob, setShowRunJob] = useState(false);
  const [forUpdateData, setforUpdateData] = useState(null);
  const navigate = useNavigate();
  const [triggerField, setTriggerField] = useState(null);
  const [toggleButton, setToggleButton] = useState("replace");
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const fieldConfig = [
    { name: "jobName", type: "text" },
    {
      name: "authenticationType",
      type: "select",
      options: ["service_account"],
    },
    { name: "filter", type: "text" },
    {
      name: "dataType",
      type: "select",
      options: [
        "Cloud_SQL_Instance",
        "Compute_Engine_API",
        "Kubernetes_clusters",
        "Kubernetes_pods",
      ],
    },
    { name: "assetTypes", type: "text" },
    { name: "pageSize", type: "text" },
    { name: "pageToken", type: "text" },
    { name: "query", type: "text" },
    {
      name: "parent",
      type: "select",
      options: ["PROJECT_ID", "FOLDER_ID", "ORGANIZATION_ID"],
    },
    { name: "folderId", type: "text" },
    { name: "organizationId", type: "text" },
    { name: "clientSecret", type: "text" },
    { name: "clusterAPiServer", type: "text" },
    {
      name: "disable",
      label: "Disabled",
      type: "select",
      options: ["yes", "no"],
    },
    {
      name: "inRegister",
      label: " In Register",
      type: "select",
      options: ["yes", "no"],
    },
    { name: "objectId", type: "select", options: objectIds },
    { name: "file", type: "file" },
    { name: "projectId", type: "text" },
  ];
  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    //set loading true.
    try {
      if (!data?.jobName) return;
      const res = await forConsoleApi(`/jobSchedule/${data.jobName}/view`);
      if (res.status === 200) {
        console.log("Location Form data:", res.data);
        const parsedData = JSON.parse(res?.data.jsonData);
        setforUpdateData(parsedData);
        if (parsedData?.triggerButton) {
          setToggleButton(parsedData.triggerButton);
        }
      }
    } catch (error) {
      console.error("Error fetching object IDs:", error);
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      toast.dismiss(toastId);
    }
  };

  useEffect(() => {
    fetchformDatabyJobName();
  }, [location, data?.jobName]);

  const filterKeys = useFilterKeys({
    jobName: data?.jobName,
    tableName: data?.ACTableName,
    filterId: data?.filterId,
    toggleButton,
    setToggleButton,
  });

  useEffect(() => {
    if (data?.postScript) setPostScript(data.postScript);
    if (data?.triggerButton) setToggleButton(data.triggerButton);
  }, [data?.postScript, data?.triggerButton]);

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        `${
          location.state && !data?.isNavigateJob
            ? `Update Job /  ${data?.jobName}`
            : "Add Job /  Google Cloud"
        }`,
      ),
    );
  }, [location]);

  console.log("forUpdated", forUpdateData);
  useEffect(() => {
    if (forUpdateData) {
      reset({
        assetTypes: forUpdateData.assetTypes || "",
        authenticationType: forUpdateData.authenticationType || "",
        authorizationCode: forUpdateData.authorizationCode || null,
        clientId: forUpdateData.clientId || "",
        clientSecret: forUpdateData.clientSecret || "",
        clusterAPiServer: forUpdateData.clusterAPiServer || "",
        inRegister: forUpdateData.inRegister || "yes",
        dataType: forUpdateData.dataType || "Json",
        disable: forUpdateData.disable || "no",
        filter: forUpdateData.filter || "",
        folderId: forUpdateData.folderId || "",
        googleCloudFile: forUpdateData.googleCloudFile || null,
        jobName: forUpdateData.jobName || "",
        jobType: forUpdateData.jobType || "",
        objectId: forUpdateData.objectId || null, // Ensure it's a number
        organizationId: forUpdateData.organizationId || "",
        pageSize: forUpdateData.pageSize || "",
        pageToken: forUpdateData.pageToken || "",
        parent: forUpdateData.parent || "",
        projectId: forUpdateData.projectId || [], // Ensure it's an array
        query: forUpdateData.query || "",
        registrationId: forUpdateData.registrationId || null,
      });

      setProjectIds(forUpdateData?.projectId);
    }
  }, [forUpdateData, reset]);

  const fetchObjectId = async () => {
    setObjectLoading(true);
    try {
      const res = await getRequest("/objects/readAll");
      if (res.status === 200) {
        setObjectIds(res.data || []);
      }
    } catch (error) {
      console.error("Error fetching object IDs", error);
      setObjectIds([]);
    } finally {
      setObjectLoading(false);
    }
  };
  useEffect(() => {
    fetchObjectId();
  }, []);

  const onSubmit = async (data) => {
    if (projectIds.length === 0) {
      toast.error("At least one projectId is required.");
      return;
    }

    setSaveLoading(true);

    const formattedData = {
      projectId: projectIds,
      jobName: data.jobName,
      authenticationType: data.authenticationType || "",
      filter: data.filter || "",
      dataType: data.dataType,
      assetTypes: data.assetTypes || "",
      pageSize: data.pageSize || "",
      pageToken: data.pageToken || "",
      query: data.query || "",
      parent: data.parent || "",
      folderId: data.folderId || "",
      organizationId: data.organizationId || "",
      clientId: data.clientId || "",
      clientSecret: data.clientSecret || "",
      clusterAPiServer: data.clusterAPiServer || "",
      objectId: Number(data.objectId),
      disable: data.disable,
      inRegister: data.inRegister,
    };

    const formDataToSend = new FormData();
    formDataToSend.append("json", JSON.stringify(formattedData));

    if (data.file && data.file.length > 0) {
      formDataToSend.append("file", data.file[0]);
    }
    setShowRunJob(false);

    try {
      const response = await postDataRequest(
        "/googleCloud/saveJob",
        formDataToSend,
      );
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        setShowRunJob(true);
        reset();
        reset({ jobName: data.jobName });
        setProjectIds([]);
        navigate("/admin-console/saved-jobs");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAdd = () => {
    const newProjectId = document.getElementById("projectIdInput").value;
    if (newProjectId.trim() !== "") {
      setProjectIds([...projectIds, newProjectId]);
      setValue("projectId", ""); // Clear input field
      setProjectIdError(""); // Clear error when adding a valid projectId
    }
  };

  const isScheduleModal = () => {
    if (!watch("jobName")) {
      toast.error("First fill Job Name for Schedule Task ");
    }
    setIsScheduleModalOpen(watch("jobName"));
  };

  const handleScheduleJob = async (data) => {
    setTriggerField(data);
  };

  const handleRunjob = async (data) => {
    setRunLoading(true);
    const payload = {
      jobName: data?.jobName,
      postScript,
    };
    try {
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);
      // const response = await postDataRequest(`/googleCloud/runJob`, payload);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setRunLoading(false);
    }
  };
  const handleUpdateJob = async (data) => {
    setLoading(true);
    console.log("data", data, "forUpdated", forUpdateData);

    // Validation for required fields based on "parent"
    if (
      data["parent"] === "PROJECT_ID" &&
      (!data["projectId"] || data["projectId"].length === 0)
    ) {
      toast.error("Project ID cannot be empty");
      setLoading(false);
      return;
    } else if (
      data["parent"] === "FOLDER_ID" &&
      (!data["folderId"] || data["folderId"].trim() === "")
    ) {
      toast.error("Folder ID cannot be empty");
      setLoading(false);
      return;
    } else if (
      data["parent"] === "ORGANIZATION_ID" &&
      !data["organizationId"]
    ) {
      toast.error("Organization ID cannot be empty");
      setLoading(false);
      return;
    }

    try {
      // Save filter settings if in update mode
      if (toggleButton === "update") {
        try {
          // Fetch AR Mapping data to get additional required fields
          const arMapping = await forConsoleApi(
            `/filter/${location?.state?.data?.filterId}/get`,
          );

          // Prepare additional data for filter payload
          const additionalData = {
            JobId: location?.state?.data?.id,
            primaryKey: arMapping?.data?.primaryKey || "",
            secondaryKey: arMapping?.data?.secondaryKey || "",
            dataTypeChanges:
              JSON.parse(arMapping?.data?.changeDataTypeColumns) || [],
            ignoreColumns: JSON.parse(arMapping?.data?.deleteColumns) || [],
            renameColumns: JSON.parse(arMapping?.data?.renameColumns) || [],
          };

          // Use the hook to save filter settings
          const filterSuccess =
            await filterKeys.saveFilterSettings(additionalData);
          if (!filterSuccess) return;
        } catch (filterError) {
          console.error("Error saving filter settings:", filterError);
          toast.error("Job was updated but filter settings could not be saved");
        }
      }

      // Filter out only changed fields
      const UpdatePayload = Object.keys(data).reduce((acc, key) => {
        if (data[key] !== forUpdateData[key]) {
          acc[key] = data[key]; // Only add changed fields
        }

        // Ensure 'file' is only added if it's not empty/null
        if (
          key === "file" &&
          data["file"] &&
          Object.keys(data["file"]).length > 0
        ) {
          acc[key] = data["file"];
        }

        return acc;
      }, {});
      UpdatePayload["postScript"] = postScript;
      // If there are no changes, show a toast and return
      if (Object.keys(UpdatePayload).length > 0) {
        UpdatePayload["jobName"] = forUpdateData.jobName;
      } else {
        toast.error("No changes detected");
        setLoading(false);
        return;
      }
      // Always include 'jobName' if something is updated
      UpdatePayload["jobName"] = forUpdateData.jobName;
      // Include triggerButton only when it changed
      if (toggleButton !== forUpdateData?.triggerButton) {
        UpdatePayload["triggerButton"] = toggleButton;
      }

      // Send API request
      const response = await patchRequest(
        `/googleCloud/${data.jobName}/updatejob`,
        UpdatePayload,
      );
      if (response?.status === 200) {
        toast.success("Successfully Updated");
        setTitleResponse(response.data);
        navigate(-1);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setLoading(false);
    }
  };

  const getRequired = (field) => {
    if (showRunJob || location?.state?.data?.jobName) {
      return;
    }
    if (
      !location?.state?.data?.jobName &&
      (field === "jobName" ||
        field === "objectId" ||
        field === "disable" ||
        field === "inRegister" ||
        field === "authenticationType" ||
        field === "dataType" ||
        field === "parent")
    ) {
      return { required: `${field} is required` };
    }
    return {};
  };
  return (
    <PageLayout>
      <main className="p-6 sm:w-[80%] mx-auto">
        <p className="text-gray-500 mb-4 text-[0.9rem]">
          Please Fill All Details
        </p>
        <hr className="border-t border-gray-300 my-4" />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid sm:grid-cols-2 gap-6"
        >
          {fieldConfig?.map((field, index) => (
            <div
              key={index}
              className={`col-span-${field.type === "file" ? "1" : "1"}`}
            >
              <div className="flex justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.name
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (char) => char.toUpperCase())}{" "}
                  {field.required ? "*" : ""}
                </label>
                {errors[field.name] && (
                  <p className="text-red-500 text-sm">{`${field.name} is required`}</p>
                )}
              </div>
              {field.name === "projectId" ? (
                <div className="w-full flex flex-col gap-3">
                  <div className="flex justify-between gap-3">
                    <input
                      type="text"
                      id="projectIdInput"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                    />
                    <p
                      className="w-[15%] py-1.5 text-center text-white rounded-lg cursor-pointer"
                      style={{ backgroundColor }}
                      onClick={handleAdd}
                    >
                      +
                    </p>
                  </div>
                  {projectIdError && (
                    <p className="text-red-500 text-sm">{projectIdError}</p>
                  )}
                  {projectIds.length > 0 && (
                    <div className="mt-2">
                      {projectIds.map((id, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-gray-100 p-2 rounded-md"
                        >
                          <span className="text-gray-700">{id}</span>
                          <button
                            type="button"
                            className="text-red-500 text-sm"
                            onClick={() =>
                              setProjectIds(
                                projectIds.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : field.type === "select" ? (
                field.name === "objectId" ? (
                  <select
                    value={
                      objectIds?.filter(
                        (object) => object?.objectId == getValues(field.name),
                      ).objectName || watch("objectId")
                    }
                    {...register(field.name, getRequired(field.name))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Object ID</option>
                    {objectLoading ? (
                      <option value="" disabled>
                        Loading...
                      </option>
                    ) : (
                      objectIds?.map((opt) => (
                        <option
                          key={index}
                          value={field.name === "objectId" ? opt.objectId : opt}
                        >
                          {field.name === "objectId" ? opt.objectName : opt}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <select
                    {...register(field.name, getRequired(field.name))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                  >
                    <option value="">Select {field.name} ID</option>
                    {field?.options?.map((opt) => (
                      <option key={index} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )
              ) : field.type === "file" ? (
                <input
                  type="file"
                  {...register(field.name, getRequired(field.name))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                />
              ) : (
                <input
                  type={field.type}
                  placeholder={`${field.name} `}
                  {...register(field.name, getRequired(field.name))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                />
              )}
            </div>
          ))}
          {triggerField && (
            <div>
              <label>Trigger</label>
              <input
                type="text"
                value={triggerField || ""}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </form>
        {(data?.jobName || showRunJob) && (
          <div className="mt-3">
            <label>Post Script</label>
            <TextEditor
              setPostScript={setPostScript}
              postScript={data?.postScript}
            />
            {/* <textarea
                placeholder={`Enter PostScript}`}
                {...register('postScript',)}
                className="w-full p-2 border border-gray-300 rounded-md"
              /> */}
          </div>
        )}

        {data?.jobName && (
          <ImportModeToggle
            toggleButton={toggleButton}
            handleToggleChange={filterKeys.handleToggleChange}
            isVisible={true}
          />
        )}

        {/* Matched Key and Ignore Key Dropdowns - only shown when Update mode is selected */}
        <FilterKeySelector
          matchedKey={filterKeys.matchedKey}
          setMatchedKey={filterKeys.setMatchedKey}
          ignoreKey={filterKeys.ignoreKey}
          setIgnoreKey={filterKeys.setIgnoreKey}
          columnOptions={filterKeys.columnOptions}
          isVisible={toggleButton === "update"}
        />

        <div className="mt-6 flex w-full gap-x-2 text-center justify-between">
          {location.state && !data?.isNavigateJob ? (
            <button
              disabled={
                loading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
              }
              onClick={handleSubmit(handleUpdateJob)}
              className={`w-[49%] px-6 py-2 ${
                loading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
                  ? "opacity-75"
                  : "opacity-100"
              } text-white rounded-md`}
              style={{ backgroundColor: backgroundColor }}
              onMouseEnter={(e) =>
                (e.target.style.backgroundColor = backgroundColor)
              }
            >
              {loading ? "Updating..." : "Update Job"}
            </button>
          ) : (
            <button
              disabled={
                saveLoading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
              }
              onClick={handleSubmit(onSubmit)}
              className={`w-[49%] px-6 py-2 ${
                saveLoading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
                  ? "opacity-75"
                  : "opacity-100"
              } text-white rounded-md`}
              style={{ backgroundColor: backgroundColor }}
              onMouseEnter={(e) =>
                (e.target.style.backgroundColor = backgroundColor)
              }
            >
              {saveLoading ? "Saving" : "Save"}
            </button>
          )}
          {(location?.state || showRunJob) && !data?.isNavigateJob && (
            <button
              disabled={
                runLoading ||
                data?.disable === "yes" ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
              }
              onClick={handleSubmit(handleRunjob)}
              className={`w-[49%] sm:px-6 py-2 ${
                runLoading ||
                data?.disable === "yes" ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
                  ? "opacity-75"
                  : "opacity-100"
              } text-white rounded-md ${
                data?.disable === "yes" ? "cursor-not-allowed" : ""
              }`}
              style={{
                backgroundColor:
                  data?.disable === "yes" ? "#9CA3AF" : backgroundColor,
              }}
              onMouseEnter={(e) => {
                if (!data?.disable === "yes") {
                  e.target.style.backgroundColor = backgroundColor;
                }
              }}
            >
              {runLoading ? "Running" : "Run Job"}
            </button>
          )}
          <button
            disabled={
              scheduleLoading ||
              (permissionList?.includes(routeName) &&
                !permissionDetails[routeName]?.hasWriteOnly)
            }
            onClick={isScheduleModal}
            className={`w-[49%] px-6 py-2 ${
              scheduleLoading ||
              (permissionList?.includes(routeName) &&
                !permissionDetails[routeName]?.hasWriteOnly)
                ? "opacity-75"
                : "opacity-100"
            } text-white rounded-md`}
            style={{ backgroundColor: backgroundColor }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = backgroundColor)
            }
          >
            {scheduleLoading ? "Scheduling" : "Schedule"}
          </button>
        </div>
        <ScheduleJobModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(null)}
          handleSubmit={handleSubmit}
          handleScheduleJob={handleScheduleJob}
        />
        {/* <JobResponseModal
          isOpen={titleResponse}
          onClose={() => setTitleResponse('')}
          title={titleResponse}
        >
          <p>Your response to the job application.</p>
        </JobResponseModal> */}
      </main>
    </PageLayout>
  );
};

export default GoogleCloud;
