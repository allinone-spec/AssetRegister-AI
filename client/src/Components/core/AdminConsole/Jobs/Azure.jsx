import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../ThemeContext";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import PageLayout from "../../../Common/PageLayout";
import {
  patchRequest,
  postDataRequest,
  getRequest as forConsoleApi,
} from "../../../../Service/Console.service";
import toast from "react-hot-toast";
import { getRequest } from "../../../../Service/api.service";
import { useForm } from "react-hook-form";
import { JobResponseModal } from "../../../Common/JobResponseModal";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";

const fields = [
  { name: "jobName", label: "Job Name", type: "text" },
  { name: "filter", label: "Filter", type: "text" },
  { name: "apiVersion", label: "API Version", type: "text" },
  { name: "clientId", label: "Client ID", type: "text" },
  { name: "clientSecret", label: "Client Secret", type: "text" },
  { name: "tenantId", label: "Tenant ID", type: "text" },
  { name: "resourceGroupName", label: "Resource Group Name", type: "text" },
  { name: "clusterName", label: "Cluster Name", type: "text" },
  { name: "subType", label: "Sub Type", type: "text" },
  { name: "jobType", label: "Job Type", type: "text" },
  { name: "object", label: "Object ID", type: "select" },
  { name: "subscription", label: "Subscription ID", type: "text" },
  {
    name: "type",
    label: "Type",
    type: "select",
    options: ["BasedOn_Subscription"],
  },
  { name: "disable", label: "Disable", type: "select", options: ["yes", "no"] },
  {
    name: "inRegister",
    label: "In Register",
    type: "select",
    options: ["yes", "no"],
  },
];

const requiredFields = [
  "jobName",
  "object",
  "disabled",
  "inRegister",
  "type",
  "upload",
];

