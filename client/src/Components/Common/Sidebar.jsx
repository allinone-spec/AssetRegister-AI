import { FaAngleDown } from "react-icons/fa6";
import logo from "../../assets/logo.png";
import { Link } from "react-router-dom";
import sidebarData from "../../Data/FileExplorerData";
import adminConsoleSidebarData from "../../Data/AdminConsole";
import FileExplorer from "./FileExplorer";
import FavoritesPanel from "./FavoritesPanel";
import { FaExternalLinkAlt } from "react-icons/fa";
import { useState, useEffect } from "react";
import useTreeLogic from "../../Hooks/FileLogic";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setFoldersData } from "../../redux/Slices/FolderSlice";
import { setFavorites } from "../../redux/Slices/FavoritesSlice";
import { openModal } from "../../redux/Slices/ThemeModalSclice";
import { useTheme } from "../../ThemeContext";
import { getRequest } from "../../Service/api.service";
import { baseUrl, imageBaseUrl } from "../../Utility/baseUrl";
import toast from "react-hot-toast";
import { IoClose } from "react-icons/io5";
import useResize from "../../Hooks/useResize";

const Sidebar = ({ toggleSidebar, hideSidebar }) => {
  const location = useLocation();
  const [folders, setFolders] = useState([]);
  const [foldersReport, setFoldersReport] = useState([]);
  // const [files, setFiles] = useState([]);
  const { colorPalette, selectedColor, bgColor, logoPath } = useTheme();
  const { layoutTextColor } = bgColor;
  const isAdminConsole = location.pathname.includes("admin-console");
  // const [isAdminConsoleClicked, setIsAdminConsoleClicked] = useState(false);
  const [imageError, setImageError] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState({});
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const { isLgUp } = useResize();

  useEffect(() => {
    setImageError(false);
  }, [logoPath]);

  const handleSearchChange = (menuIndex, value) => {
    setSearchText((prev) => ({
      ...prev,
      [menuIndex]: value.toLowerCase(),
    }));
  };

  const handleImageError = () => setImageError(true);

  const getImageSrc = () => {
    if (!logoPath || imageError) return logo;

    return imageBaseUrl + logoPath;
  };

  const extractAllFavorites = (folders) => {
    const favorites = [];

    const traverse = (folderList) => {
      if (!Array.isArray(folderList)) return;

      folderList.forEach((folder) => {
        if (folder.favourite === true) {
          favorites.push(folder);
        }

        // Recursively check childFolders
        if (folder.childFolders && Array.isArray(folder.childFolders)) {
          traverse(folder.childFolders);
        }
      });
    };

    traverse(folders);
    return favorites;
  };

  const fetchFolders = async () => {
    try {
      const user = localStorage.getItem("user-id");
      const sourcetype = "Dashboard";
      const response = await getRequest(`/folder/${user}/user/${sourcetype}`);
      localStorage.setItem("myFolders", JSON.stringify(response?.data));
      setFolders(response?.data || []);

      // Extract favorites from all levels of the folder hierarchy
      const dashboardFavorites = extractAllFavorites(response?.data || []);
      dispatch(setFavorites({ dashboardFavorites }));
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const fetchReportFolders = async () => {
    try {
      const user = localStorage.getItem("user-id");
      const sourcetype = "Report";
      const response = await getRequest(`/folder/${user}/user/${sourcetype}`);
      localStorage.setItem("myReportFolders", JSON.stringify(response?.data));
      setFoldersReport(response?.data || []);

      // Extract favorites from all levels of the folder hierarchy
      const reportFavorites = extractAllFavorites(response?.data || []);
      dispatch(setFavorites({ reportFavorites }));
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  // const fetchFiles = async () => {
  //   try {
  //     const response = await getRequest("/files/1/get");
  //     setFiles(response.data);
  //   } catch (error) {
  //     console.error("Error fetching folders:", error);
  //   }
  // };

  const fetchChartFavorites = async () => {
    try {
      const response = await getRequest("/dashboard/readAll");

      if (response?.status === 200 && response?.data) {
        const favoriteCharts = response.data.filter(
          (dashboard) => dashboard.favourite === true,
        );
        dispatch(setFavorites({ chartFavorites: favoriteCharts }));
      } else dispatch(setFavorites({ chartFavorites: [] }));
    } catch (error) {
      console.error("Error fetching chart favorites:", error);
    }
  };

  const fetchViewFavorites = async () => {
    try {
      const response = await getRequest("/view/readAll");

      if (response?.status === 200 && response?.data) {
        const favoriteViews = response.data.filter(
          (view) => view.favourite === true,
        );
        dispatch(setFavorites({ viewFavorites: favoriteViews }));
      } else dispatch(setFavorites({ viewFavorites: [] }));
    } catch (error) {
      console.error("Error fetching view favorites:", error);
    }
  };

  useEffect(() => {
    // fetchFiles();
    fetchFolders();
    fetchReportFolders();
    fetchChartFavorites();
    fetchViewFavorites();
  }, []);

  const updatedSidebarData = sidebarData.map((section) => {
    if (section.title === "Dashboard" && section.Links.length >= 2) {
      const dashboardFolders = folders.map((folder) => ({
        ...folder,
        type: "dashboard",
      }));

      return {
        ...section,
        Links: [
          section.Links[0], // First link
          ...dashboardFolders, // Insert folders with type
          section.Links.at(-1), // Last link
        ],
      };
    }

    if (section.title === "Reports" && section.Links.length >= 2) {
      const reportFolders = foldersReport.map((folder) => ({
        ...folder,
        type: "reports",
      }));

      return {
        ...section,
        Links: [
          section.Links[0],
          section.Links[1],
          section.Links[2],
          ...reportFolders,
          section.Links.at(-1),
        ],
      };
    }

    return section;
  });

  // useEffect(() => {
  //   const savedState = localStorage.getItem("isAdminConsoleClicked");
  //   if (savedState === "true") {
  //     setIsAdminConsoleClicked(true);
  //   }
  // }, []);

  const handleConsoleRedirect = (consoleType) => {
    const url = consoleType === "admin" ? "/admin-console" : "/data-console";
    window.open(url, "_blank");
  };

  const { insertNode } = useTreeLogic();
  const filterFolder = sidebarData
    .filter((data) => data.Folder === true)
    .map((data) => ({
      ...data,
      Links: data.Links.filter((link) => link.isFolder === true),
    }));

  const [treeData, setTreeData] = useState(filterFolder[0]);

  const handleInsertNode = (folderId, item, isFolder) => {
    const updatedTree = insertNode(treeData, folderId, item, isFolder);
    setTreeData({ ...updatedTree });
  };

  const handleCreateFolder = (title) => {
    dispatch(setFoldersData([treeData]));
    navigate("/data-console/dashboard/create-folder", {
      state: { sourceType: title === "Dashboard" ? "DashBoard" : "Report" },
    });
  };

  const handlenavigate = () => {
    navigate("/admin-console/job-menu");
  };

  const onEnterClick = (folderName) => {
    setTreeData({
      ...treeData,
      Links: [
        ...treeData.Links,
        {
          id: String(Number(...treeData?.Links.at(-1).id) + 1),
          isFolder: true,
          name: folderName,
          Links: [],
        },
      ],
    });
  };

  const fetchLogoByID = async () => {
    try {
      const response = await fetch(`${baseUrl}/logo/5/get`);
      const result = await response.json();
      if (response?.status === 404) {
        toast.error("Logo Id is Not Found");
      }
    } catch (error) {
      console.error("Failed to update logo:", error.response);
      toast.error("Failed to update logo. Please try again.");
    }
  };

  return (
    <div className="h-screen w-[100%] text-white flex flex-col">
      <div className="flex flex-col items-center mb-6">
        <div className="flex justify-between items-center">
          <img
            src={getImageSrc()}
            alt="ITAMExperts Logo"
            style={{ maxWidth: 250, maxHeight: 100 }}
            className={`${
              logoPath && !imageError ? "my-5 ms-2" : "mb-2"
            } mx-auto w-full xl:overflow-hidden object-contain`}
            onError={handleImageError}
          />
          <IoClose
            className="w-[30px] h-[30px] sm:w-[40px] sm:h-[40px] cursor-pointer xl:hidden"
            onClick={toggleSidebar}
          />
        </div>

        <h1
          className="text-xl font-semibold font-plus-jakarta text-left cursor-pointer px-4 py-2 rounded-tl-[20px] rounded-tr-[3px] rounded-br-[0px] rounded-bl-[20px] w-full gap-0 bg-transparent group-hover:text-black transition"
          style={{ color: layoutTextColor }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(211, 211, 211, 0.47")
          }
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          onClick={() => {
            if (isAdminConsole) navigate("admin-console");
            else navigate("data-console");

            if (!isLgUp) hideSidebar();
          }}
        >
          <span>{isAdminConsole ? " Admin Console" : "Data Console"}</span>
        </h1>
      </div>

      {/* Favorites Panel - Only show in Data Console */}
      {!isAdminConsole && (
        <div className="mb-4">
          <FavoritesPanel hideSidebar={hideSidebar} />
        </div>
      )}

      <ul className="space-y-4 mx-auto w-[100%]">
        {!isAdminConsole &&
          updatedSidebarData.map((item, index) =>
            permissionList?.includes(item.title) ? (
              <li
                key={index}
                className="group relative font-[600]"
                onClick={() => {
                  if (!item.Links) {
                    navigate(item.path);
                    if (!isLgUp) hideSidebar();
                  }
                }}
              >
                <div
                  className="flex items-center cursor-pointer px-10 py-2 rounded-tl-[20px] rounded-tr-[3px] rounded-br-[0px] rounded-bl-[20px] w-[100%] h-[51px] gap-0 group-hover:text-[#000] transition"
                  style={{
                    background: "transparent",
                    color: layoutTextColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(211, 211, 211, 0.47)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.target.style.color = layoutTextColor;
                  }}
                >
                  <span
                    className="flex w-[150px] gap-[10px]"
                    style={{ color: layoutTextColor }}
                  >
                    {item.icon}
                    <span
                      className="font-[600]"
                      style={{ color: layoutTextColor }}
                    >
                      {item.title}
                    </span>
                  </span>
                  {item.Links?.length > 0 && (
                    <FaAngleDown
                      className="text-lg"
                      style={{ color: layoutTextColor }}
                    />
                  )}
                </div>
                {item.Links?.length > 0 && (
                  <ul
                    className="absolute z-50 left-full   top-0 hidden group-hover:flex min-w-[16rem]  w-[30vw]  flex-col bg-white text-white rounded-r-xl rounded-b-xl shadow-lg px-4 py-2 space-y-2"
                    onMouseEnter={(e) => e.stopPropagation()}
                  >
                    {item.Links?.map((subItem, index) => {
                      const stableKey =
                        subItem?.id ||
                        subItem?.path ||
                        `${item.title}-${subItem?.title || "item"}-${index}`;

                      if (subItem?.accessType) {
                        return (
                          <FileExplorer
                            hideSidebar={hideSidebar}
                            key={stableKey}
                            exp={subItem}
                            fetchFolders={
                              item.title === "Dashboard"
                                ? fetchFolders
                                : fetchReportFolders
                            }
                            onEnterClick={onEnterClick}
                            onInsertNode={handleInsertNode}
                            title={item.title}
                            routeTitle={
                              item.title === "Dashboard"
                                ? "dashboard"
                                : "report"
                            }
                            sourceType={
                              item.title === "Dashboard"
                                ? "DashBoard"
                                : "Report"
                            }
                          />
                        );
                      }

                      if (subItem?.path) {
                        // Check if it's a create action and user has write permissions, or if it's a regular navigation item
                        return (
                          (subItem.title.toLowerCase().includes("create")
                            ? permissionList.includes(item.title) &&
                              permissionDetails[item.title]?.hasWriteOnly
                            : permissionList?.includes(item.title)) && (
                            <Link key={stableKey} to={subItem.path}>
                            <li
                              onClick={() => {
                                if (!isLgUp) hideSidebar();
                              }}
                              className={`text-sm cursor-pointer ${
                                (item.title === "Dashboard" ||
                                  subItem.title === "DS By DS") &&
                                "border-b-2 border-gray"
                              } text-[#000] py-2 text-[0.95rem] hover:text-[#000] px-2`}
                              style={{
                                background: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(211, 211, 211, 0.47)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              {subItem.title}
                            </li>
                          </Link>
                          )
                        );
                      }

                      return (
                        // : <></>
                        subItem?.icon &&
                        permissionList.includes(item.title) &&
                        permissionDetails[item.title]?.hasWriteOnly && (
                          <div
                            key={stableKey}
                            className={`flex justify-between border-t-2 border-gray cursor-pointer px-5  items-center text-[#000] font-[600]`}
                            onClick={() => {
                              handleCreateFolder(item.title);
                              if (!isLgUp) hideSidebar();
                            }}
                          >
                            <span>{subItem.title}</span>
                            <span className="w-[50px]">{subItem.icon}</span>
                          </div>
                        )
                      );
                    })}
                    {item?.button &&
                      permissionList.includes(item.title) &&
                      permissionDetails[item.title]?.hasWriteOnly && (
                        <li
                          className="text-sm cursor-pointer text-[#000] py-2 text-[0.95rem]  hover:text-[#000] rounded-xl px-2 "
                          style={{
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(211, 211, 211, 0.47)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                          onClick={() => {
                            dispatch(openModal());
                            if (!isLgUp) hideSidebar();
                          }}
                        >
                          {item?.button?.title}
                        </li>
                      )}
                  </ul>
                )}
              </li>
            ) : null,
          )}

        {isAdminConsole &&
          adminConsoleSidebarData.map((item, index) =>
            permissionList?.includes(item.title) ? (
              <li
                key={index}
                className="group relative font-[600]"
                onClick={() => {
                  if (!item.Links) {
                    if (!isLgUp) hideSidebar();
                  }
                }}
              >
                {[
                  "Import Status",
                  "A R Mapping",
                  "Saved Jobs",
                  "A R Rules",
                  "Logs",
                ].includes(item?.title) ? (
                  <Link to={`${item.path}`}>
                    <div
                      className="flex justify-evenly items-center cursor-pointer px-4 py-2 rounded-tl-[20px] rounded-tr-[3px] rounded-br-[0px] rounded-bl-[20px] w-[100%] h-[51px] gap-0  transition"
                      style={{
                        background: "transparent",
                        color: layoutTextColor,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(211, 211, 211, 0.47)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.target.style.color = layoutTextColor;
                      }}
                    >
                      <span
                        className="flex w-[150px]  gap-[10px]"
                        style={{
                          color: layoutTextColor,
                        }}
                      >
                        {item.icon}
                        <span
                          className="font-[600]"
                          style={{
                            color: layoutTextColor,
                          }}
                        >
                          {item.title}
                        </span>
                      </span>
                      <FaAngleDown
                        className="text-lg invisible"
                        style={{ color: layoutTextColor }}
                      />
                    </div>
                  </Link>
                ) : (
                  <div
                    className="flex justify-evenly items-center cursor-pointer px-4 py-2 rounded-tl-[20px] rounded-tr-[3px] rounded-br-[0px] rounded-bl-[20px] w-[100%] h-[51px] gap-0] transition"
                    style={{
                      background: "transparent",
                      color: layoutTextColor,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(211, 211, 211, 0.47)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    onClick={
                      item?.title === "Add Jobs"
                        ? () => handlenavigate("job-menu")
                        : undefined
                    }
                  >
                    <span
                      className="flex w-[150px]  gap-[10px]"
                      style={{
                        color: layoutTextColor,
                      }}
                    >
                      {item.icon}
                      <span
                        className="font-[600]"
                        style={{
                          color: layoutTextColor,
                        }}
                      >
                        {item.title}
                      </span>
                    </span>
                    <FaAngleDown
                      className="text-lg"
                      style={{ color: layoutTextColor }}
                    />
                  </div>
                )}
                {item.Links?.length > 0 && (
                  <ul
                    className="absolute z-50 left-full top-0 hidden group-hover:flex min-w-[16rem] h-[200px] overflow-y-scroll w-[30vw]  flex-col bg-white text-white rounded-r-xl rounded-b-xl shadow-lg px-4 py-2 space-y-2 overflowY-auto"
                    onMouseEnter={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      placeholder="Search..."
                      className="text-black px-2 py-1 rounded border border-gray-300 w-full"
                      value={searchText[index] || ""}
                      onChange={(e) =>
                        handleSearchChange(index, e.target.value)
                      }
                    />

                    {item.Links.filter((subItem) =>
                      subItem.title
                        .toLowerCase()
                        .includes(searchText[index] || ""),
                    ).map((subItem, subIndex) =>
                      subItem?.accessType ? (
                        <FileExplorer
                          key={subIndex}
                          exp={treeData}
                          subItem={subItem}
                          onInsertNode={handleInsertNode}
                          title={item.title}
                          hideSidebar={hideSidebar}
                        />
                      ) : (
                        <Link key={subIndex} to={subItem.path}>
                          <li
                            className="text-sm cursor-pointer text-[#000] py-2 text-[0.95rem] rounded-xl px-2"
                            style={{ background: "transparent" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(211, 211, 211, 0.47)";
                            }}
                            onClick={() => {
                              if (!isLgUp) hideSidebar();
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {subItem.title}
                          </li>
                        </Link>
                      ),
                    )}

                    {item?.button &&
                      permissionList.includes(item.title) &&
                      permissionDetails[item.title]?.hasWriteOnly && (
                        <li
                          className="text-sm cursor-pointer text-[#000] py-2 text-[0.95rem]  rounded-xl px-2 "
                          style={{
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(211, 211, 211, 0.47)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                          onClick={() => {
                            dispatch(openModal());
                            if (!isLgUp) hideSidebar();
                          }}
                        >
                          {item?.button?.title}
                        </li>
                      )}
                  </ul>
                )}
              </li>
            ) : null,
          )}
        <li className="group relative font-semibold">
          <div
            className="flex justify-between items-center cursor-pointer px-4 py-2 rounded-tl-[20px] rounded-tr-[3px] rounded-br-[0px] rounded-bl-[20px] w-full h-[51px] gap-0 bg-transparent group-hover:text-black transition"
            style={{ color: layoutTextColor }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(211, 211, 211, 0.47")
            }
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            onClick={() =>
              handleConsoleRedirect(isAdminConsole ? "data" : "admin")
            }
          >
            <span>{isAdminConsole ? "Data Console" : "Admin Console"}</span>
            <FaExternalLinkAlt className="text-lg" />
          </div>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
