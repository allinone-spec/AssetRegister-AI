import React, { useEffect, useState } from "react";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import {
  postDataRequest,
  patchRequest,
  getRequest as forConsoleApi,
} from "../../../../Service/Console.service";
import toast from "react-hot-toast";
import { getRequest } from "../../../../Service/api.service";
import { useForm } from "react-hook-form";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";

const ServiceNow = ({ routeName, editJob, setEditJob }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [triggerField, setTriggerField] = useState(null);

  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [objectLoading, setObjectLoading] = useState(false);
  const [titleResponse, setTitleResponse] = useState("");
  const [postScript, setPostScript] = useState("");
  const [objectIds, setObjectIds] = useState([]);
  const [showRunJob, setShowRunJob] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const [forUpdateData, setforUpdateData] = useState(null);
  const [toggleButton, setToggleButton] = useState("replace");
  const location = useLocation();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const { data } = editJob ? { data: editJob } : location.state || {};

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

  const fieldConfig = [
    { name: "jobName", label: "Job Name", type: "text" },
    { name: "instanceURL", label: "Instance URL", type: "text" },
    {
      name: "serviceNowTableName",
      label: "Service NowTable Name",
      type: "text",
    },
    { name: "clientId", label: "Client ID", type: "text" },
    { name: "clientSecret", label: "Client Secret", type: "text" },
    { name: "username", label: "User Name", type: "text" },
    { name: "password", label: "Password ", type: "text" },
    { name: "tokenType", label: "Token Type", type: "text" },
    { name: "otherField", label: "Other Field", type: "text" },
    { name: "sysparm_offset", label: "SysParm Offset ", type: "number" },
    { name: "sysparm_limit", label: "SysParm Limit", type: "number" },
    { name: "jobType", label: "Job Type", type: "text" },
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
    {
      name: "objectId",
      label: "Object Id",
      type: "select",
      options: objectIds,
    },
  ];

  useEffect(() => {
    if (!editJob)
      dispatch(
        setHeadingTitle(
          `${
            location.state && !data?.isNavigateJob
              ? `Update Job /  ${data?.jobName}`
              : "Add Job /  Service Now"
          }`,
        ),
      );
  }, [location]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    getValues,
  } = useForm({
    defaultValues: {
      ...data,
      disable: "no",
      inRegister: "yes",
    },
  });

  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    console.log("calling API...........................");
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
  console.log("forUpdated", forUpdateData);

  useEffect(() => {
    if (forUpdateData) {
      reset({
        ...forUpdateData,
      });
    }
  }, [forUpdateData, reset]);
  const onSubmit = async (data) => {
    try {
      setSaveLoading(true);
      setShowRunJob(false);
      const response = await postDataRequest("/serviceNow/saveJob", data);
      if (response?.status === 201 || response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        reset();
        reset({
          jobName: data.jobName,
        });
        setShowRunJob(true);
        navigate("/admin-console/saved-jobs");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setSaveLoading(false);
    }
  };
  const handleUpdateJob = async (data) => {
    setLoading(true);
    console.log("data", data, "forUpdated", forUpdateData);

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

      const UpdatePayload = Object.keys(data).reduce((acc, key) => {
        // Check if value is different from the original data
        if (data[key] !== forUpdateData[key]) {
          acc[key] = data[key];
        }
        return acc;
      }, {});

      UpdatePayload["postScript"] = postScript;

      // Include the toggle selection only when it changed
      if (toggleButton !== forUpdateData?.triggerButton) {
        UpdatePayload["triggerButton"] = toggleButton;
      }

      const hasEmptyFields = Object.entries(UpdatePayload).some(
        (value) => value === "" || value === null || value === undefined,
      );
      console.log("upd djnvlkfml;,", UpdatePayload, "");

      if (Object.keys(UpdatePayload).length === 0 || hasEmptyFields) {
        toast.error("No changes detected or some fields are empty");
        setLoading(false);
        return;
      }

      // Ensure jobName is always included when an update is made
      UpdatePayload["jobName"] = forUpdateData.jobName;

      // Send API request
      const response = await patchRequest(
        `/serviceNow/${data.jobName}/updatejob`,
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

  const handleRunjob = async (data) => {
    setRunLoading(true);
    const payload = {
      jobName: data?.jobName,
      postScript,
    };
    try {
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);
      // const response = await postDataRequest(`/serviceNow/runJob`, payload);
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

  const isScheduleModal = () => {
    if (!watch("jobName")) {
      toast.error("First fill Job Name for Schedule Task ");
    }
    setIsScheduleModalOpen(watch("jobName"));
  };

  const handleScheduleJob = async (data) => {
    setTriggerField(data);
  };

  const getRequired = (field) => {
    if (showRunJob || data?.jobName) {
      return;
    }
    if (
      !data?.jobName &&
      (field === "jobName" ||
        field === "objectId" ||
        field === "disable" ||
        field === "inRegister" ||
        field === "username" ||
        field === "instanceURL" ||
        field === "password" ||
        field === "otherField")
    ) {
      return { required: `${field} is required` };
    }
    return {};
  };

  return (
    <>
      <main className={`mx-auto`}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={`grid w-full gap-6`}>
            {fieldConfig?.map((field) => (
              <div key={field.name}>
                <div className="flex justify-between">
                  <label className="block text-sm font-medium mb-1">
                    {field.label}*
                  </label>
                  {errors[field.name] && (
                    <p className="text-red-500 text-sm">
                      {errors[field.name]?.message}
                    </p>
                  )}
                </div>
                {field.type === "select" ? (
                  field.name == "disable" ? (
                    <select
                      {...register(field.name, getRequired(field.name))}
                      className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map((opt, index) => (
                        <option key={index} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.name == "inRegister" ? (
                    <select
                      {...register(field.name, getRequired(field.name))}
                      className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                      value={watch(field.name)}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map((opt, index) => (
                        <option key={index} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.name === "type" ? (
                    <select
                      {...register(field.name, getRequired(field.name))}
                      className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((opt, index) => (
                        <option key={index} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    field.name === "objectId" && (
                      <select
                        value={
                          objectIds?.filter(
                            (object) =>
                              object?.objectId == getValues(field.name),
                          ).objectName || watch("objectId")
                        }
                        {...register(field.name, getRequired(field.name))}
                        className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                      >
                        <option value="">Select {field.label}</option>
                        {objectLoading ? (
                          <option value="" disabled>
                            Loading...
                          </option>
                        ) : (
                          objectIds.map((opt) => (
                            <option key={opt.object} value={opt.objectId}>
                              {opt.objectName}
                            </option>
                          ))
                        )}
                      </select>
                    )
                  )
                ) : (
                  <input
                    type={field.type || "text"}
                    placeholder={`Enter ${field.label}`}
                    {...register(field.name, getRequired(field.name))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>
            ))}
          </div>
          {(data?.jobName || showRunJob) && (
            <div className="mt-3">
              <label>Post Script</label>
              <TextEditor
                setPostScript={setPostScript}
                postScript={data?.postScript}
              />
              {/* <textarea
                placeholder={`Enter PostScript`}
                {...register("postScript", {})}
                className="w-full p-2 border border-gray-300 rounded-md"
              /> */}
            </div>
          )}
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

        {data?.jobName && (
          <ImportModeToggle
            toggleButton={toggleButton}
            handleToggleChange={filterKeys.handleToggleChange}
            isVisible={true}
          />
        )}

        {/* Matched Key and Ignore Key Dropdowns - only shown when Update mode is selected */}
        <FilterKeySelector
          editJob={editJob}
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
              } text-white rounded-md bg-accent`}
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
              } text-white rounded-md bg-accent`}
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
              } ${data?.disable === "yes" ? "bg-gray-400" : "bg-accent"}`}
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
            } text-white rounded-md bg-accent`}
          >
            {runLoading ? "Scheduling" : "Schedule"}
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
    </>
  );
};

export default ServiceNow;
