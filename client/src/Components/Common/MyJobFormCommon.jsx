import React, { useEffect, useState } from "react";

import { useDispatch } from "react-redux";
import { patchRequest, postDataRequest } from "../../Service/Console.service";
import toast from "react-hot-toast";
import { getRequest } from "../../Service/api.service";
import { useForm } from "react-hook-form";

import { useLocation } from "react-router-dom";
import { useTheme } from "../../ThemeContext";
import PageLayout from "./PageLayout";
import { setHeadingTitle } from "../../redux/Slices/HeadingTitle";
import { ScheduleJobModal } from "./ScheduleJobModal";
import { JobResponseModal } from "./JobResponseModal";

const DynamicJobForm = ({
  saveApiUrl,
  updateApiUrl,
  runApiUrl,
  fields,
  objectIdApiUrl,
  requiredFields = [
    "jobName",
    "object",
    "disabled",
    "dataConsole",
    "type",
    "upload",
  ],
  form,
}) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [loading, setLoading] = useState(false);
  const [objectLoading, setObjectLoading] = useState(false);
  const [objectIds, setObjectIds] = useState([]);
  const [runLoading, setRunLoading] = useState(false);
  const [subscriptionIds, setSubscriptionIds] = useState([]);
  const [titleResponse, setTitleResponse] = useState("");
  const [showRunJob, setShowRunJob] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const { data } = location?.state || {};
  const fetchObjectId = async () => {
    if (!objectIdApiUrl) return;

    setObjectLoading(true);
    try {
      const res = await getRequest(objectIdApiUrl);
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
    if (objectIdApiUrl) {
      fetchObjectId();
    }
  }, [objectIdApiUrl]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      ...data,
      disable: "no",
      dataConsole: "yes",
    },
  });

  const addSubscriptionId = (e) => {
    e.preventDefault();
    const newId = document.getElementById("subscriptionInput").value.trim();
    if (newId && !subscriptionIds.includes(newId)) {
      setSubscriptionIds([...subscriptionIds, newId]);
      setValue("subscriptionId", [...subscriptionIds, newId]);
      document.getElementById("subscriptionInput").value = "";
    }
  };

  const onSubmit = async (data) => {
    setShowRunJob(false);
    setLoading(true);
    try {
      const payload = {};
      fields.forEach((field) => {
        if (field.name === "objectId" && data.objectId) {
          payload[field.name] = Number(data[field.name]);
        } else if (field.name === "subscriptionId" && data.subscriptionId) {
          payload[field.name] = data.subscriptionId;
        } else if (data[field.name]) {
          payload[field.name] = data[field.name];
        }
      });
      const response = await postDataRequest(`/${form}/${saveApiUrl}`, payload);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        setShowRunJob(true);
        reset({ jobName: data.jobName });
        setSubscriptionIds([]);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setLoading(false);
    }
  };

  const [initialData, setInitialData] = useState(data || {});
  const handleUpdateJob = async (updatedData) => {
    try {
      const changedFields = Object.keys(updatedData).reduce((acc, key) => {
        if (updatedData[key] !== initialData[key]) {
          acc[key] = updatedData[key];
        }
        return acc;
      }, {});

      if (Object.keys(changedFields).length === 0) {
        toast.error("No changes detected.");
        return;
      }

      await patchRequest(
        `/${form}/${updatedData?.jobName}/updateJob`,
        changedFields,
      );
      toast.success("Job updated successfully.");
      setInitialData(updatedData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update job.");
    }
  };

  const handleRunjob = async (data) => {
    setRunLoading(true);
    const payload = {
      jobName: data?.jobName,
      postScript: data?.postScript,
    };
    try {
      // const response = await postDataRequest(
      //     `/${form}/${runApiUrl}?jobName=${encodeURIComponent(payload.jobName)}&sqlQuery=${encodeURIComponent(payload.sqlQuery)}`
      // );
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);

      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        reset({ jobName: "" });
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
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
    toast.success(data);
  };

  const getRequired = (field) => {
    if ((!location.state || showRunJob) && requiredFields.includes(field)) {
      return { required: `${field} is required` };
    }
    return {};
  };

  return (
    <PageLayout>
      <main className="p-6 w-[80%] mx-auto">
        <p className="text-gray-500 mb-4 text-[0.9rem]">
          Please Fill All Details
        </p>
        <hr className="border-t border-gray-300 my-4" />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.name}>
                <div className="flex justify-between">
                  <label className="block text-sm font-medium mb-1">
                    {field.label}
                    {field.required && "*"}
                  </label>
                  {errors[field.name] && (
                    <p className="text-red-500 text-sm">
                      {errors[field.name]?.message}
                    </p>
                  )}
                </div>
                {field.type === "select" ? (
                  field.name === "disable" ||
                  field.name === "dataConsole" ||
                  field.name === "type" ||
                  field.name === "region" ? (
                    <select
                      {...register(field.name, getRequired(field.name))}
                      className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                      value={watch(field.name)}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((opt, index) => (
                        <option key={index} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.name === "object" ? (
                    <select
                      {...register(field.name, getRequired(field.name))}
                      value={
                        objectIds?.find(
                          (obj) =>
                            obj.objectId === location?.state?.data?.object,
                        )?.objectName || watch(field.name)
                      }
                      className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                    >
                      <option value="">Select {field.label}</option>
                      {objectLoading ? (
                        <option value="" disabled>
                          Loading...
                        </option>
                      ) : (
                        objectIds.map((opt) => (
                          <option key={opt.objectId} value={opt.objectId}>
                            {opt.objectName}
                          </option>
                        ))
                      )}
                    </select>
                  ) : field.name === "subscription" ? (
                    <div>
                      <div className="flex justify-between">
                        <input
                          type="text"
                          id="subscriptionInput"
                          placeholder="Enter Subscription ID"
                          className="w-[80%] p-2 border border-gray-300 rounded-md"
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
                        {subscriptionIds?.map((id, index) => (
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
            {(location.state || showRunJob) && (
              <div>
                <label>Post Script</label>
                <input
                  type="text"
                  placeholder={`Enter PostScript}`}
                  {...register("postScript")}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>
          <div className="w-full mt-6 flex w-full gap-x-2 text-center justify-between">
            {location.state ? (
              <button
                disabled={loading}
                onClick={handleSubmit(handleUpdateJob)}
                className={`w-[49%] px-6 py-2 ${
                  loading ? "opacity-75" : "opacity-100"
                } text-white rounded-md`}
                style={{ backgroundColor }}
              >
                {loading ? "Updating..." : "Update Job"}
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={handleSubmit(onSubmit)}
                className={`w-[49%] px-6 py-2 ${
                  loading ? "opacity-75" : "opacity-100"
                } text-white rounded-md`}
                style={{ backgroundColor }}
              >
                {loading ? "Saving" : "Save"}
              </button>
            )}
            {(location?.state || showRunJob) && (
              <button
                disabled={runLoading}
                onClick={handleSubmit(handleRunjob)}
                className={`w-[49%] px-6 py-2 ${
                  runLoading ? "opacity-75" : "opacity-100"
                } text-white rounded-md`}
                style={{ backgroundColor }}
              >
                {runLoading ? "Running" : "Run Job"}
              </button>
            )}
            <button
              disabled={scheduleLoading}
              onClick={isScheduleModal}
              className={`w-[49%] px-6 py-2 ${
                scheduleLoading ? "opacity-75" : "opacity-100"
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
          <JobResponseModal
            isOpen={titleResponse}
            onClose={() => setTitleResponse("")}
            title={titleResponse}
          >
            <p>Your response to the job application.</p>
          </JobResponseModal>
        </form>
      </main>
    </PageLayout>
  );
};

export default DynamicJobForm;
