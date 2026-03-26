import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import { useTheme } from "../../../../ThemeContext";
import {
  postDataRequest,
  patchRequest,
  getRequest as forConsoleApi,
} from "../../../../Service/Console.service";
import toast from "react-hot-toast";
import { getRequest } from "../../../../Service/api.service";
import { JobResponseModal } from "../../../Common/JobResponseModal";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";

const Regions = ["Ind", "US", "UK"];
const CustomButton = ({
  text,
  onClick,
  loading,
  type,
  background,
  hoverBackground,
}) => (
  <button
    type={type || "button"}
    onClick={onClick}
    className="w-[49%] py-2 text-white rounded-md"
    style={{ backgroundColor: background }}
    onMouseEnter={(e) => (e.target.style.backgroundColor = hoverBackground)}
    onMouseLeave={(e) => (e.target.style.backgroundColor = background)}
  >
    {loading ? `${text}..` : text}
  </button>
);

const ActiveDirectory = ({ routeName }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = location?.state || {};
  const [triggerField, setTriggerField] = useState(null);
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [objectLoading, setObjectLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [titleResponse, setTitleResponse] = useState("");
  const [postScript, setPostScript] = useState("");
  const [objectIds, setObjectIds] = useState([]);
  const [showRunJob, setShowRunJob] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [forUpdateData, setforUpdateData] = useState(null);
  const [toggleButton, setToggleButton] = useState("replace");
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  useEffect(() => {
    dispatch(
      setHeadingTitle(
        `${
          location.state && !data?.isNavigateJob
            ? `Update Job /  ${data?.jobName}`
            : "Add Job /  Active Directory"
        }`,
      ),
    );
  }, [dispatch]);

  useEffect(() => {
    const fetchObjectId = async () => {
      setObjectLoading(true);
      try {
        const res = await getRequest("/objects/readAll");
        if (res.status === 200) {
          setObjectIds(res?.data || []);
        }
      } catch (error) {
        console.error("Error fetching object IDs", error);
        setObjectIds([]);
      } finally {
        setObjectLoading(false);
      }
    };
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

  const formFields = [
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
      name: "objectId",
      label: "Object ID",
      type: "select",
      required: true,
      options: objectIds,
    },
    {
      name: "disabled",
      label: "Disable",
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
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm({
    defaultValues: {
      jobName: "",
      refreshToken: "",
      orgId: "",
      reportId: "",
      region: "",
      objectId: "",
      disabled: "no",
      inRegister: "yes",
    },
  });

  const isScheduleModal = () => {
    setIsScheduleModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSaveLoading(true);
    setShowRunJob(false);
    console.log("Submitting Data:", data);

    try {
      const response = await postDataRequest("/activedirectory/save-job", data);
      console.log("API Response:", response);

      if (response?.status === 201 || response?.status === 200) {
        // Ensure path is a string before splitting
        if (typeof data.path === "string") {
          const segments = data.path.split("/");
          console.log("File Path Segments:", segments);
        } else {
          console.error("Error: 'path' is not a string:", data.path);
        }

        setShowRunJob(true);
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        reset();
        reset({
          jobName: data?.jobName,
        });
        navigate("/admin-console/saved-jobs");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setSaveLoading(false);
    }
  };

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
  const handleRunjob = async (data) => {
    setRunLoading(true);
    console.log("Running Job with Data:", data);
    const payload = {
      jobName: data?.jobName,
      postScript,
    };
    try {
      // const response = await postDataRequest(
      //   `/activedirectory/write-datarunJob`,
      //   payload,
      // );
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);
      console.log("Response:", response);
      if (response?.status === 201 || response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);

        reset();
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setRunLoading(false);
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

      const hasEmptyFields = Object.entries(UpdatePayload).some(
        (value) => value === "" || value === null || value === undefined,
      );

      if (Object.keys(UpdatePayload).length === 0 || hasEmptyFields) {
        toast.error("No changes detected or some fields are empty");
        setLoading(false);
        return;
      }

      // Ensure jobName is always included when an update is made
      UpdatePayload["jobName"] = forUpdateData.jobName;

      UpdatePayload["postScript"] = postScript;
      // Include triggerButton only when it changed
      if (toggleButton !== forUpdateData?.triggerButton) {
        UpdatePayload["triggerButton"] = toggleButton;
      }

      // Send API request
      const response = await patchRequest(
        `/activedirectory/${data.jobName}/updatejob`,
        UpdatePayload,
      );

      if (response?.status === 200) {
        toast.success("Successfully Updated");
        setTitleResponse(response.data);
        navigate(-1);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleJob = async (data) => {
    setTriggerField(data);
  };

  const getRequired = (field) => {
    if (showRunJob) {
      return;
    }
    if (
      (!location.state || !showRunJob) &&
      (field === "jobName" ||
        field === "jobType" ||
        field === "object" ||
        field === "accessKeyId" ||
        field === "secretAccessKey" ||
        field === "disable" ||
        field === "type" ||
        field === "upload")
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
          <div className="grid sm:grid-cols-2 grid-cols-1 gap-6">
            {formFields.map((field) => (
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
                  <select
                    {...register(field.name, getRequired(field.name))}
                    className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                  >
                    <option value="">Select {field.label}</option>
                    {field.name === "objectId" && objectLoading ? (
                      <option value="" disabled>
                        Loading...
                      </option>
                    ) : (
                      field.options.map((opt, index) => (
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
                  <input
                    type={field.type}
                    placeholder={`Enter ${field.label}`}
                    {...register(field.name, getRequired(field.name))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
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
            ))}
          </div>
          {data?.jobName && (
            <div className="mt-3">
              <label>Post Script</label>
              <TextEditor
                setPostScript={setPostScript}
                postScript={data?.postScript}
              />
              {/* //   <textarea
                  //     placeholder={`Enter PostScript`}
                  //     {...register('postScript', { required: `PostScript is required` })}
                  //     className="w-full p-2 border border-gray-300 rounded-md"
                  //   />                     */}
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
              onClick={handleSubmit(isScheduleModal)}
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
          ></ScheduleJobModal>
          {/* <JobResponseModal
            isOpen={titleResponse}
            onClose={() => setTitleResponse('')}
            title={titleResponse}
          >
            <p>Your response to the job application.</p>
          </JobResponseModal> */}
        </form>
      </main>
    </PageLayout>
  );
};

export default ActiveDirectory;
