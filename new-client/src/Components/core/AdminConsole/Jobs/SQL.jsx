import React, { useEffect, useState } from "react";
import PageLayout from "../../../Common/PageLayout";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import toast from "react-hot-toast";
import { postDataRequest } from "../../../../Service/admin.save";
import { getRequest } from "../../../../Service/api.service";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { JobResponseModal } from "../../../Common/JobResponseModal";
import { useForm } from "react-hook-form";
import { getRequest as forConsoleApi } from "../../../../Service/Console.service";
import { useLocation, useNavigate } from "react-router-dom";
import TextEditor from "../../../Common/TextEditor";
import { useSelector } from "react-redux";

const SQLForm = ({ routeName, editJob, setEditJob }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [triggerField, setTriggerField] = useState(null);

  const [loading, setLoading] = useState(false);
  const [titleResponse, setTitleResponse] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const [postScript, setPostScript] = useState("");
  const [showRunJob, setShowRunJob] = useState(false);

  const [runLoading, setRunLoading] = useState(false);
  const [objectLoading, setObjectLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [objectIds, setObjectIds] = useState([]);
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

  useEffect(() => {
    if (data?.postScript) setPostScript(data.postScript);
  }, [data?.postScript]);

  useEffect(() => {
    if (!editJob)
      dispatch(
        setHeadingTitle(
          `${
            location.state && !data?.isNavigateJob
              ? `Update Job /  ${data?.jobName}`
              : "Add Job /  Microsoft Sql"
          }`,
        ),
      );
  }, [location]);

  const fieldConfig = [
    { name: "jobName", label: "Job Name", type: "text", required: true },
    { name: "serverName", label: "Server Name", type: "text", required: true },
    {
      name: "dataBaseName",
      label: "DataBase Name ",
      type: "text",
      required: true,
    },
    { name: "tableName", label: "Table Name ", type: "text", required: true },
    { name: "username", label: "User Name ", type: "text", required: true },
    { name: "password", label: "Password ", type: "text", required: true },
    {
      name: "sqlType",
      label: "Sql Type",
      type: "select",
      required: true,
      options: ["sql", "Mysql"],
    },
    {
      name: "integratedSecurity",
      label: "Integrated Security ",
      type: "text",
      required: true,
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      jobName: "",
      serverName: "",
      dataBaseName: "",
      tableName: "",
      username: "",
      password: "",
      sqlType: "",
      integratedSecurity: "",
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
        reset({ postScript: "" });
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
      setShowRunJob(false);
      const response = await postDataRequest("/sql/save-job", data);
      if (response?.status === 201 || response?.status === 200) {
        toast.success("Successfully Submitted");
        setTitleResponse(response.data);
        setShowRunJob(true);
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

  const handleRunjob = async (data) => {
    setRunLoading(true);
    const payload = {
      jobName: data?.jobName,
      postScript,
    };
    try {
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);
      // const response = await postDataRequest(`/sql/runJob`, payload);
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
    setIsScheduleModalOpen(true);
  };

  const handleScheduleJob = async (data) => {
    setTriggerField(data);
  };

  const handleUpdateJob = async () => {};

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
                  <select
                    {...register(field.name, {
                      required: `${field.label} is required`,
                    })}
                    className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                  >
                    <option value="">Select {field.label}</option>
                    {field.name === "objectId" && objectLoading ? (
                      <option value="" disabled>
                        Loading...
                      </option>
                    ) : (
                      field.options?.map((opt, index) => (
                        <option
                          key={index}
                          value={field.name === "objectId" ? opt.objectId : opt}
                        >
                          {field.name === "objectId" ? opt.objectName : opt}
                        </option>
                      ))
                    )}
                  </select>
                ) : field.name == "disable" ? (
                  <select
                    {...register(field.name, {
                      required: `${field.label} is required`,
                    })}
                    className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options.map((opt, index) => (
                      <option
                        key={index}
                        value={field.name === "disable" ? "no" : "yes"}
                      >
                        {field.name === "disable" ? "no" : "yes"}
                      </option>
                    ))}
                  </select>
                ) : field.name == "inRegister" ? (
                  <select
                    {...register(field.name, {
                      required: `${field.label} is required`,
                    })}
                    className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options.map((opt, index) => (
                      <option
                        key={index}
                        value={field.name === "inRegister" ? "yes" : "no"}
                      >
                        {field.name === "inRegister" ? "yes" : "no"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    placeholder={`Enter ${field.label}`}
                    {...register(field.name, {
                      required: `${field.label} is required`,
                    })}
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
                loading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
              }
              onClick={handleSubmit(onSubmit)}
              className={`w-[49%] px-6 py-2 ${
                loading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
                  ? "opacity-75"
                  : "opacity-100"
              } text-white rounded-md bg-accent`}
            >
              {loading ? "Saving" : "Save"}
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

export default SQLForm;
