import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import PageLayout from "../../../Common/PageLayout";
import {
  postDataRequest,
  patchRequest,
  getRequest as forConsoleApi,
} from "../../../../Service/Console.service";
import { getRequest } from "../../../../Service/api.service";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useTheme } from "../../../../ThemeContext";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useLocation, useNavigate } from "react-router-dom";
import BackButton from "../../../Common/BackButton";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";
import { useSelector } from "react-redux";

const FlatFileCSV = ({ routeName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [triggerField, setTriggerField] = useState(null);

  const [objectIds, setObjectIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [postScript, setPostScript] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [titleResponse, setTitleResponse] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [showRunJob, setShowRunJob] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const { data } = location.state || {};
  const [forUpdateData, setforUpdateData] = useState(null);
  const [toggleButton, setToggleButton] = useState("replace");
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
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
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      disable: "no",
      inRegister: "yes",
      ...data,
    },
  });

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        `${
          location.state && !data?.isNavigateJob
            ? `Update Job /  ${data?.jobName}`
            : "Add Job /  Flat File Csv"
        }`,
      ),
    );
  }, [location]);

  const isScheduleModal = () => {
    if (!watch("jobName")) {
      toast.error("First fill Job Name for Schedule Task ");
    }
    setIsScheduleModalOpen(watch("jobName"));
  };

  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    setLoading(true); //set loading true.
    try {
      if (!data?.jobName) return;

      const res = await forConsoleApi(`/jobSchedule/${data.jobName}/view`);
      if (res.status === 200) {
        console.log(" Form data:", res.data);
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

  const [objectloading, setObjectLoading] = useState(false);

  useEffect(() => {
    if (forUpdateData) {
      reset({
        inRegister: forUpdateData?.inRegister || "yes",
        delimiter: forUpdateData?.delimiter || "",
        disable: forUpdateData?.disable || "no",
        fileType: forUpdateData?.fileType || "csv",
        jobName: forUpdateData?.jobName || "",
        jobType: forUpdateData?.jobType || "",
        objectId: forUpdateData?.objectId || null,
        path: forUpdateData?.path || "",
        qualifier: forUpdateData?.qualifier || "",
        wildCard: forUpdateData?.wildCard || "",
        workSheet: forUpdateData?.workSheet || "",
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
  const selectedType = watch("type");
  const selectedFile = watch("upload");

  // Auto-fill path when file is selected
  useEffect(() => {
    if (selectedFile && selectedFile.length > 0) {
      console.log("selectedFile", selectedFile);
      const file = selectedFile[0];
      const fileName = file.name;

      // Try different methods to get file path
      let filePath = fileName; // Default to just filename

      // Check for webkitRelativePath (works with directory uploads)
      if (file.webkitRelativePath && file.webkitRelativePath.trim() !== "") {
        filePath = file.webkitRelativePath;
      }
      // Check for full path in some browsers (may be restricted for security)
      else if (file.path && file.path.trim() !== "") {
        filePath = file.path;
      }
      // Use just the filename as fallback
      else {
        // Extract directory-like structure from filename if it contains path separators
        filePath = fileName.includes("/")
          ? fileName
          : fileName.includes("\\")
            ? fileName
            : fileName;
      }

      console.log("Setting path to:", filePath);
      // Set the path field with the extracted path
      setValue("path", getValues("path") ? "" : filePath);

      // If we're in update mode (have forUpdateData), automatically upload the file
      if (forUpdateData?.jobName) {
        const formData = {
          upload: selectedFile,
        };
        uploadFile(formData);
      }
    }
  }, [selectedFile, setValue, forUpdateData?.jobName]);

  const fields = [
    { name: "jobName", label: "Job Name", type: "text" },
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
      label: " In Register",
      type: "select",
      options: ["yes", "no"],
    },
    {
      name: "fileType",
      label: " File Type",
      type: "select",
      options: ["csv", "xlsx"],
    },
    { name: "path", label: "Path", type: "text" },
    { name: "upload", label: "Upload", type: "file" },
    { name: "wildCard", label: "Wildcard", type: "text" },
    {
      name: "delimiter",
      label: "Delimiter",
      type: "text",
      condition: selectedType === "csv",
    },
    {
      name: "qualifier",
      label: "Qualifier",
      type: "text",
      condition: selectedType === "csv",
    },
    {
      name: "workSheet",
      label: "Worksheet",
      type: "text",
      condition: selectedType === "xlsx",
    },
  ];

  const onSubmit = async (data) => {
    setSaveLoading(true);
    setShowRunJob(false);

    // // Validate matchedKey if in update mode
    // if (toggleButton === "update" && filterKeys.matchedKey.length === 0) {
    //   toast.error("At least one Matching Key must be selected.");
    //   setSaveLoading(false);
    //   return;
    // }

    const formattedData = {
      jobName: data.jobName || "",
      objectId: data.objectId || "",
      disable: data.disabled ?? "no", // Ensure a default value
      fileType: data.fileType || "",
      delimiter: data.delimiter || "",
      qualifier: data.qualifier || "",
      workSheet: data.workSheet || "",
      path: data.path || "",
      wildCard: data.wildCard || "",
      inRegister: data.inRegister ?? "yes", // Ensure a default value
      triggerButton: toggleButton,
      // // Add matchedKey and ignoreKey for update mode
      // matchedKey:
      //   toggleButton === "update" ? filterKeys.matchedKey.join(",") : "",
      // ignoreKey:
      //   toggleButton === "update" ? filterKeys.ignoreKey.join(",") : "",
    };

    try {
      const formData = new FormData();
      formData.append("flatFileInputData", JSON.stringify(formattedData));

      if (selectedFile && selectedFile.length > 0) {
        formData.append("file", selectedFile[0]);
      }

      const response = await postDataRequest("/file/uploadFile", formData);

      if (response.status === 200 && !response.data?.error) {
        toast.success("File uploaded successfully!");
        setShowRunJob(true);
        setTitleResponse(response.data);
        reset();
        reset({ jobName: data.jobName });
        setShowRunJob(true);
        navigate("/admin-console/saved-jobs");
      } else {
        toast.error(response.data?.error || "An unexpected error occurred.");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateJob = async (data) => {
    console.log("Data:", data, "forUpdateData:", forUpdateData);
    setLoading(true);
    const toastID = toast.loading("Loading...");

    try {
      // Save filter settings if in update mode
      if (toggleButton === "update" && location?.state?.data?.filterId) {
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

      // const changedFields = Object.keys(data).reduce((acc, key) => {
      //   if (data[key] !== forUpdateData[key]) {
      //     acc[key] = key === "objectId" ? Number(data[key]) : data[key]; // Convert objectId to a number
      //   }
      //   return acc;
      // }, {});

      // if (toggleButton !== forUpdateData?.triggerButton) {
      //   changedFields["triggerButton"] = toggleButton;
      // }
      // if (selectedFile && selectedFile.length > 0) {
      // If no fields have changed, return early
      // if (Object.keys(changedFields).length === 0) {
      //   console.log("No changes detected");
      //   return;
      // }
      // changedFields["jobName"] = data?.jobName;
      // changedFields["upload"] = JSON.stringify({
      //   fileName: selectedFile[0]?.name,
      //   fileType: selectedFile[0]?.type,
      //   fileSize: selectedFile[0]?.size,
      //   lastModified: selectedFile[0]?.lastModified,
      // });
      // }

      // changedFields["postScript"] = postScript;
      // console.log(changedFields);
      // API request
      const formData = new FormData();

      // Exclude upload field from the data being sent
      const { upload, ...dataWithoutUpload } = data;

      formData.append("jobName", forUpdateData?.jobName);
      formData.append(
        "flatFileInputData",
        JSON.stringify({
          ...dataWithoutUpload,
          postScript,
          triggerButton: toggleButton,
        }),
      );

      // Only append file if it exists
      if (data.upload && data.upload.length > 0) {
        formData.append("file", data.upload[0]);
      }

      const response = await patchRequest(
        `/file/${forUpdateData?.jobName}/updateJob/file`,
        formData,
      );

      if (response.status === 200) {
        toast.success("Successfully Updated");
        setTitleResponse(response.data);
        navigate(-1);
      }
    } catch (error) {
      console.error(error);
      toast.error("Update Failed");
    } finally {
      setLoading(false);
      toast.dismiss(toastID);
    }
  };

  const handleRunjob = async (data) => {
    setRunLoading(true);
    const payload = {
      jobName: data.jobName,
      postScript,
    };
    try {
      const response = await postDataRequest(`/jobSchedule/runJob`, payload);
      // const response = await postDataRequest("/file/runNow", payload);
      if (response?.status === 200) {
        toast.success("Successfully RunJob Saved");
        setTitleResponse(response.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setRunLoading(false);
    }
  };

  const uploadFile = async (data) => {
    if (!data.upload || data.upload.length === 0) {
      toast.error("No file selected");
      return;
    }

    const toastId = toast.loading("Uploading file...");
    try {
      const formData = new FormData();
      formData.append("file", data.upload[0]);
      formData.append("jobName", forUpdateData?.jobName);
      formData.append("flatFileInputData", JSON.stringify(forUpdateData));

      const response = await patchRequest(
        `/file/${forUpdateData?.jobName}/updateJob/file`,
        formData,
      );

      if (response.status === 200) {
        toast.success("File uploaded successfully!");
        console.log("Upload response:", response.data);
      } else {
        toast.error(response.data?.error || "Upload failed");
      }
      return response;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error?.response?.data?.error || "File upload failed");
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleScheduleJob = async (data) => {
    setTriggerField(data);
  };

  const getRequired = (field) => {
    if (showRunJob || location?.state?.data?.jobName) {
      return;
    }

    if (
      (!location?.state?.data?.jobName || showRunJob) &&
      (field === "jobName" ||
        field === "objectId" ||
        field === "disable" ||
        field === "inRegister" ||
        field === "type" ||
        field === "upload")
    ) {
      return { required: `${field} is required` };
    }
    return {};
  };

  return (
    <PageLayout className=" ">
      <div className="p-3">
        <BackButton />
      </div>
      <main className="p-6 sm:w-[80%] mx-auto">
        <p className="text-gray-500 mb-4 text-[0.9rem]">
          Please Fill All Details
        </p>
        <hr className="border-t border-gray-300 my-4" />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid w-full sm:grid-cols-2 gap-6 "
        >
          {fields.map(
            ({ name, label, type, options, condition = true, disabled }) =>
              condition && (
                <div key={name} className="w-full">
                  <div className="flex justify-between">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    {errors[name] && (
                      <p className="text-red-500 text-sm">
                        {label} is required
                      </p>
                    )}
                  </div>
                  {name === "objectId" ? (
                    <select
                      {...register(name, getRequired(name))}
                      value={watch("objectId")}
                      className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                    >
                      <option value="">Select {label}</option>
                      {objectloading ? (
                        <option value="" disabled>
                          Loading...
                        </option>
                      ) : objectIds.length > 0 ? (
                        objectIds?.map((opt) => (
                          <option key={opt.objectId} value={opt.objectId}>
                            {opt.objectName}
                          </option>
                        ))
                      ) : (
                        <option value="">Not data Found</option>
                      )}
                    </select>
                  ) : type === "select" ? (
                    <select
                      {...register(name, getRequired(name))}
                      placeholder={name}
                      className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                    >
                      <option value="">Select {label}</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : type === "file" ? (
                    <>
                      <input
                        type="file"
                        accept={
                          getValues("fileType") === ""
                            ? ""
                            : getValues("fileType") === "csv"
                              ? ".csv"
                              : ".xlsx"
                        }
                        {...register(name, getRequired(name))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                      {name === "upload" && (
                        <p className="text-xs text-orange-500 mt-1">
                          Note: Scheduling will not work with uploaded files.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type={type}
                        {...register(name, getRequired(name))}
                        placeholder={`Enter ${label}`}
                        className={`w-full p-2 border border-gray-300 rounded-md ${
                          disabled ? "bg-gray-100" : ""
                        }`}
                        disabled={disabled}
                      />
                      {name === "path" && (
                        <p className="text-xs text-orange-500 mt-1">
                          Note: Uploading a file will clear the path field
                        </p>
                      )}
                    </>
                  )}
                </div>
              ),
          )}
          {watch("fileType") === "xlsx" ? (
            <div className="w-full">
              <div className="flex justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Worksheet
                </label>
                {errors.workSheet && (
                  <p className="text-red-500 text-sm">Worksheet is required</p>
                )}
              </div>
              <input
                type="text"
                {...register("workSheet", getRequired("workSheet"))}
                placeholder="Enter Worksheet Name"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          ) : (
            <>
              {/* Delimiter Field */}
              <div className="w-full">
                <div className="flex justify-between">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delimiter
                  </label>
                  {errors.delimiter && (
                    <p className="text-red-500 text-sm">
                      Delimiter is required
                    </p>
                  )}
                </div>
                <input
                  type="text"
                  {...register("delimiter", getRequired("delimiter"))}
                  placeholder="Enter Delimiter (e.g., ,)"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Qualifier Field */}
              <div className="w-full">
                <div className="flex justify-between">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualifier
                  </label>
                  {errors.qualifier && (
                    <p className="text-red-500 text-sm">
                      Qualifier is required
                    </p>
                  )}
                </div>
                <input
                  type="text"
                  {...register("qualifier", getRequired("qualifier"))}
                  placeholder="Enter Qualifier"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
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
          <div className="mt-3">
            <label>Post Script</label>
            <TextEditor
              setPostScript={setPostScript}
              postScript={data?.postScript}
            />
            {/* <textarea
               placeholder={`Enter PostScript`}
               {...register("postScript")}
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
          {/* <div className="w-full flex gap-x-2 "> */}
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
          {/* </div> */}
        </div>
        <ScheduleJobModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(null)}
          handleSubmit={handleSubmit}
          handleScheduleJob={handleScheduleJob}
        />
        {/* <JobResponseModal
          isOpen={titleResponse}
          onClose={() => setTitleResponse("")}
          title={titleResponse}
        >
          <p>Your response to the job application.</p>
        </JobResponseModal> */}
      </main>
    </PageLayout>
  );
};

export default FlatFileCSV;
