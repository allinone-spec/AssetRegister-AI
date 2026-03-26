import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../ThemeContext";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import PageLayout from "../../../Common/PageLayout";
import {
  postDataRequest,
  patchRequest,
  getRequest as forConsoleApi,
} from "../../../../Service/Console.service";
import toast from "react-hot-toast";
import { getRequest } from "../../../../Service/api.service";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ScheduleJobModal } from "../../../Common/ScheduleJobModal";
import { useSelector } from "react-redux";
import TextEditor from "../../../Common/TextEditor";
import FilterKeySelector from "../../../Common/FilterKeySelector";
import ImportModeToggle from "../../../Common/ImportModeToggle";
import useFilterKeys from "../../../../Hooks/useFilterKeys";

const CustomeAPI = ({ routeName }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { data } = location.state || {};
  const [triggerField, setTriggerField] = useState(null);
  const [objectLoading, setObjectLoading] = useState(false);
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [objectIds, setObjectIds] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [postScript, setPostScript] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(null);
  const [titleResponse, setTitleResponse] = useState("");
  const [showRunJob, setShowRunJob] = useState(false);
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const grantTypes = [
    "REFRESH_TOKEN",
    "PASSWORD",
    "AUTHORIZATION_CODE",
    "CLIENT_CREDENTIALS",
  ];
  const authorizationTypes = ["NO_AUTH", "OAUTH", "BASIC", "BEARER"];
  const [forUpdateData, setforUpdateData] = useState(null);

  const [apiHeaders, setApiHeaders] = useState([{ key: "", value: "" }]);
  const [queryParams, setQueryParams] = useState([{ key: "", value: "" }]);
  const [tokenHeaders, setTokenHeaders] = useState([{ key: "", value: "" }]);

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
    watch,
    reset,
    getValues,
    getFieldState,
    formState: { errors },
  } = useForm({
    defaultValues: {
      jobName: "",
      authorization: "", // Set default authorization
      grantType: "",
      userName: "",
      password: "",
      tokenUrl: "",
      object: null,
      disable: "",
      inRegister: "",
      clientId: "",
      clientSecret: "",
      refreshToken: "",
      accessToken: "",
      redirectUri: "",
      apiUrl: "",
      apiHeaders: [{ key: "", value: "" }],
      queryParams: [{ key: "", value: "" }],
      tokenHeaders: [{ key: "", value: "" }],
      ...data,
    },
  });

  useEffect(() => {
    if (forUpdateData) {
      reset({
        jobName: forUpdateData?.jobName || "",
        authorization: forUpdateData?.authorization || "",
        grantType: forUpdateData?.grantType || "",
        userName: forUpdateData?.jsonData?.userName || "",
        password: forUpdateData?.jsonData?.password || "",
        tokenUrl: forUpdateData?.jsonData?.tokenUrl || "",
        object: forUpdateData?.objectId || null,
        disable: forUpdateData?.disable || "",
        inRegister: forUpdateData?.inRegister || "",
        clientId: forUpdateData?.jsonData?.clientId || "",
        clientSecret: forUpdateData?.jsonData?.clientSecret || "",
        refreshToken: forUpdateData?.jsonData?.refreshToken || "",
        accessToken: forUpdateData?.jsonData?.accessToken || "",
        redirectUri: forUpdateData?.jsonData?.redirectUri || "",
        apiUrl: forUpdateData?.jsonData?.apiUrl || "",
        apiHeaders: forUpdateData?.apiHeaders
          ? Object.entries(forUpdateData?.apiHeaders)?.map(([key, value]) => ({
              key,
              value,
            }))
          : [{ key: "", value: "" }],
        queryParams: forUpdateData?.queryParams
          ? Object.entries(forUpdateData?.queryParams)?.map(([key, value]) => ({
              key,
              value,
            }))
          : [{ key: "", value: "" }],
        tokenHeaders: forUpdateData?.tokenHeaders
          ? Object.entries(forUpdateData?.tokenHeaders)?.map(
              ([key, value]) => ({ key, value }),
            )
          : [{ key: "", value: "" }],
      });
      setApiHeaders(
        forUpdateData.apiHeaders
          ? Object.entries(forUpdateData?.apiHeaders)?.map(([key, value]) => ({
              key,
              value,
            }))
          : [{ key: "", value: "" }],
      );
      setQueryParams(
        forUpdateData?.queryParams
          ? Object.entries(forUpdateData?.queryParams)?.map(([key, value]) => ({
              key,
              value,
            }))
          : [{ key: "", value: "" }],
      );
      setTokenHeaders(
        forUpdateData?.tokenHeaders
          ? Object.entries(forUpdateData?.tokenHeaders)?.map(
              ([key, value]) => ({ key, value }),
            )
          : [{ key: "", value: "" }],
      );
    }
  }, [forUpdateData, reset]);

  const handleFilterChange = (index, field, value) => {
    const updatedFilters = [...apiHeaders];
    updatedFilters[index][field] = value;
    setApiHeaders(updatedFilters);
  };

  const handleQueryParamChange = (index, field, value) => {
    const updatedQueryParams = [...queryParams];
    updatedQueryParams[index][field] = value;
    setQueryParams(updatedQueryParams);
  };

  const handleTokenParamChange = (index, field, value) => {
    const updatedTokenHeaders = [...tokenHeaders];
    updatedTokenHeaders[index][field] = value;
    setTokenHeaders(updatedTokenHeaders);
  };

  const addTokenParamRow = () =>
    setTokenHeaders([...tokenHeaders, { key: "", value: "" }]);

  const removeTokenParamRow = (index) => {
    const updatedTokenHeaders = queryParams.splice(index, 1);

    setTokenHeaders(updatedTokenHeaders);
  };

  const addFilterRow = () =>
    setApiHeaders([...apiHeaders, { key: "", value: "" }]);

  const removeFilterRow = (index) => {
    const updatedFilters = apiHeaders.filter((_, i) => i !== index);
    setApiHeaders(updatedFilters);
  };

  const addQueryParamRow = () =>
    setQueryParams([...queryParams, { key: "", value: "" }]);

  const removeQueryParamRow = (index) => {
    const updatedQueryParams = queryParams.splice(index, 1);

    setQueryParams(updatedQueryParams);
  };

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

  console.log("UpdatedFormData", forUpdateData);
  const fetchformDatabyJobName = async () => {
    const toastId = toast.loading("loading....");
    setLoading(true);
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
      console.error("Error fetching job data:", error);
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchformDatabyJobName();
  }, [location, data?.jobName]);

  const onSubmit = async (data) => {
    setSaveLoading(true);
    setShowRunJob(false);

    try {
      const payload = {
        apiUrl: watch("apiUrl"),
        userName: watch("userName"),
        password: watch("password"),
        clientId: watch("clientId"),
        clientSecret: watch("clientSecret"),
        jobName: watch("jobName"),
        refreshToken: watch("refreshToken"),
        accessToken: watch("accessToken"),
        tokenUrl: watch("tokenURL"),
        grantType: watch("grantType"),
        authorization: watch("authorization"),
        queryParams: queryParams.reduce((acc, param) => {
          if (param.key && param.value) {
            acc[param.key] = param.value;
          }
          return acc;
        }, {}),
        apiHeaders: apiHeaders.reduce((acc, filter) => {
          if (filter.key && filter.value) {
            acc[filter.key] = filter.value;
          }
          return acc;
        }, {}),
        tokenHeaders: tokenHeaders.reduce((acc, filter) => {
          if (filter.key && filter.value) {
            acc[filter.key] = filter.value;
          }
          return acc;
        }, {}),
        authorizationCode: watch("authorizationCode"),
        redirectUri: watch("redirectUri"),
        disable: watch("disable"),
        inRegister: watch("inRegister"),
        objectId: watch("object"),
        jobType: "customAPI",
      };

      const response = await postDataRequest("/customAPI/saveJob", payload);
      if (response?.status === 200) {
        toast.success("Successfully Submitted");
        reset();
        reset({ jobName: data.jobName });
        setApiHeaders([{ key: "", value: "" }]);
        setQueryParams([{ key: "", value: "" }]);
        setTitleResponse(response.data);
        setShowRunJob(true);
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
      // const response = await postDataRequest(`/customAPI/readData`, payload);
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
  const handleUpdateJob = async (data) => {
    setLoading(true);
    console.log("Data", data, "forUpdateData", forUpdateData);
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
            acc["objectId"] = Number(data[key]); // Store as objectId
          }
        } else if (
          key === "queryParams" ||
          key === "apiHeaders" ||
          key === "tokenHeaders"
        ) {
          // Convert arrays of { key, value } objects into key-value pairs
          const formattedObject = data[key]?.reduce((obj, item) => {
            if (item.key && item.value) obj[item.key] = item.value;
            return obj;
          }, {});

          if (
            JSON.stringify(formattedObject) !==
            JSON.stringify(forUpdateData[key])
          ) {
            acc[key] = formattedObject;
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
      // Include triggerButton only when it changed
      if (toggleButton !== forUpdateData?.triggerButton) {
        UpdatePayload["triggerButton"] = toggleButton;
      }

      const response = await patchRequest(
        `/customAPI/${data?.jobName}/updateJob`,
        UpdatePayload,
      );
      if (response?.status === 200) {
        toast.success("Job updated Successfully");
        setTitleResponse(response.data);
        navigate(-1);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        `${
          location.state && !data?.isNavigateJob
            ? `Update Job /  ${data?.jobName}`
            : "Add Job /  Custom API"
        }`,
      ),
    );
  }, [dispatch]);

  const getRequired = (field) => {
    if (showRunJob || location?.state?.data?.jobName) {
      return;
    }
    if (
      !location?.state?.data?.jobName &&
      !showRunJob &&
      (field === "jobName" ||
        field === "object" ||
        field === "authorization" ||
        field === "grantType")
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
            {Object.keys({
              jobName: "",
              authorization: "",
              grantType: "",
              userName: "",
              password: "",
              tokenUrl: "",
              object: null,
              disable: "",
              inRegister: "",
            }).map((key, index) => (
              <div
                key={index}
                className={`${
                  ["grantType", "tokenUrl"].includes(key)
                    ? "col-span-1 sm:col-span-2"
                    : "col-span-1"
                }`}
              >
                <div className="flex justify-between text-black">
                  {" "}
                  <label
                    htmlFor={key}
                    className="block text-sm font-plus-jakarta leading-[20.24px] text-[#636363] font-medium mb-1"
                  >
                    {key === "inRegister"
                      ? "In Register"
                      : key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                    *
                  </label>
                  {errors[key] && (
                    <p className="text-red-500 text-sm">
                      {errors[key]?.message}
                    </p>
                  )}
                </div>
                {key === "grantType" ? (
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-400"
                    id={key}
                    name={key}
                    value={getValues(key) || ""}
                    {...register(key, getRequired(key))}
                  >
                    <option value="">Select Grant Type</option>
                    {grantTypes.map((grant, index) => (
                      <option key={index} value={grant}>
                        {grant}
                      </option>
                    ))}
                  </select>
                ) : key === "authorization" ? (
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-400"
                    id={key}
                    name={key}
                    value={getValues(key) || ""}
                    {...register(key, getRequired(key))}
                  >
                    <option value="">Select Authorization</option>
                    {authorizationTypes.map((auth, index) => (
                      <option key={index} value={auth}>
                        {auth}
                      </option>
                    ))}
                  </select>
                ) : key === "object" ? (
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-400"
                    id={key}
                    name={key}
                    disabled={!!selectedObject}
                    value={
                      selectedObject ||
                      objectIds?.filter(
                        (object) => object?.objectId == getValues(key),
                      ).objectName ||
                      watch("object")
                    }
                    {...register(key, getRequired(key))}
                  >
                    <option value="">All Object</option>
                    {objectLoading ? (
                      <option>Loading...</option>
                    ) : objectIds.length > 0 ? (
                      objectIds?.map((obj, index) => (
                        <option key={index} value={obj.objectId}>
                          {obj.objectName}
                        </option>
                      ))
                    ) : (
                      <option>Not Found Object</option>
                    )}
                  </select>
                ) : key === "disable" ? (
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-400"
                    id={key}
                    name={key}
                    defaultValue="no"
                  >
                    {["yes", "no"].map((val, index) => (
                      <option key={index} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                ) : key === "inRegister" ? (
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-400"
                    id={key}
                    name={key}
                    defaultValue="yes"
                  >
                    {["yes", "no"].map((val, index) => (
                      <option key={index} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id={key}
                    name={key}
                    value={watch(key) || ""}
                    placeholder={`enter ${key}`}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    {...register(key, getRequired(key))}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3
              className="font-medium text-gray-700 p-2 rounded"
              // style={{ backgroundColor }}
            >
              APi Headers
            </h3>
            {apiHeaders.map((filter, index) => (
              <div
                key={index}
                className="grid sm:grid-cols-6 grid-cols-1 gap-4 mt-2"
              >
                <input
                  type="text"
                  placeholder="Key"
                  value={filter.key}
                  onChange={(e) =>
                    handleFilterChange(index, "key", e.target.value)
                  }
                  className="col-span-2p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={filter.value}
                  onChange={(e) =>
                    handleFilterChange(index, "value", e.target.value)
                  }
                  className="col-span-3 p-2 border border-gray-300 rounded-md"
                />
                {index === apiHeaders.length - 1 ? (
                  <button
                    type="button"
                    onClick={addFilterRow}
                    className="col-span-1 text-white p-2 rounded-md w-[50%]"
                    style={{ backgroundColor }}
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeFilterRow(index)}
                    className="col-span-1 text-white p-2 rounded-md w-[50%]"
                    style={{ backgroundColor }}
                  >
                    -
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3
              className="font-medium text-gray-700 rounded p-2"
              // style={{ backgroundColor }}
            >
              Query Parameter
            </h3>

            {queryParams?.map((param, index) => (
              <div
                key={index}
                className="grid sm:grid-cols-6 grid-cols-1 gap-4 mt-2"
              >
                <input
                  type="text"
                  placeholder="Key"
                  value={param?.key || ""}
                  onChange={(e) =>
                    handleQueryParamChange(index, "key", e.target.value)
                  }
                  className="col-span-2 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={param?.value || ""}
                  onChange={(e) =>
                    handleQueryParamChange(index, "value", e.target.value)
                  }
                  className="col-span-3 p-2 border border-gray-300 rounded-md"
                />

                {index ===
                (queryParams[0]?.key !== ""
                  ? queryParams.length
                  : watch("queryParams")?.length || 0) -
                  1 ? (
                  <button
                    type="button"
                    onClick={addQueryParamRow}
                    className="col-span-1 text-white p-2 rounded-md w-[50%]"
                    style={{ backgroundColor }}
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeQueryParamRow(index)}
                    className="col-span-1 text-white p-2 rounded-md w-[50%]"
                    style={{ backgroundColor }}
                  >
                    -
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3
              className="font-medium text-gray-700 rounded p-2"
              // style={{ backgroundColor }}
            >
              Token Headers
            </h3>

            {tokenHeaders?.map((param, index) => (
              <div
                key={index}
                className="grid sm:grid-cols-6 grid-cols-1 gap-4 mt-2"
              >
                <input
                  type="text"
                  placeholder="Key"
                  value={param?.key || ""}
                  onChange={(e) =>
                    handleTokenParamChange(index, "key", e.target.value)
                  }
                  className="col-span-2 p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={param?.value || ""}
                  onChange={(e) =>
                    handleTokenParamChange(index, "value", e.target.value)
                  }
                  className="col-span-3 p-2 border border-gray-300 rounded-md"
                />

                {index ===
                (tokenHeaders[0]?.key !== ""
                  ? tokenHeaders.length
                  : watch("tokenHeaders")?.length || 0) -
                  1 ? (
                  <button
                    type="button"
                    onClick={addTokenParamRow}
                    className="col-span-1 text-white p-2 rounded-md w-[50%]"
                    style={{ backgroundColor }}
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeTokenParamRow(index)}
                    className="col-span-1 text-white p-2 rounded-md w-[50%]"
                    style={{ backgroundColor }}
                  >
                    -
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 grid-cols-1 gap-6 ">
            {Object.keys({
              clientId: "",
              clientSecret: "",
              refreshToken: "",
              accessToken: "",
              redirectUri: "",
              apiUrl: "",
            }).map((key, index) => (
              <div
                key={index}
                className={`${
                  ["redirectUri", "apiUrl"].includes(key)
                    ? "col-span-1 sm:col-span-2"
                    : "col-span-1"
                }`}
              >
                <label
                  htmlFor={key}
                  className="block text-sm font-plus-jakarta leading-[20.24px] text-[#636363] font-medium mb-1"
                >
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                  *
                </label>
                <input
                  type="text"
                  id={key}
                  name={key}
                  placeholder={`enter ${key}`}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  {...register(key, {})}
                />
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
                  {...register("postScript", {})}
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
            {(location.state && !data?.isNavigateJob) || showRunJob ? (
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

            {(location.state || showRunJob) && !data?.isNavigateJob && (
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
            onClose={() => setTitleResponse("")}
            title={titleResponse}
          >
            <p>Your response to the job application.</p>
          </JobResponseModal> */}
        </form>
      </main>
    </PageLayout>
  );
};
export default CustomeAPI;
