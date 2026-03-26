import { useForm } from "react-hook-form";
import PageLayout from "../../../Common/PageLayout";
import { patchRequest } from "../../../../Service/api.service";
import toast from "react-hot-toast";
import { useTheme } from "../../../../ThemeContext";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { getRequest, postDataRequest } from "../../../../Service/api.service";
import { useEffect, useState } from "react";
import { getRequest as forConsoleApi } from "../../../../Service/api.service";
import { useLocation, useNavigate } from "react-router-dom";
import BackButton from "../../../Common/BackButton";

const AddSsoForm = () => {
    const location = useLocation();
    const { data } = location?.state || {}
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setHeadingTitle("Settings / SSO Configure"));
      }, [])
    const navigate = useNavigate();
    const { bgColor } = useTheme();
    const { backgroundColor } = bgColor;
    const [saveLoading, setSaveLoading] = useState(false);
    const [objectIds, setObjectIds] = useState([]);
    const [objectLoading, setObjectLoading] = useState(false)
    const [forUpdateData, setforUpdateData] = useState(null)
    const [loading, setLoading] = useState(false)

    const [imageBase64, setImageBase64] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        watch, getValues
    } = useForm({
        defaultValues: {

        },
    });
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
    const fieldConfig = [
        { name: "ssoConfigureName", label: "SSO Configure Name", type: "text", },
        { name: "clientId", label: "Client ID", type: "text", },
        { name: "clientSecret", label: "Client Secret", type: "password", },
        { name: "providerName", label: "Provider Name ", type: "text", },
        { name: "redirectUri", label: "Redirect Uri", type: "text", },
        { name: "authorizationUri", label: "Authorization Uri", type: "text", },
        { name: "tokenUri", label: "Token Uri", type: "text", },
        { name: "scope", label: "Scope", type: "text", },
        { name: "userInfoUri", label: "UserInfo Uri", type: "text", },
        { name: "jwkSetUri", label: "JwkSet Uri", type: "text", },
        { name: "issuerUri", label: "Issuer Uri", type: "text", },
        { name: "enable", label: "Enable", type: "checkbox", },

    ]

    const fetchformDatabyJobName = async () => {
        const toastId = toast.loading("loading....");
        try {
            if (!data?.id) return;
            const res = await forConsoleApi(`/sso/${data?.id}/read`);

            if (res.status === 200) {
                setforUpdateData(res?.data)
            }
        } catch (error) {
            console.error("Error fetching object IDs:", error);
            toast.error(error?.response?.data?.error || "Internal server error");
        } finally {
            toast.dismiss(toastId);
        }
    };



    const onSubmit = async (data) => {
        setSaveLoading(true);
        try {
            const response = await postDataRequest("/sso/configure", data);
            if (response?.status === 201 || response?.status === 200) {
                toast.success("Successfully Submitted");
                reset();
                navigate("/admin-console/settings/sso/all-tables")
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



            // console.log("datadate......d", UpdatePayload);
            // if (Object.keys(UpdatePayload).length === 0) {
            //     toast.error("No changes detected or some fields are empty");
            //     setLoading(false);
            //     return;
            // }

            const response = await patchRequest(`/sso/${location?.state?.data?.id}/update`, data);

            if (response?.status === 200) {
                toast.success("Successfully Updated");
                // navigate("/admin-console/settings/sso/all-tables")
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || "Internal server error");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchformDatabyJobName();
    }, [location, data?.id]);


    useEffect(() => {
        fetchObjectId();
    }, []);

    useEffect(() => {
        if (forUpdateData) {
            reset({

                ssoConfigureName: forUpdateData?.ssoConfigurationName,
                clientId: forUpdateData?.clientId,
                clientSecret: forUpdateData?.clientSecret,
                providerName: forUpdateData?.providerName,
                redirectUri: forUpdateData?.redirectUri,
                authorizationUri: forUpdateData?.authorizationUri,
                tokenUri: forUpdateData?.tokenUri,
                scope: forUpdateData?.scope,
                userInfoUri: forUpdateData?.userInfoUri,
                jwkSetUri: forUpdateData?.jwkSetUri || null,
                issuerUri: forUpdateData?.issuerUri,
                enable: forUpdateData?.enabled

            });
        }
    }, [forUpdateData, reset]);


    const getRequired = (field) => {
        if (!location.state && (
            field === "ssoConfigureName"


        )) {
            return { required: `${field} is required` };
        }
        return {};
    };


    // const getLogo = async () => {
    //     try {
    //         const response = await getRequest("http://57.155.86.244:8084/api/logo/5/get")

    //         const imageUrl = URL.createObjectURL(response?.blob);
    //         setImageBase64(imageUrl)
    //     } catch (error) {
    //         console.log(error, "error")
    //     }
    // }


    // useEffect(() => {
    //     getLogo()
    // }, []);


    return (
        <PageLayout>
            <main className="p-6 sm:w-[80%] w-full mx-auto">
                <BackButton />
                <div className="flex items-center justify-between">
                    <p className="text-gray-500 text-[0.9rem]">Please Fill All Details</p>

                    {/* <div>
                        {imageBase64 ? <img src={`data:image/png;base64,${imageBase64}`} alt="Fetched" style={{ maxWidth: "100%" }} /> : <p>Loading...</p>}
                    </div> */}
                    <button
                        onClick={() => navigate("/admin-console/settings/sso/all-tables")}
                        className={`w-fit sm:px-6 px-1 py-2 hover:opacity-80 hover:shadow-sm  opacity-100 text-white rounded-md`}
                        style={{ backgroundColor }}
                    >
                        See All Saved SSO
                    </button>
                </div>
                <hr className="border-t border-gray-300 my-4" />
                <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-6 grid-cols-1">
                    {fieldConfig?.map((field) => (
                        <div key={field.name}>
                            <div className="flex justify-between">
                                <label className="block text-sm font-medium mb-1">{field.label}*</label>
                                {errors[field.name] && (
                                    <p className="text-red-500 text-sm">{errors[field.name]?.message}</p>
                                )}
                            </div>
                            {field.type === "select" ?
                                field.name == "disable" ? (
                                    <select
                                        {...register(field.name, getRequired(field.name))}
                                        className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                                    >
                                        <option value="">Select {field.label}</option>
                                        {(
                                            field.options.map((opt, index) => (
                                                <option key={index} value={opt} >
                                                    {opt}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                ) : field.name == "dataConsole" ? (
                                    <select
                                        {...register(field.name, getRequired(field.name))}
                                        className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                                        value={watch(field.name)}
                                    >
                                        <option value="">Select {field.label}</option>
                                        {(
                                            field.options.map((opt, index) => (
                                                <option key={index} value={opt} >
                                                    {opt}
                                                </option>
                                            ))
                                        )}
                                    </select>) :
                                    (field.name === "objectId" &&
                                        <select
                                            value={objectIds?.filter((object) => (object?.objectId == getValues(field.name))).objectName || watch('objectId')}
                                            {...register(field.name, getRequired(field.name))}

                                            className="w-full p-2 border border-gray-300 text-gray-500 rounded-md"
                                        >
                                            <option value="">Select {field.label}</option>
                                            {objectLoading ? (
                                                <option value="" disabled>Loading...</option>
                                            ) : (
                                                objectIds.map((opt) => (
                                                    <option key={opt.object} value={opt.objectId}>
                                                        {opt.objectName}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    ) :
                                (
                                    <input
                                        type={field.type || "text"}
                                        placeholder={`Enter ${field.label}`}
                                        autoComplete={field.name === "clientSecret" && "new-password"}
                                        {...register(field.name, getRequired(field.name))}
                                        className={`p-2 border border-gray-300 rounded-md ${field.name === 'enable' ? 'w-auto' : 'w-full'}`}
                                    />
                                )}
                        </div>
                    ))}
                </form>
                <div className="w-full mt-6 flex gap-x-2 text-center justify-between">
                    {location.state ? (<button
                        disabled={loading}
                        onClick={handleSubmit(handleUpdateJob)}
                        className={`w-[100%] px-6 py-2 ${loading ? "opacity-75" : "opacity-100"} text-white rounded-md`}
                        style={{ backgroundColor }}

                    >
                        {loading ? "Updating..." : "Update Job"}
                    </button>) :
                        <button
                            disabled={saveLoading}
                            onClick={handleSubmit(onSubmit)}
                            className={`w-[100%] px-6 py-2 ${saveLoading ? "opacity-75" : "opacity-100"} text-white rounded-md`}
                            style={{ backgroundColor }}
                        >
                            {saveLoading ? "Saving" : "Save"}
                        </button>
                    }
                </div>


            </main>
        </PageLayout>
    );
};
export default AddSsoForm;
