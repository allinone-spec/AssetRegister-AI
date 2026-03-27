import {
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Layout from "../Components/Common/Layout";
import UserTable from "../Components/core/DataConsole/Security/UserTable";
import ColorSelector from "../pages/ColorThemeSelector";
import NewDashboard from "../Components/core/DataConsole/CreateDashboard/index";
import RoleTable from "../Components/core/DataConsole/Security/Role";
import PermissionTypeTable from "../Components/core/DataConsole/Security/PermissionType";
import GroupsTable from "../Components/core/DataConsole/Security/Groups";

import {
  AWSVM,
  AzureJobForm,
  ActiveDirectory,
  CustomeAPI,
  FlatFileCSV,
  Flexera,
  GoogleCloud,
  SQLForm,
  ServiceNow,
  ITune,
  WindowDefenderForm,
} from "../Components/core/AdminConsole/Jobs/index";
import FolderTable from "../Components/core/DataConsole/CreateFolder/MyFolderList";
import ReportFolder from "../Components/core/DataConsole/CreateFolder/ReportFolder";
import AllCharts from "../Components/core/DataConsole/CreateDashboard/AllCharts";
import OrginalSource from "../Components/core/DataConsole/Reports/OrginalSource";
import AT_AR_Rules from "../Components/core/DataConsole/Reports/AT_AR_Rules";
import DS_BY_DS from "../Components/core/DataConsole/Reports/DS_BY_DS";
import AllGraph from "../Components/core/DataConsole/CreateDashboard/AllGraph";
import CreateNEwFolder from "../Components/core/DataConsole/CreateFolder/index";
import FileList from "../Components/core/DataConsole/Reports/FileList";
import CreateNewFile from "../Components/core/DataConsole/CreateFile";

import FolderFilterView from "../Components/core/DataConsole/Reports/FoIderFilterView";
import ARTable from "../Components/core/AdminConsole/ARMapping/Table";
import { LoginPage } from "../pages/LoginPage";
import { Commom_Saved_Job } from "../Components/Common/Commom_Saved_Job";
import ReportsCommonTable from "../Components/core/DataConsole/Reports/JobData_Rules";
import ARRulesConfig from "../Components/core/AdminConsole/ARRules/ARRulesManager";
import FilterComponent from "../pages/AdvanceFilteration";
import AddSsoForm from "../Components/core/AdminConsole/Sso/AddSSoForm";
import SsoTable from "../Components/core/AdminConsole/Sso/SsoTable";
import AddStmpForm from "../Components/core/AdminConsole/Stmp/AddStmpForm";
import StmpTable from "../Components/core/AdminConsole/Stmp/StmpTable";
import { ScheduledEmailsTable } from "../Components/core/AdminConsole/ScheduledEmails";
import UserProfile from "../pages/UserProfile";
import DataConsoleWelcomePage from "../pages/DataConsoleLandingPage";
import AdminConsoleWelcomePage from "../pages/AdminConsoleLandingPage";
import { Register } from "../Components/core/DataConsole/Register/Register";
import ImportStatus from "../Components/core/AdminConsole/ImportStatus/ImportStatus";
import ObjectConfig from "../Components/core/DataConsole/Settings/ObjectConfiguration";
import AiPromptSettings from "../Components/core/AdminConsole/Settings/AiPromptSettings";
import AiModelSettings from "../Components/core/AdminConsole/Settings/AiModelSettings";
import ApplicationMenu from "../Components/core/AdminConsole/Jobs/MenuPage";
import { Suspense, useEffect, useState } from "react";
import { adminBaseUrl, axiosDefaultHeader } from "../Utility/baseUrl";
import axios from "axios";
import { CircularProgress } from "@mui/material";
import { getReadAllTheme, getRequest, getUser } from "../Service/api.service";
import { useTheme } from "../ThemeContext";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { getAllRoles } from "../redux/Slices/PermissionSlice";
import { useSelector } from "react-redux";
import EditPermissionPage from "../Components/Common/EditPermission";
import AddPermissionPage from "../Components/Common/AddPermissionModal";
import LogsScreen from "../Components/core/AdminConsole/LogModule/LogsScreen";
import Summary from "../Components/core/DataConsole/Register/Summary";
import { postAdminRequest } from "../Service/admin.save";

const UnauthorizedPage = () => {
  return (
    <div className="flex flex-col justify-center items-center h-full min-h-screen">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="text-white mb-4">
        You don't have permission to access this page.
      </p>
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Go Back
      </button>
    </div>
  );
};

const AppRoute = () => {
  const [isLogin, setIsLogin] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState("");
  const navigate = useNavigate();
  const { handleDefaultTheme, setLogoPath } = useTheme();
  const dispatch = useDispatch();
  const { permissionDetails } = useSelector((state) => state.permission);
  const ProtectedRoute = ({ element, routeName, type = "ReadOnly" }) => {
    const { permissionList, permissionDetails } = useSelector(
      (state) => state.permission,
    );

    const hasModuleAccess = permissionList.includes(routeName);

    const modulePermission = permissionDetails[routeName];

    const hasRequiredPermission =
      modulePermission?.permissionTypes?.includes(type);

    return hasModuleAccess && hasRequiredPermission ? (
      element
    ) : (
      <Navigate to="/unauthorized" replace />
    );
  };

  useEffect(() => {
    const login = localStorage.getItem("auth-token");
    setIsLogin(login);
    if (login) {
      axiosDefaultHeader(login);
      getReadAllTheme(`/theme/readAll`).then((res) => {
        localStorage.setItem("allTheme", JSON.stringify(res.data));
        const currentConsole = isAdminConsole ? "admin" : "data";
        if (res.data.length) {
          const themeForCurrentConsole = res.data.find(
            (theme) =>
              theme.console === "both" || theme.console === currentConsole,
          );

          if (themeForCurrentConsole) {
            setLogoPath(themeForCurrentConsole?.logoPath);
            localStorage.setItem(
              "isTheme",
              JSON.stringify(themeForCurrentConsole.id),
            );
            handleDefaultTheme(themeForCurrentConsole);
          } else {
            setLogoPath(res.data[0].logoPath);
            localStorage.setItem("isTheme", JSON.stringify(false));
            handleDefaultTheme();
          }
        } else {
          setLogoPath("");
          localStorage.setItem("isTheme", JSON.stringify(false));
          handleDefaultTheme();
        }
      });
      try {
        getUser(`/user/${localStorage.getItem("user-id")}/read`)
          .then((userRes) => {
            setUser(userRes.data);
            getRequest("/permission/readAll")
              .then(({ data }) => {
                const allPermissions = data
                  .filter((v) => {
                    return (
                      userRes.data?.permissionId?.includes(v.permissionId) ||
                      userRes.data?.groupPermissionIds?.includes(v.permissionId)
                    );
                  })
                  .map((v) => v.permissions)
                  .flat(1);

                dispatch(
                  getAllRoles({
                    // roles: res.data,
                    user: userRes.data,
                    allPermissions,
                  }),
                );
              })
              .finally(() => setLoading(false));
          })
          .catch(() => {
            setLoading(false);
          });
      } catch (error) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [isLogin]);

  const extractAndLoginWithSSO = async () => {
    try {
      setLoading(true);
      const { data: userInfo } = await axios.get(
        `${adminBaseUrl}/authenticate/userInfo`,
        { withCredentials: true },
      );
      if (!userInfo) {
        setLoading(false);
        return;
      }
      const accessToken = userInfo["access_token"];
      const refreshToken = userInfo["refreshToken"];
      const USER_ID = userInfo["userId"];
      if (!accessToken) {
        setLoading(false);
        return;
      }

      setIsLogin(accessToken);
      localStorage.setItem("auth-token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refresh-token", refreshToken);
      }
      if (USER_ID) {
        localStorage.setItem("user-id", USER_ID);
      }

      axiosDefaultHeader(accessToken);

      toast.success("SSO Login Successful!");
      navigate("/data-console");
    } catch (error) {
      console.error("Error during SSO login:", error);
      // toast.error("Failed to complete SSO login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const login = localStorage.getItem("auth-token");
    if (!login) extractAndLoginWithSSO();
  }, []);

  const location = useLocation();
  const isAdminConsole = location.pathname.includes("admin-console");

  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    failedQueue = [];
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      function (response) {
        const newToken = response.headers["x-new-token"];
        if (newToken) {
          localStorage.setItem("auth-token", newToken);
          axiosDefaultHeader(newToken);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({
                resolve: (token) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  resolve(axios(originalRequest));
                },
                reject: (error) => {
                  reject(error);
                },
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem("refresh-token");
            if (!refreshToken) {
              console.log("No refresh token available");
              throw new Error("No refresh token available");
            }

            const response = await axios.post(
              `http://20.244.24.90:8082/api/authenticate/refresh-token`,
              { refreshToken },
              {
                _retry: true,
              },
            );

            const newToken = response.data;
            localStorage.setItem("auth-token", newToken);
            axiosDefaultHeader(newToken);

            processQueue(null, newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            console.log("Token refresh failed:", refreshError);
            postAdminRequest("/authenticate/logout").catch((error) => {
              console.error("Logout error:", error);
            });
            localStorage.clear();
            setIsLogin("");
            toast.error("Session Expired", {
              id: error.response.status === 401 ? 401 : undefined,
            });
            navigate("/login");
            processQueue(refreshError, null);
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-full">
        <CircularProgress />
      </div>
    );
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      }
    >
      <Routes>
        {!loading && isLogin ? (
          <>
            <Route path="/advance-filter" element={<FilterComponent />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/" element={<Layout setIsLogin={setIsLogin} />}>
              <Route
                index
                element={<DataConsoleWelcomePage userName={user?.firstName} />}
              />
              <Route path="data-console">
                <Route
                  index
                  element={
                    <DataConsoleWelcomePage userName={user?.firstName} />
                  }
                />
                <Route path="profile" element={<UserProfile />} />
                <Route
                  path="dashboard/new-create"
                  element={
                    <ProtectedRoute
                      element={<NewDashboard routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="dashboard/create-folder"
                  element={
                    <ProtectedRoute
                      element={<CreateNEwFolder routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="dashboard/create-folder/:userId"
                  element={
                    <ProtectedRoute
                      element={<CreateNEwFolder routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="dashboard/create-file/:folderId"
                  element={
                    <ProtectedRoute
                      element={<CreateNewFile routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="dashboard/All-folders-list"
                  element={
                    <ProtectedRoute
                      element={<FolderTable routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Dashboard?.permissionTypes[0]
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="dash-folder/:folderId"
                  element={
                    <ProtectedRoute
                      element={<AllGraph routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Dashboard?.permissionTypes[0]
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="dashboard/my-folder/:id"
                  element={
                    <ProtectedRoute
                      element={<AllCharts routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Dashboard?.permissionTypes[0]
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="dashboard/report-folder"
                  element={
                    <ProtectedRoute
                      element={<ReportFolder routeName="Dashboard" />}
                      type={
                        permissionDetails?.Dashboard?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Dashboard?.permissionTypes[0]
                          : false
                      }
                      routeName="Dashboard"
                    />
                  }
                />
                <Route
                  path="register"
                  element={
                    <ProtectedRoute
                      element={<Register routeName="Register" />}
                      type={
                        permissionDetails?.Register?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Register?.permissionTypes[0]
                          : false
                      }
                      routeName="Register"
                    />
                  }
                />
                <Route
                  path="register/summary"
                  element={
                    <ProtectedRoute
                      element={<Summary routeName="Register" />}
                      type={
                        permissionDetails?.Register?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Register?.permissionTypes[0]
                          : false
                      }
                      routeName="Register"
                    />
                  }
                />
                <Route
                  path="register/detailed"
                  element={
                    <ProtectedRoute
                      element={<Register routeName="Register" />}
                      type={
                        permissionDetails?.Register?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Register?.permissionTypes[0]
                          : false
                      }
                      routeName="Register"
                    />
                  }
                />
                {/* <Route path="security/add-sso-configure" element={<AddSsoForm />}></Route> */}
                <Route
                  path="security/users"
                  element={
                    <ProtectedRoute
                      element={<UserTable routeName="Security" />}
                      type={
                        permissionDetails?.Security?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Security?.permissionTypes[0]
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />
                <Route
                  path="security/roles"
                  element={
                    <ProtectedRoute
                      element={<RoleTable routeName="Security" />}
                      type={
                        permissionDetails?.Security?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Security?.permissionTypes[0]
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />
                <Route
                  path="security/permission"
                  element={
                    <ProtectedRoute
                      element={<PermissionTypeTable routeName="Security" />}
                      type={
                        permissionDetails?.Security?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Security?.permissionTypes[0]
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />

                <Route
                  path="security/permission/edit/:id"
                  element={
                    <ProtectedRoute
                      element={<EditPermissionPage routeName="Security" />}
                      type={
                        permissionDetails?.Security?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />
                <Route
                  path="security/permission/add"
                  element={
                    <ProtectedRoute
                      element={<AddPermissionPage routeName="Security" />}
                      type={
                        permissionDetails?.Security?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />

                <Route
                  path="security/groups"
                  element={
                    <ProtectedRoute
                      element={<GroupsTable routeName="Security" />}
                      type={
                        permissionDetails?.Security?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Security?.permissionTypes[0]
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />
                {/* <Route path="security/register" element={<Register/>}></Route> */}
                <Route
                  path="security/theme-selector"
                  element={
                    <ProtectedRoute
                      element={<ColorSelector routeName="Security" />}
                      type={
                        permissionDetails?.Security?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />
                <Route
                  path="reports/original-source"
                  element={
                    <ProtectedRoute
                      element={<OrginalSource routeName="Reports" />}
                      type={
                        permissionDetails?.Reports?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Reports?.permissionTypes[0]
                          : false
                      }
                      routeName="Reports"
                    />
                  }
                />
                <Route
                  path="reports/original-source/jobs/:jobName"
                  element={
                    <ProtectedRoute
                      element={
                        <ReportsCommonTable
                          routeName="Reports"
                          title="Original Source"
                          type="getAC"
                        />
                      }
                      type={
                        permissionDetails?.Reports?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Reports?.permissionTypes[0]
                          : false
                      }
                      routeName="Reports"
                    />
                  }
                />
                <Route
                  path="reports/by-ar-resource/jobs/:jobName"
                  element={
                    <ProtectedRoute
                      element={
                        <ReportsCommonTable
                          routeName="Reports"
                          title="By AR Source"
                          type="getDC"
                        />
                      }
                      type={
                        permissionDetails?.Reports?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Reports?.permissionTypes[0]
                          : false
                      }
                      routeName="Reports"
                    />
                  }
                />
                <Route
                  path="reports/by-ar-resource"
                  element={
                    <ProtectedRoute
                      element={<AT_AR_Rules routeName="Reports" />}
                      type={
                        permissionDetails?.Reports?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Reports?.permissionTypes[0]
                          : false
                      }
                      routeName="Reports"
                    />
                  }
                />
                {/* <Route
                 path="reports/ds-by-ds"
                 element={<ProtectedRoute element={<DS_BY_DS routeName="Reports" />} type routeName="Reports" />} /> */}
                <Route
                  path="reports/file-list/:folderId"
                  element={
                    <ProtectedRoute
                      element={<FileList routeName="Reports" />}
                      type={
                        permissionDetails?.Reports?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Reports?.permissionTypes[0]
                          : false
                      }
                      routeName="Reports"
                    />
                  }
                />
                <Route
                  path="reports/folder-list-filter"
                  element={
                    <ProtectedRoute
                      element={<FolderFilterView routeName="Reports" />}
                      type={
                        permissionDetails?.Reports?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Reports?.permissionTypes[0]
                          : false
                      }
                      routeName="Reports"
                    />
                  }
                />
                <Route
                  path="settings/sso-configuration"
                  element={
                    <ProtectedRoute
                      element={<AddSsoForm routeName="Settings" />}
                      // type={
                      //   permissionDetails?.Settings?.hasWriteOnly
                      //     ? "WriteOnly"
                      //     : false
                      // }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/smtp-configuration"
                  element={
                    <ProtectedRoute
                      element={<AddStmpForm routeName="Settings" />}
                      // type={
                      //   permissionDetails?.Settings?.hasWriteOnly
                      //     ? "WriteOnly"
                      //     : false
                      // }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/smtp/all-tables"
                  element={
                    <ProtectedRoute
                      element={<StmpTable routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/sso/all-tables"
                  element={
                    <ProtectedRoute
                      element={<SsoTable routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/object-configuration"
                  element={
                    <ProtectedRoute
                      element={<ObjectConfig routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/scheduled-emails"
                  element={
                    <ProtectedRoute
                      element={<ScheduledEmailsTable routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
              </Route>
              <Route path="admin-console">
                <Route
                  index
                  element={
                    <AdminConsoleWelcomePage userName={user?.firstName} />
                  }
                />
                <Route path="profile" element={<UserProfile />} />
                <Route
                  path="import-status"
                  element={
                    <ProtectedRoute
                      element={<ImportStatus routeName="Import Status" />}
                      type={
                        permissionDetails?.[
                          "Import Status"
                        ]?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.["Import Status"]
                              ?.permissionTypes[0]
                          : false
                      }
                      routeName="Import Status"
                    />
                  }
                />
                <Route
                  path="job-menu"
                  element={
                    <ProtectedRoute
                      element={<ApplicationMenu routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.["Add Jobs"]?.permissionTypes[0]
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="saved-jobs"
                  element={
                    <ProtectedRoute
                      element={
                        <Commom_Saved_Job
                          heading="Saved Jobs"
                          path="tables"
                          routeName="Saved Jobs"
                        />
                      }
                      type={
                        permissionDetails?.["Saved Jobs"]?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.["Saved Jobs"]
                              ?.permissionTypes[0]
                          : false
                      }
                      routeName="Saved Jobs"
                    />
                  }
                />
                {/* <Route path='ar-mapping/saved-jobs'
            element={<Commom_Saved_Job heading='AR Mapping/ Saved Jobs'
              path='/admin-console/ar-mapping/tables' />}></Route> */}

                <Route
                  path="ar-mapping"
                  element={
                    <ProtectedRoute
                      element={
                        <Commom_Saved_Job
                          heading="AR Mapping"
                          path="tables"
                          routeName="A R Mapping"
                        />
                      }
                      type={
                        permissionDetails?.["Saved Jobs"]?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.["Saved Jobs"]
                              ?.permissionTypes[0]
                          : false
                      }
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="saved-jobs/tables/:jobName"
                  element={
                    <ProtectedRoute
                      element={<ARTable routeName="Saved Jobs" />}
                      type={
                        permissionDetails?.["Saved Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="ar-mapping/tables/:jobName"
                  element={
                    <ProtectedRoute
                      element={<ARTable routeName="A R Mapping" />}
                      // type={
                      //   permissionDetails?.["A R Mapping"]?.hasWriteOnly
                      //     ? "WriteOnly"
                      //     : false
                      // }
                      routeName="A R Mapping"
                    />
                  }
                />
                <Route
                  path="ar-rules"
                  element={
                    <ProtectedRoute
                      element={<ARRulesConfig routeName="A R Rules" />}
                      type={
                        permissionDetails?.["A R Rules"]?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.["A R Rules"]?.permissionTypes[0]
                          : false
                      }
                      routeName="A R Rules"
                    />
                  }
                />
                <Route
                  path="Logs"
                  element={
                    <ProtectedRoute
                      element={<LogsScreen routeName="Logs" />}
                      type={
                        permissionDetails?.Logs?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Logs?.permissionTypes[0]
                          : false
                      }
                      routeName="Logs"
                    />
                  }
                />
                <Route
                  path="add-jobs/azure"
                  element={
                    <ProtectedRoute
                      element={<AzureJobForm routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/active-directory"
                  element={
                    <ProtectedRoute
                      element={<ActiveDirectory routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/aws-vm"
                  element={
                    <ProtectedRoute
                      element={<AWSVM routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/custom-api"
                  element={
                    <ProtectedRoute
                      element={<CustomeAPI routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/flat-file-csv"
                  element={
                    <ProtectedRoute
                      element={<FlatFileCSV routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/flexera"
                  element={
                    <ProtectedRoute
                      element={<Flexera routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/google-cloud"
                  element={
                    <ProtectedRoute
                      element={<GoogleCloud routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/ms-defender"
                  element={
                    <ProtectedRoute
                      element={<WindowDefenderForm routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/sql"
                  element={
                    <ProtectedRoute
                      element={<SQLForm routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/itune"
                  element={
                    <ProtectedRoute
                      element={<ITune routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="add-jobs/service-now"
                  element={
                    <ProtectedRoute
                      element={<ServiceNow routeName="Add Jobs" />}
                      type={
                        permissionDetails?.["Add Jobs"]?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Add Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/flat-file-csv"
                  element={
                    <ProtectedRoute
                      element={<FlatFileCSV routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/flexera"
                  element={
                    <ProtectedRoute
                      element={<Flexera routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/google-cloud"
                  element={
                    <ProtectedRoute
                      element={<GoogleCloud routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/ms-defender"
                  element={
                    <ProtectedRoute
                      element={<WindowDefenderForm routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/sql"
                  element={
                    <ProtectedRoute
                      element={<SQLForm routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/itune"
                  element={
                    <ProtectedRoute
                      element={<ITune routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/service-now"
                  element={
                    <ProtectedRoute
                      element={<ServiceNow routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/azure"
                  element={
                    <ProtectedRoute
                      element={<AzureJobForm routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/active-directory"
                  element={
                    <ProtectedRoute
                      element={<ActiveDirectory routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/aws-vm"
                  element={
                    <ProtectedRoute
                      element={<AWSVM routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="edit-jobs/custom-api"
                  element={
                    <ProtectedRoute
                      element={<CustomeAPI routeName="Saved Jobs" />}
                      routeName="Saved Jobs"
                    />
                  }
                />
                <Route
                  path="security/theme-selector"
                  element={
                    <ProtectedRoute
                      element={<ColorSelector routeName="Security" />}
                      type={
                        permissionDetails?.Security?.hasWriteOnly
                          ? "WriteOnly"
                          : false
                      }
                      routeName="Security"
                    />
                  }
                />
                <Route
                  path="settings/sso-configuration"
                  element={
                    <ProtectedRoute
                      element={<AddSsoForm routeName="Settings" />}
                      // type={
                      //   permissionDetails?.Settings?.hasWriteOnly
                      //     ? "WriteOnly"
                      //     : false
                      // }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/smtp-configuration"
                  element={
                    <ProtectedRoute
                      element={<AddStmpForm routeName="Settings" />}
                      // type={
                      //   permissionDetails?.Settings?.hasWriteOnly
                      //     ? "WriteOnly"
                      //     : false
                      // }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/smtp/all-tables"
                  element={
                    <ProtectedRoute
                      element={<StmpTable routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/sso/all-tables"
                  element={
                    <ProtectedRoute
                      element={<SsoTable routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/object-configuration"
                  element={
                    <ProtectedRoute
                      element={<ObjectConfig routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/ai-prompts"
                  element={
                    <ProtectedRoute
                      element={<AiPromptSettings routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/ai-model"
                  element={
                    <ProtectedRoute
                      element={<AiModelSettings routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
                <Route
                  path="settings/scheduled-emails"
                  element={
                    <ProtectedRoute
                      element={<ScheduledEmailsTable routeName="Settings" />}
                      type={
                        permissionDetails?.Settings?.permissionTypes.find(
                          (v) => v === "ReadOnly" || v === "WriteOnly",
                        )
                          ? permissionDetails?.Settings?.permissionTypes[0]
                          : false
                      }
                      routeName="Settings"
                    />
                  }
                />
              </Route>
              {isAdminConsole ? (
                <Route
                  exact
                  path="*"
                  element={<Navigate to="/admin-console" />}
                />
              ) : (
                <Route
                  exact
                  path="*"
                  element={<Navigate to="/data-console" />}
                />
              )}
            </Route>
          </>
        ) : (
          <>
            <Route
              path="/login"
              element={<LoginPage setIsLogin={setIsLogin} />}
            />
            <Route
              exact
              path="*"
              element={<LoginPage setIsLogin={setIsLogin} />}
            />
          </>
        )}
      </Routes>
    </Suspense>
  );
};

export default AppRoute;
