import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { IoMenuOutline } from "react-icons/io5";
import { Menu, MenuItem } from "@mui/material";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import Sidebar from "./Sidebar";
import profileImg from "../../assets/account.png";
import { useTheme } from "../../ThemeContext";
import HeadingTitle from "./HeadingTitle";
import ThemeModal from "./ThemeModal";
import GlobalChatbot from "./GlobalChatbot";
import {
  setSelectedObject,
  setSelectedObjectName,
} from "../../redux/Slices/ObjectSelection";
import { getRequest } from "../../Service/api.service";
// import { useMsal } from "@azure/msal-react";
import useResize from "../../Hooks/useResize";
import { getAdminRequest, postAdminRequest } from "../../Service/admin.save";
import axios from "axios";
import { adminBaseUrl } from "../../Utility/baseUrl";

const Layout = ({ setIsLogin }) => {
  const { bgColor } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminConsole = location.pathname.includes("admin-console");
  const showGlobalChatbot =
    location.pathname.startsWith("/data-console") ||
    location.pathname.startsWith("/admin-console");
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const headingTitle = useSelector((state) => state.title.headingTitle);
  const { user } = useSelector((state) => state.permission);
  const [objectData, setObjectData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const dispatch = useDispatch();
  // const headingTitle = useSelector((state) => state.title.headingTitle);
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const hideSidebar = () => {
    setSidebarOpen(false);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  // const { instance } = useMsal();
  const handleLogout = async () => {
    console.log("User logged out");
    // if (localStorage.getItem("loginType") == "sso")
    //   await instance.logoutPopup();
    axios
      .get(`${adminBaseUrl}/authenticate/logout`, { withCredentials: true })
      .catch((error) => {
        console.error("Logout error:", error);
      });
    handleMenuClose();
    setIsLogin(false);
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const fetchAllObjects = async () => {
      setLoading(true);
      try {
        const response = await getRequest("/objects/readAll");
        setObjectData(response?.data || []);
        const savedObject = localStorage.getItem("selectedObject");
        const selectedObjectName = localStorage.getItem("selectedObjectName");
        if (savedObject) {
          dispatch(setSelectedObject(savedObject));
          dispatch(setSelectedObjectName(selectedObjectName));
        }
      } catch (error) {
        console.log("Error fetchAllObjects", error);
        setObjectData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllObjects();
  }, []);
  const { isLgUp, isDesktop } = useResize();
  useEffect(() => {
    if (isLgUp) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [isLgUp]);

  // update document title whenever the route or heading changes
  useEffect(() => {
    if (headingTitle && headingTitle.length) {
      document.title = `ITAMExperts - ${headingTitle}`;
    } else {
      // fallback: derive from path segments
      const path = location.pathname.replace(/^\//, "");
      const parts = path.split("/").filter(Boolean);
      let base = parts.join(" - ");
      if (!base) base = "Home";
      // capitalize first letter
      base = base.charAt(0).toUpperCase() + base.slice(1);
      document.title = `ITAMExperts - ${base}`;
    }
  }, [location.pathname, headingTitle]);

  return (
    <div
      className="w-full h-[100vh] overflow-hidden grid grid-cols-12"
      style={{ background: bgColor.backgroundColor }}
    >
      {sidebarOpen && (
        <aside
          className="col-span-12 sm:col-span-3 lg:col-span-2 h-[100vh] fixed top-0 left-0 z-50 transform transition-all duration-300 sm:static sm:translate-x-0"
          style={{
            width: isDesktop ? "auto" : 300,
            background: bgColor.backgroundColor,
          }}
        >
          <Sidebar
            className="w-[90%] h-full"
            toggleSidebar={toggleSidebar}
            hideSidebar={hideSidebar}
          />
        </aside>
      )}
      <main
        className={`${
          sidebarOpen
            ? "col-span-12 sm:col-span-9 lg:col-span-10"
            : "col-span-12"
        } flex flex-col bg-[#EAEDFB] my-3 rounded-[20px] overflow-y-auto relative`}
      >
        <nav className="h-[60px] flex justify-between items-center sm:px-4 px-1 shadow-md rounded-t-[20px]">
          <div className="w-fit flex sm:gap-5 gap-2 items-center">
            <IoMenuOutline
              className="w-[30px] h-[30px] sm:w-[40px] sm:h-[40px] cursor-pointer"
              onClick={toggleSidebar}
            />
            <HeadingTitle />
          </div>
          <div className="flex items-center sm:gap-3 gap-1">
            <select
              id="object"
              name="objectId"
              className="w-fit sm:p-3 p-2 border rounded-md shadow-sm text-white"
              style={{ backgroundColor: bgColor.backgroundColor }}
              value={selectedObject}
              onChange={(e) => {
                dispatch(setSelectedObject(e.target.value));
                dispatch(
                  setSelectedObjectName(
                    objectData.find((v) => v.objectId == e.target.value)
                      ?.objectName || "",
                  ),
                );
                localStorage.setItem("selectedObject", e.target.value);
                localStorage.setItem(
                  "selectedObjectName",
                  objectData.find((v) => v.objectId == e.target.value)
                    ?.objectName || "",
                );
              }}
            >
              <option value="">All Object</option>
              {objectData.length && !loading ? (
                objectData?.map((obj) => (
                  <option key={obj.objectId} value={obj.objectId}>
                    {obj.objectName}
                  </option>
                ))
              ) : loading ? (
                <option disabled>Loading...</option>
              ) : (
                !objectData.length &&
                !loading && <option disabled>No Object Found</option>
              )}
            </select>
            {/* <img
              src={profileImg}
              alt="profile"
              className="w-[35px] h-[35px] rounded-full object-cover"
              onClick={handleMenuOpen}
            /> */}
            <div
              onClick={handleMenuOpen}
              className={"w-[35px] h-[35px] rounded-full"}
              style={{ backgroundColor: bgColor.backgroundColor }}
            >
              <p
                className="text-sm font-semibold flex items-center justify-center h-full"
                style={{ color: bgColor.layoutTextColor }}
              >
                {user?.firstName && user?.firstName.charAt(0).toUpperCase()}{" "}
                {user?.lastName && user?.lastName.charAt(0).toUpperCase()}
              </p>
            </div>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem onClick={handleMenuClose}>
                {isAdminConsole ? (
                  <Link
                    to="/admin-console/profile"
                    className="w-full text-black"
                  >
                    Profile
                  </Link>
                ) : (
                  <Link
                    to="/data-console/profile"
                    className="w-full text-black"
                  >
                    Profile
                  </Link>
                )}
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </div>
        </nav>
        <section
          className="bg-text_gray-75 w-full   flex-grow overflow-y-auto p-4"
          style={{
            height: "calc(100% - 60px)",
            // scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* <style>
             {`
                            section::-webkit-scrollbar {
                                display: none;
                            }
                        `} 
          </style> */}
          <Outlet />
        </section>
      </main>
      <ThemeModal />
      {showGlobalChatbot && <GlobalChatbot />}
    </div>
  );
};
export default Layout;
