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
import { useForm } from "react-hook-form";
import { getRequest } from "../../../../Service/api.service";
import { JobResponseModal } from "../../../Common/JobResponseModal";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";
import BackButton from "../../../Common/BackButton";

const AWSVM = ({ routeName, editJob, setEditJob }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [objectloading, setObjectLoading] = useState(false);
  const [titleResponse, setTitleResponse] = useState("");
  const [showRunJob, setShowRunJob] = useState(false);
  const [postScript, setPostScript] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  // const { bgColor } = useTheme();
  // const { backgroundColor } = bgColor;
  const { data } = editJob ? { data: editJob } : location.state || {};
  const [forUpdateData, setforUpdateData] = useState(null);
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const [objectIds, setObjectIds] = useState([]);
  const [triggerField, setTriggerField] = useState(null);

  useEffect(() => {
    if (!editJob)
      dispatch(
        setHeadingTitle(
          `${
            location.state && !data?.isNavigateJob
              ? `Update Job /  ${data?.jobName}`
              : "Add Job /  AWS VM"
          }`,
        ),
      );
  }, [location]);

  const [toggleButton, setToggleButton] = useState("replace");

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

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm({
    defaultValues: {
      ...data,
      disable: "no",
      inRegister: "yes",
    },
  });

  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    try {
      if (!data?.jobName) return; // ✅ Prevents API call if jobName is undefined

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
    } finally {
      toast.dismiss(toastId);
    }
  };

  useEffect(() => {
    if (forUpdateData) {
      Object.keys(forUpdateData).forEach((key) => {
        setValue(key, forUpdateData[key] ?? ""); // Use setValue to update fields
      });
    }
  }, [forUpdateData, setValue]);

  useEffect(() => {
    fetchformDatabyJobName();
  }, [location, data?.jobName]);

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

  const [filters, setFilters] = useState([{ key: "", value: "" }]);
  const [role, setRole] = useState("");

  const addRoleArn = () => {
    if (role.trim() !== "") {
      setValue("roleArn", [...getValues("roleArn"), role]);
      setRole("");
    }
  };

  const removeRoleArn = (index) => {
    setValue(
      "roleArn",
      getValues("roleArn").filter((_, i) => i !== index),
    );
  };

  const addFilterRow = () => setFilters([...filters, { key: "", value: "" }]);
  const removeFilterRow = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleUpdateJob = async (data) => {
    setLoading(true);
    console.log("data", data, "forUpdated", forUpdateData);
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
      if (data[key] !== forUpdateData[key]) {
        if (key === "objectId") {
          acc["objectId"] = Number(data[key]); // Convert "object" to "objectId"
        } else if (key === "roleArn") {
          acc[key] = Array.isArray(data[key]) ? data[key] : [data[key]]; // Ensure roleArn is an array
        } else if (key === "filter") {
          acc["filter"] = Object.keys(data[key] || {}).reduce(
            (filterObj, subKey) => {
              if (
                JSON.stringify(data[key][subKey]) !==
                JSON.stringify(forUpdateData[key]?.[subKey])
              ) {
                filterObj[subKey] = Array.isArray(data[key][subKey])
                  ? data[key][subKey]
                  : [data[key][subKey]];
              }
              return filterObj;
            },
            {},
          );
        } else {
          acc[key] = data[key];
        }
      }
      return acc;
    }, {});

    if (Object.keys(UpdatePayload).length > 0) {
      UpdatePayload["jobName"] = forUpdateData.jobName;
    } else {
      toast.error("No changes detected");
      setLoading(false);
      return;
    }
    UpdatePayload["postScript"] = postScript;
    // Include triggerButton only if changed
    if (toggleButton !== forUpdateData?.triggerButton) {
      UpdatePayload["triggerButton"] = toggleButton; // Add toggle button value
    }
    console.log("UpdatePayload", UpdatePayload);

    try {
      const response = await patchRequest(
        `/file/${data?.jobName}/updateFile`,
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

  const onSubmit = async (data) => {
    if (!data.jobType) {
      toast.error("Select Job Type");
      return;
    }
    if (!data.objectId) {
      toast.error("Select Object ID");
      return;
    }
    setSaveLoading(true);
    setShowRunJob(false);

    try {
      const response = await postDataRequest("/aws/savejob", data);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setShowRunJob(true);
        setTitleResponse(response.data);
        Object.keys(data).forEach((key) => setValue(key, ""));
        setFilters([{ key: "", value: "" }]);
        reset();
        reset({
          jobName: data.jobName,
        });
        navigate("/admin-console/saved-jobs");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setSaveLoading(false);
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
      // const response = await postDataRequest(`/aws/runJob`, payload);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        Object.keys(data).forEach((key) => setValue(key, ""));
        setFilters([{ key: "", value: "" }]);
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
    if (showRunJob || location?.state?.data?.jobName) {
      return;
    }
    if (
      (!location?.state?.data?.jobName || !showRunJob) &&
      (field === "jobName" ||
        field === "jobType" ||
        field === "objectId" ||
        field === "disable")
    ) {
      return { required: `${field} is required` };
    }
    return {};
  };

  const handleChange = (e) => {
    setValue(e.target.name, e.target.value);
    clearErrors(e.target.name);
  };

  const handleJobTypeChange = (e) => {
    setValue("jobType", e.target.value);
    clearErrors("jobType");
  };

  useEffect(() => {
    fetchObjectId();
  }, []);

  return (
    <>
      {/* <div className="p-3">
        <BackButton handleHideForm={setEditJob} />
      </div> */}
      <main className={`mx-auto`}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={`grid w-full gap-6`}>
            {[
              "jobName",
              "accessKeyId",
              "secretAccessKey",
              "objectId",
              "disable",
              "inRegister",
              "jobType",
              "type",
            ].map((key, index) => (
              <div key={index} className="col-span-1">
                <div className=" flex justify-between">
                  <label
                    htmlFor={key}
                    className="block text-sm font-medium mb-1"
                  >
                    {key === "inRegister"
                      ? "In Register"
                      : key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                    *
                  </label>
                  {errors[key] && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors[key].message}
                    </p>
                  )}
                </div>
                {["objectId", "disable", "inRegister", "type"].includes(key) ? (
                  <select
                    {...register(key, getRequired(key))}
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-500"
                    value={
                      location?.state?.data && key === "objectId"
                        ? objectIds?.filter(
                            (object) => object?.objectId == getValues(key),
                          ).objectName || watch("objectId")
                        : key === "disable"
                          ? location?.state?.data?.disable || "no"
                          : key === "inRegister"
                            ? location?.state?.data?.inRegister || "yes"
                            : key === "jobType"
                              ? location?.state?.data?.jobType ||
                                watch(key) ||
                                ""
                              : watch(key) || ""
                    }
                    onChange={
                      key === "jobType" ? handleJobTypeChange : handleChange
                    }
                  >
                    <option value="">
                      {key === "objectId"
                        ? "Select Object ID"
                        : "Select Option"}
                    </option>
                    {key === "objectId" ? (
                      objectloading ? (
                        <option>Loading...</option>
                      ) : (
                        objectIds?.map((option, index) => (
                          <option key={index} value={option.objectId}>
                            {option.objectName}
                          </option>
                        ))
                      )
                    ) : key === "type" ? (
                      ["VM", "Kubernetes"].map((option, i) => (
                        <option key={i} value={option}>
                          {option}
                        </option>
                      ))
                    ) : (
                      ["yes", "no"].map((option, i) => (
                        <option key={i} value={option}>
                          {option}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <input
                    {...register(key, getRequired(key))}
                    placeholder={`Enter ${key}`}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>
            ))}
          </div>
          {/* Role ARN Section */}
          <div className="mt-6">
            <h3
              className="font-medium mb-4 w-full text-semibold p-2 rounded"
              // style={{ backgroundColor }}
            >
              Role ARN
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Enter Role ARN"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="col-span-2 p-2 border border-gray-300 rounded-md"
              />
              <button
                type="button"
                onClick={addRoleArn}
                className="col-span-1 p-2 text-white rounded-md bg-accent"
              >
                +
              </button>
            </div>
            <ul className="mt-4 list-disc pl-5">
              {Array.isArray(watch("roleArn")) &&
                watch("roleArn").map((role, index) => (
                  <li
                    key={index}
                    className="text-gray-700 flex justify-between items-center"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => removeRoleArn(index)}
                      className="ml-2 px-2 text-white rounded-md bg-accent"
                    >
                      ❌
                    </button>
                  </li>
                ))}
            </ul>
          </div>
          {/* Filters Section */}
          <div className="mt-6">
            <h3
              className="font-medium mb-4 w-full text-semibold p-2 rounded"
              // style={{ backgroundColor }}
            >
              Filters
            </h3>
            {filters?.map((filter, index) => (
              <div key={index} className="grid grid-cols-6 gap-4 mt-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={filter.key}
                  onChange={(e) => {
                    const newFilters = [...filters];
                    newFilters[index].key = e.target.value;
                    setFilters(newFilters);
                  }}
                  className="col-span-2 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={filter.value}
                  onChange={(e) => {
                    const newFilters = [...filters];
                    newFilters[index].value = e.target.value;
                    setFilters(newFilters);
                  }}
                  className="col-span-3 p-2 border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={
                    index === filters.length - 1
                      ? addFilterRow
                      : () => removeFilterRow(index)
                  }
                  className={`col-span-1 text-white p-2 rounded-md ${
                    index === filters.length - 1 ? `bg-accent` : "bg-accent"
                  }`}
                >
                  {index === filters.length - 1 ? "+" : "-"}
                </button>
              </div>
            ))}
            {(data?.jobName || showRunJob) && (
              <div className="mt-3">
                <label>Post Script</label>
                <TextEditor
                  setPostScript={setPostScript}
                  postScript={data?.postScript}
                />
                {/* <textarea
                  placeholder={`Enter PostScript`}
                  {...register("postScript",)}
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
          </div>

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
          {/* Submit Button */}
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
                } text-white rounded-md bg-accent hover:bg-accent`}
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
                } text-white rounded-md bg-accent hover:bg-accent`}
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
              onClick={handleSubmit(isScheduleModal)}
              className={`w-[49%] px-6 py-2 ${
                scheduleLoading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
                  ? "opacity-75"
                  : "opacity-100"
              } text-white rounded-md bg-accent hover:bg-accent`}
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
          {/* <JobResponseModal isOpen={titleResponse} onClose={() => setTitleResponse("")} title={titleResponse}>
            <p>Your response to the job application.</p>
          </JobResponseModal> */}
        </form>
      </main>
    </>
  );
};

export default AWSVM;
