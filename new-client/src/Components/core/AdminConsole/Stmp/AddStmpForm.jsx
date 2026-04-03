import { useForm } from "react-hook-form";
import PageLayout from "../../../Common/PageLayout";
import { getRequest, patchRequest } from "../../../../Service/api.service";
import toast from "react-hot-toast";
// import { useTheme } from "../../../../ThemeContext";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { postDataRequest } from "../../../../Service/api.service";
import { useCallback, useEffect, useState } from "react";
// import { getRequest as forConsoleApi } from "../../../../Service/api.service";
import { useLocation, useNavigate } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useSelector } from "react-redux";

const AddStmpForm = ({ routeName }) => {
  const location = useLocation();
  const { data } = location?.state || {};
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setHeadingTitle("Settings / SMTP Configure"));
  }, []);
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const navigate = useNavigate();
  // const { bgColor } = useTheme();
  // const { backgroundColor } = bgColor;
  const [saveLoading, setSaveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forUpdateData, setforUpdateData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      enable: true,
      ...data,
    },
  });

  const fieldConfig = [
    { name: "host", label: "Host", type: "text" },
    { name: "port", label: "port ", type: "number" },
    { name: "username", label: "User Name ", type: "text" },
    { name: "password", label: "Password ", type: "password" },
    {
      name: "encryptionType",
      label: "Encryption Type ",
      type: "select",
      options: ["TLS"],
    }, // Note: Add more options after checking with Neetu
    { name: "whiteListedDomain", label: "White Listed Domain", type: "text" },
  ];

  const fetchSourceData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRequest("/smpt/readAll");
      if (response?.status === 200)
        setforUpdateData(response.data?.length ? response.data[0] : null);
    } catch (error) {
      console.error("Error fetching data:", error);
      setforUpdateData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSourceData();
  }, []);

  // const fetchformDatabyJobName = async () => {
  //   const toastId = toast.loading("loading....");
  //   try {
  //     console.log("data", data);
  //     if (!data?.id) return;
  //     const res = await forConsoleApi(`/smpt/${data?.id}/read`);

  //     if (res.status === 200) {
  //       console.log("Location Form data:", res.data);
  //       setforUpdateData(res?.data);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching object IDs:", error);
  //     toast.error(error?.response?.data?.error || "Internal server error");
  //   } finally {
  //     toast.dismiss(toastId);
  //   }
  // };

  const onSubmit = async (data) => {
    setSaveLoading(true);
    try {
      const response = await postDataRequest("/smpt/configure", data);
      if (response?.status === 201 || response?.status === 200) {
        toast.success("Successfully Submitted");
        reset();
        navigate("/admin-console/settings/smpt/all-tables");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Internal server error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateJob = async (data) => {
    setLoading(true);
    console.log("data", data, "forUpdated", forUpdateData);

    try {
      const UpdatePayload = Object.keys(data).reduce((acc, key) => {
        // Check if value is different from the original data
        if (data[key] !== forUpdateData[key]) {
          acc[key] = data[key];
        }
        return acc;
      }, {});

      console.log("UpdatedPayload", UpdatePayload);

      if (Object.keys(UpdatePayload).length === 0) {
        toast.error("No changes detected or some fields are empty");
        setLoading(false);
        return;
      }
      const response = await patchRequest(
        `/smpt/${forUpdateData?.id}/update`,
        UpdatePayload,
      );
      if (response?.status === 200) {
        toast.success("Successfully Updated");
        // navigate("/admin-console/settings/smpt/all-tables");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Internal server error");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   fetchformDatabyJobName();
  // }, [location, data?.id]);

  useEffect(() => {
    if (forUpdateData) {
      reset({
        ...forUpdateData,
      });
    }
  }, [forUpdateData, reset]);

  const getRequired = (field) => {
    if (!location.state && field === "host") {
      return { required: `${field} is required` };
    }
    return {};
  };

  return (
    <PageLayout>
      <main className="p-6 sm:w-[80%] mx-auto">
        <div className="font-extrabold text-2xl mb-2">SMTP Configuration</div>
        <div className="flex items-center justify-between">
          <p className="text-gray-500 mb-4 text-[0.9rem]">
            Please Fill All Details
          </p>
          {/* <button
                        onClick={() => navigate("/admin-console/settings/smpt/all-tables")}
                        className={`w-fit px-6 py-2 hover:opacity-80 hover:shadow-sm  opacity-100 text-white rounded-md`}
                        style={{ backgroundColor }}
                    >
                        See All Saved SMTP
                    </button> */}
        </div>
        <hr className="border-t border-gray-300 my-4" />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-6 grid-cols-1"
        >
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
                  {...register(field.name, getRequired(field.name))}
                  className="w-full p-2 border border-gray-300 text-gray-500 rounded-md bg-input-bg"
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((opt, index) => (
                    <option key={index} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.name === "password" ? (
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={`Enter ${field.label}`}
                    {...register(field.name, getRequired(field.name))}
                    className="w-full p-2 border border-gray-300 rounded-md pr-10 bg-input-bg"
                  />
                  {/* {!location.state && ( */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2"
                  >
                    {showPassword ? (
                      <AiOutlineEyeInvisible size={20} />
                    ) : (
                      <AiOutlineEye size={20} />
                    )}
                  </button>
                  {/* )} */}
                </div>
              ) : (
                <input
                  type={field.type || "text"}
                  placeholder={`Enter ${field.label}`}
                  {...register(field.name, getRequired(field.name))}
                  className="w-full p-2 border border-gray-300 rounded-md bg-input-bg"
                />
              )}
            </div>
          ))}
        </form>
        <div className="mt-6 flex w-full gap-x-2 text-center justify-between">
          {forUpdateData?.id ? (
            <button
              disabled={
                loading ||
                (permissionList?.includes(routeName) &&
                  !permissionDetails[routeName]?.hasWriteOnly)
              }
              onClick={handleSubmit(handleUpdateJob)}
              className={`px-6 py-2 ${
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
              className={`px-6 py-2 ${
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
        </div>
      </main>
    </PageLayout>
  );
};
export default AddStmpForm;
