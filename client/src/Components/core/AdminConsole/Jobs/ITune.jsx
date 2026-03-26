import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import PageLayout from "../../../Common/PageLayout";
import { useTheme } from "../../../../ThemeContext";
import {
  postDataRequest,
  patchRequest,
  getRequest as forConsoleApi,
} from "../../../../Service/Console.service";
import toast from "react-hot-toast";
import { getRequest } from "../../../../Service/api.service";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";

const Regions = ["com", "eu"];

const ITune = ({ routeName }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [triggerField, setTriggerField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [titleResponse, setTitleResponse] = useState("");
  const [postScript, setPostScript] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const [showRunJob, setShowRunJob] = useState(false);
  const [forUpdateData, setforUpdateData] = useState(null);
  const [runLoading, setRunLoading] = useState(false);
  const [objectLoading, setObjectLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [objectIds, setObjectIds] = useState([]);
  const [toggleButton, setToggleButton] = useState("replace");
  const { data } = location?.state || {};
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );

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
    { name: "jobName", label: "Job Name", type: "text", required: true },
    {
      name: "refreshToken",
      label: "Refresh Token",
      type: "text",
      required: true,
    },
    { name: "orgId", label: "Organization ID", type: "text", required: true },
    { name: "reportId", label: "Report ID", type: "text", required: true },
    {
      name: "region",
      label: "Region",
      type: "select",
      required: true,
      options: Regions,
    },
    {
      name: "disable",
      label: "Disabled",
      type: "select",
      required: true,
      options: ["yes", "no"],
    },
    {
      name: "inRegister",
      label: "In Register",
      type: "select",
      required: true,
      options: ["yes", "no"],
    },
    {
      name: "objectId",
      label: "Object Id",
      type: "select",
      required: true,
      options: objectIds,
    },
  ];

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        `${
          location.state && !data?.isNavigateJob
            ? `Update Job /  ${data?.jobName}`
            : "Add Job /  InTune"
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
      disable: "no",
      inRegister: "yes",
    },
  });

  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    setLoading(true); //set loading true.
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
      setLoading(false); // set loading false
    }
  };

  useEffect(() => {
    fetchformDatabyJobName();
  }, [location, data?.jobName]);

  const onSubmit = async (data) => {
    try {
      setSaveLoading(true);
      const response = await postDataRequest("/intune/save-job", data);
      if (response?.status === 201 || response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        setShowRunJob(true);
        reset();
        reset({
          jobName: data?.jobName,
        });
        navigate("/admin-console/saved-jobs");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (forUpdateData) {
      reset({
        ...forUpdateData,
      });
    }
  }, [forUpdateData, reset]);

  const handleRunjob = async (data) => {
    setRunLoading(true);
    const payload = {
      jobName: data?.jobName,
      postScript,
    };
    try {
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);
      // const response = await postDataRequest(`/flexera/runJob`, payload);
      if (response?.status === 200) {
        toast.success(response.data);
        setTitleResponse(response.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Job data not saved");
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

  console.log("forUpdated", forUpdateData);
  console.log("getValues", getValues());
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
        if (data[key] !== forUpdateData[key]) {
          acc[key] = data[key];
        }
        return acc;
      }, {});

      // Always include postScript in the payload
      UpdatePayload["postScript"] = postScript;

      // If the toggle (replace/update) has changed, include it explicitly so
      // toggling import mode without editing other fields will still persist.
      if (toggleButton !== forUpdateData?.triggerButton) {
        UpdatePayload["triggerButton"] = toggleButton;
      }

      // After adding possible triggerButton/postScript, ensure there is at least
      // one changed field to send. Add jobName to identify the job to update.
      if (Object.keys(UpdatePayload).length > 0) {
        UpdatePayload["jobName"] = forUpdateData.jobName;
      } else {
        toast.error("No changes detected");
        setLoading(false);
        return;
      }

      const response = await patchRequest(
        `/intune/${data.jobName}/updatejob`,
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
    if (showRunJob || data?.jobName) {
      return;
    }
    if (
      !data?.jobName &&
      (field === "jobName" ||
        field === "objectId" ||
        field === "disable" ||
        field === "inRegister")
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

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid sm:grid-cols-2 gap-6">
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
                          ).objectName || watch("object")
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

export default ITune;
