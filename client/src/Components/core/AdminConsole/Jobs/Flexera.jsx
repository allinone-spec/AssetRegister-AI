import { useEffect, useState } from "react";
import { useTheme } from "../../../../ThemeContext";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import {
  postDataRequest,
  patchRequest,
} from "../../../../Service/Console.service";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { getRequest } from "../../../../Service/api.service";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import { getRequest as forConsoleApi } from "../../../../Service/Console.service";
import BackButton from "../../../Common/BackButton";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";

const Flexera = ({ routeName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { bgColor } = useTheme();
  const [triggerField, setTriggerField] = useState(null);

  const [saveLoading, setSaveLoading] = useState("");
  const { backgroundColor } = bgColor;
  const [runLoading, setRunLoading] = useState(false);
  const [objectIds, setObjectIds] = useState([]);
  const [objectLoading, setObjectLoading] = useState(false);
  const [postScript, setPostScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [titleResponse, setTitleResponse] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const [forUpdateData, setforUpdateData] = useState(null);
  const [showRunJob, setShowRunJob] = useState(false);
  const [toggleButton, setToggleButton] = useState("replace");
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const { data } = location.state || {};

  // Use the filter keys hook
  const filterKeys = useFilterKeys({
    jobName: data?.jobName,
    tableName: data?.ACTableName,
    filterId: data?.filterId,
    toggleButton,
    setToggleButton,
  });

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        `${
          location.state && !data?.isNavigateJob
            ? `Update Job /  ${data?.jobName}`
            : "Add Job /  Flexera"
        }`,
      ),
    );
  }, [location]);

  useEffect(() => {
    if (data?.postScript) setPostScript(data.postScript);
    if (data?.triggerButton) setToggleButton(data.triggerButton);
  }, [data?.postScript, data?.triggerButton]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      disable: "no",
      inRegister: "yes",
      ...data,
    },
  });

  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchformDatabyJobName();
  }, [location, data?.jobName]);

  useEffect(() => {
    if (forUpdateData) {
      reset({
        inRegister: forUpdateData.inRegister || "",
        disable: forUpdateData.disable ?? null,
        jobName: forUpdateData.jobName || "",
        jobType: forUpdateData.jobType || "",
        objectId: Number(forUpdateData.objectId) || null,
        orgId: forUpdateData.orgId || "",
        refreshToken: forUpdateData.refreshToken || "",
        region: forUpdateData.region || "",
        reportId: forUpdateData.reportId || "",
      });
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
    setSaveLoading(true);
    setShowRunJob(false);
    const payload = {
      refreshToken: data.refreshToken || "",
      orgId: data.orgId || "",
      reportId: data.reportId || "",
      region: data.region || "",
      jobName: data.jobName || "",
      jobType: data.jobType || "",
      disable: data.disable || "",
      inRegister: data.inRegister || "",
      objectId: Number(data.objectId) || null,
    };
    try {
      const response = await postDataRequest("/flexera/savejob", payload);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        setShowRunJob(true);
        reset();
        reset({ jobName: data?.jobName });
        navigate("/admin-console/saved-jobs");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateJob = async (data) => {
    setLoading(true);

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

      UpdatePayload["postScript"] = postScript;
      UpdatePayload["triggerButton"] = toggleButton; // Add toggle button value

      if (Object.keys(UpdatePayload).length > 0) {
        UpdatePayload["jobName"] = forUpdateData.jobName;
      } else {
        toast.error("No changes detected");
        setLoading(false);
        return;
      }

      const response = await patchRequest(
        `/flexera/${data.jobName}/updatejob`,
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

    // Validate matched and ignore keys when in update mode
    if (toggleButton === "update") {
      const isValid = await filterKeys.saveFilterSettings();
      if (!isValid) {
        setRunLoading(false);
        return;
      }
    }

    const payload = {
      jobName: data?.jobName,
      postScript,
      // triggerButton: toggleButton,
      // matchedKey:
      //   toggleButton === "update" ? filterKeys.matchedKey.join(",") : "",
      // ignoreKey:
      //   toggleButton === "update" ? filterKeys.ignoreKey.join(",") : "",
    };

    try {
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);
      // const response = await postDataRequest(`/flexera/runJob`, payload);
      if (response?.status === 200) {
        toast.success(response.data);
        setTitleResponse(response.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Job not saved");
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

  const Regions = ["com", "eu"];

  const getRequired = (field) => {
    if (showRunJob || location?.state?.data?.jobName) {
      return;
    }
    if (
      !location.state?.data?.jobName &&
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
        <div className="mb-2">
          <BackButton />
        </div>
        <p className="text-gray-500 mb-4 text-[0.9rem]">
          Please Fill All Details
        </p>
        <hr className="border-t border-gray-300 my-4" />
        <form
          onSubmit={handleSubmit(location.state ? handleUpdateJob : onSubmit)}
        >
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { name: "jobName", label: "Job Name", type: "text" },
              { name: "refreshToken", label: "Refresh Token", type: "text" },
              { name: "orgId", label: "Organization ID", type: "text" },
              { name: "reportId", label: "Report ID", type: "text" },
              {
                name: "region",
                label: "Region",
                type: "select",
                options: Regions,
              },
              {
                name: "objectId",
                label: "Object ID",
                type: "select",
                options: objectIds,
              },
              {
                name: "disable",
                label: "Disable",
                type: "select",
                options: ["yes", "no"],
              },
              {
                name: "inRegister",
                label: "In Register",
                type: "select",
                options: ["yes", "no"],
              },
            ].map((field) => (
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
                  ) : field.name === "region" ? (
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
            <div className="mt-3">
              <label>Post Script</label>
              <TextEditor
                setPostScript={setPostScript}
                postScript={data?.postScript}
              />
            </div>
          )}

          {/* Import Mode Toggle using the reusable component */}
          <ImportModeToggle
            toggleButton={toggleButton}
            handleToggleChange={filterKeys.handleToggleChange}
          />

          {/* Filter Key Selector using the reusable component */}
          <FilterKeySelector
            matchedKey={filterKeys.matchedKey}
            setMatchedKey={filterKeys.setMatchedKey}
            ignoreKey={filterKeys.ignoreKey}
            setIgnoreKey={filterKeys.setIgnoreKey}
            columnOptions={filterKeys.columnOptions}
            isVisible={toggleButton === "update"}
          />

          <div className="w-full mt-6 flex gap-x-2 text-center justify-between">
            {location.state && !data?.isNavigateJob ? (
              <button
                disabled={
                  loading ||
                  (permissionList?.includes(routeName) &&
                    !permissionDetails[routeName]?.hasWriteOnly)
                }
                onClick={handleSubmit(handleUpdateJob)}
                className={`w-[49%] sm:px-6 py-2 ${
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
                className={`w-[49%] sm:px-6 py-2 ${
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
              className={`w-[49%] sm:px-6 py-2 ${
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
        </form>
      </main>
    </PageLayout>
  );
};

export default Flexera;