const AzureJobForm = ({ routeName }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [triggerField, setTriggerField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [objectLoading, setObjectLoading] = useState(false);
  const [objectIds, setObjectIds] = useState([]);
  const [runLoading, setRunLoading] = useState(false);
  const [subscription, setSubscription] = useState("");
  const [subscriptionId, setSubscriptionId] = useState([]);
  const [titleResponse, setTitleResponse] = useState("");
  const [postScript, setPostScript] = useState("");
  const [showRunJob, setShowRunJob] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const { data } = location?.state || {};
  const [forUpdateData, setforUpdateData] = useState(null);
  const [toggleButton, setToggleButton] = useState("replace");
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
  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    try {
      if (!data?.jobName) return;

      const res = await forConsoleApi(`/jobSchedule/${data.jobName}/view`);
      if (res.status === 200) {
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
    fetchformDatabyJobName();
  }, [location, data?.jobName]);

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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    getValues,
    watch,
  } = useForm({
    defaultValues: {
      ...data,
      disable: "no",
      inRegister: "yes",
    },
  });

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        `${
          location.state && !data?.isNavigateJob
            ? `Update Job /  ${data?.jobName}`
            : "Add Job /  Azure"
        }`,
      ),
    );
  }, [location]);

  const addSubscriptionId = (e) => {
    console.log("subscriptionIds", e);
    e.preventDefault();

    if (subscription.trim() && !subscriptionId?.includes(subscription.trim())) {
      console.log("subscriptionId", subscription.trim());

      setSubscriptionId((prevIds) =>
        Array.isArray(prevIds)
          ? [...prevIds, subscription.trim()]
          : [subscription.trim()],
      );
      setSubscription("");
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      apiVersion: data?.apiVersion,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      clusterName: data?.clientSecret,
      inRegister: data?.inRegister,
      disable: data?.disable,
      filter: data.filter,
      jobName: data?.jobName,
      jobType: data?.jobType,
      objectId: Number(data?.object),
      resourceGroupName: data?.resourceGroupName,
      subType: data?.subType,
      tenantId: Number(data?.tenantId),
      type: data?.type,
      subscriptionId: data.subscriptionId,
    };
    setShowRunJob(false);
    setSaveLoading(true);

    try {
      const response = await postDataRequest("/azure/saveJob", payload);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        setShowRunJob(true);
        reset();
        reset({
          jobName: data.jobName,
        });
        setSubscriptionId([]);
        navigate("/admin-console/saved-jobs");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (forUpdateData) {
      reset({
        jobName: forUpdateData?.jobName || "",
        apiVersion: forUpdateData?.apiVersion || "",
        clientId: forUpdateData?.clientId || "",
        clientSecret: forUpdateData?.clientSecret || "",
        clusterName: forUpdateData?.clusterName || "",
        inRegister: forUpdateData?.inRegister || "",
        disable: forUpdateData?.disable || "",
        filter: forUpdateData?.filter || "",
        jobType: forUpdateData?.jobType || "",
        object: forUpdateData?.objectId || null,
        resourceGroupName: forUpdateData?.resourceGroupName || "",
        subType: forUpdateData?.subType || "",
        subscriptionId: forUpdateData?.subscriptionId || [],
        tenantId: forUpdateData?.tenantId || null,
        type: forUpdateData?.type || "",
      });
      setSubscriptionId(forUpdateData?.subscriptionId);
    }
  }, [forUpdateData, reset]);

  const handleUpdateJob = async (data) => {
    console.log("Data", data, "forUpdateData", forUpdateData);
    setLoading(true);
    const toasteID = toast.loading("Loading...");
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
        if (key === "object") {
          if (Number(data[key]) !== forUpdateData["objectId"]) {
            acc["objectId"] = Number(data[key]);
          }
        } else if (key === "subscriptionId") {
          if (data[key] !== forUpdateData["subscriptionId"]) {
            acc["subscriptionId"] = subscriptionId;
          }
        } else if (data[key] !== forUpdateData[key]) {
          acc[key] = data[key];
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
      // Include triggerButton only when it actually changed
      if (toggleButton !== forUpdateData?.triggerButton) {
        UpdatePayload["triggerButton"] = toggleButton;
      }
      const response = await patchRequest(
        `/azure/${data?.jobName}/updateJob`,
        UpdatePayload,
      );
      if (response.status === 200) {
        toast.success("SuccessFully Updated");
        setTitleResponse(response.data);
        navigate(-1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      toast.dismiss(toasteID);
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
      // const response = await postDataRequest(`/azure/runJob`, payload);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        reset({
          jobName: "",
        });
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
      (!location.state?.data?.jobName || !showRunJob) &&
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
            {[
              { name: "jobName", label: "Job Name", type: "text" },
              { name: "filter", label: "Filter", type: "text" },
              { name: "apiVersion", label: "API Version", type: "text" },
              { name: "clientId", label: "Client ID", type: "text" },
              { name: "clientSecret", label: "Client Secret", type: "text" },
              { name: "tenantId", label: "Tenant ID", type: "text" },
              {
                name: "resourceGroupName",
                label: "Resource Group Name",
                type: "text",
              },
              { name: "clusterName", label: "Cluster Name", type: "text" },
              { name: "subType", label: "Sub Type", type: "text" },
              { name: "jobType", label: "Job Type", type: "text" },
              {
                name: "object",
                label: "Object ID",
                type: "select",
                options: objectIds,
              },
              {
                name: "subscriptionId",
                label: "Subscription ID",
                type: "text",
              },
              {
                name: "type",
                label: "Type",
                type: "select",
                options: ["BasedOn_Subscription"],
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
                    field.name === "object" && (
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
                ) : field.name === "subscriptionId" ? (
                  <div>
                    <div className="flex justify-between">
                      <input
                        type="text"
                        id="subscriptionId"
                        value={subscription || ""}
                        placeholder="Enter Subscription ID"
                        className="w-[80%] p-2 border border-gray-300 rounded-md"
                        onChange={(e) => setSubscription(e.target.value)}
                      />
                      <button
                        onClick={addSubscriptionId}
                        className="py-2 w-[10%] rounded px-2 text-white"
                        style={{ backgroundColor }}
                      >
                        +
                      </button>
                    </div>
                    <ul className="mt-2 text-sm text-gray-600">
                      {subscriptionId?.map((id, index) => (
                        <li key={index}> {id},</li>
                      ))}
                    </ul>
                  </div>
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
          {(data?.jobName || showRunJob) && (
            <div className="mt-3">
              <label>Post Script</label>
              <TextEditor
                setPostScript={setPostScript}
                postScript={data?.postScript}
              />
              {/* <textarea
                  placeholder={`Enter PostScript`}
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

          <div className="w-full mt-6 flex gap-x-2 text-center justify-between">
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
                disabled={saveLoading}
                onClick={handleSubmit(onSubmit)}
                className={`w-[49%] px-6 py-2 ${
                  saveLoading ||
                  (permissionList?.includes(routeName) &&
                    !permissionDetails[routeName]?.hasWriteOnly)
                    ? "opacity-75"
                    : "opacity-100"
                } text-white rounded-md`}
                style={{ backgroundColor }}
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
              style={{ backgroundColor }}
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
        </form>
      </main>
    </PageLayout>
  );
};

// const AzureJobForm = () => {
//   const dispatch = useDispatch();
//   dispatch(setHeadingTitle("Add Jobs / Azure"));
//   return (

//     <DynamicJobForm
//       saveApiUrl='saveJob'
//       updateApiUrl='updateJob'
//       runApiUrl='runJob'
//       fields={fields}
//       objectIdApiUrl='/objects/readAll'
//       requiredFields={requiredFields}
//       form="azure"
//     />
//   )
// }

export default AzureJobForm;
