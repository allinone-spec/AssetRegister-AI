import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../ThemeContext";
import { removeFromFavorites } from "../../redux/Slices/FavoritesSlice";
import { patchRequest } from "../../Service/api.service";
import toast from "react-hot-toast";
import {
  MdFavorite,
  MdFavoriteBorder,
  MdExpandMore,
  MdChevronRight,
} from "react-icons/md";
import { FaAngleDown } from "react-icons/fa6";
import useResize from "../../Hooks/useResize";
import { IoStatsChartSharp } from "react-icons/io5";
import { BiSolidReport } from "react-icons/bi";
import { ChartAreaIcon, View, ViewIcon } from "lucide-react";

const FavoritesPanel = ({ hideSidebar }) => {
  const { bgColor } = useTheme();
  const { layoutTextColor } = bgColor;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLgUp } = useResize();
  const [expandedCollapse, setExpandedCollapse] = useState({
    dashboard: true,
    reports: true,
    charts: false,
    views: false,
  });

  const { dashboardFavorites, reportFavorites, chartFavorites, viewFavorites } =
    useSelector((state) => state.favorites);

  const handleRemoveFromFavorites = async (type, folderId, e) => {
    e.stopPropagation();

    try {
      // API call to update favorite status on server
      const payload = {
        favourite: false,
      };

      const response = await patchRequest(
        `/folder/${folderId}/update`,
        payload,
      );

      if (response.status === 200) {
        // Update Redux state only after successful API call
        dispatch(removeFromFavorites({ type, folderId }));
        toast.success("Removed from favorites");
      }
    } catch (error) {
      console.error("Error removing from favorites:", error);
      toast.error("Failed to remove from favorites. Please try again.");
    }
  };

  const handleFolderClick = (folder, type) => {
    // Navigate directly to the folder using existing route patterns
    if (type === "dashboard") {
      navigate(`/data-console/dash-folder/${folder.id}`, {
        state: {
          folderName: folder.folderName,
        },
      });
    } else {
      navigate(`/data-console/reports/file-list/${folder.id}`, {
        state: folder,
      });
    }

    if (!isLgUp) hideSidebar();
  };

  const handleChartClick = (chart) => {
    // Navigate directly to the chart's folder
    navigate(`/data-console/dashboard/my-folder/${chart.id}`, {
      state: {
        data: chart,
        isFavorite: true,
      },
    });

    if (!isLgUp) hideSidebar();
  };

  const handleRemoveChartFromFavorites = async (chartId, e) => {
    e.stopPropagation();

    try {
      // API call to update favorite status on server using the same endpoint as AllGraph
      const response = await patchRequest(`/dashboard/${chartId}/update`, {
        favourite: false,
      });

      if (response.status === 200) {
        // Update Redux state only after successful API call
        dispatch(removeFromFavorites({ type: "chart", chartId }));
        toast.success("Removed chart from favorites");

        // Refresh the dashboard list to get updated favorites
        // fetchAllDashboards();
      }
    } catch (error) {
      console.error("Error removing chart from favorites:", error);
      toast.error("Failed to remove chart from favorites. Please try again.");
    }
  };

  const handleViewClick = (view) => {
    console.log("Clicked view:", view);

    // Navigate directly to the reports folder containing the view
    navigate(`/data-console/reports/folder-list-filter?viewId=${view.id}`, {
      state: view,
    });

    if (!isLgUp) hideSidebar();
  };

  const handleRemoveViewFromFavorites = async (viewId, e) => {
    e.stopPropagation();

    try {
      // API call to update favorite status on server
      const response = await patchRequest(`/view/${viewId}/update`, {
        favourite: false,
      });

      if (response.status === 200) {
        // Update Redux state only after successful API call
        dispatch(removeFromFavorites({ type: "view", viewId }));
        toast.success("Removed view from favorites");
      }
    } catch (error) {
      console.error("Error removing view from favorites:", error);
      toast.error("Failed to remove view from favorites. Please try again.");
    }
  };

  const totalFavorites =
    dashboardFavorites.length +
    reportFavorites.length +
    chartFavorites.length +
    viewFavorites.length;

  if (totalFavorites === 0) {
    return (
      <div className="w-full">
        <li className="group relative font-[600]">
          <div
            className="px-6 py-2 cursor-pointer text-[#000] text-[0.95rem] hover:text-[#000] transition-colors"
            style={{
              background: "transparent",
              color: layoutTextColor,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(211, 211, 211, 0.47)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.target.style.color = layoutTextColor;
            }}
          >
            <span
              className="flex gap-2 px-3"
              style={{ color: layoutTextColor }}
            >
              <MdFavoriteBorder className="text-lg" />
              <span className="font-semibold w-[120px]">Favorites</span>
              <FaAngleDown className="text-lg" />
            </span>
          </div>

          {/* Hover Panel for no favorites */}
          <div
            className="absolute z-50 left-full top-0 hidden group-hover:flex min-w-[16rem] w-[30vw] flex-col bg-white rounded-r-xl rounded-b-xl shadow-lg px-4 py-2"
            onMouseEnter={(e) => e.stopPropagation()}
          >
            <p
              className="text-sm py-2 text-black"
              // style={{ color: layoutTextColor }}
            >
              No favorites yet
            </p>
          </div>
        </li>
      </div>
    );
  }

  return (
    <div className="w-full">
      <li className="group relative font-[600]">
        <div
          className="px-6 py-2 cursor-pointer text-[#000] text-[0.95rem] hover:text-[#000] transition-colors"
          style={{
            background: "transparent",
            color: layoutTextColor,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(211, 211, 211, 0.47)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.target.style.color = layoutTextColor;
          }}
        >
          <span className="flex gap-2 px-3" style={{ color: layoutTextColor }}>
            <MdFavorite className="text-lg" />
            <span className="font-semibold w-[120px]">
              Favorites ({totalFavorites})
            </span>
            <FaAngleDown
              className="text-lg"
              style={{ color: layoutTextColor }}
            />
          </span>
        </div>

        {/* Hover Panel - Shows on right side */}
        {totalFavorites > 0 && (
          <ul
            className="absolute z-50 left-full top-0 hidden group-hover:flex min-w-[16rem] max-h-[300px] overflow-y-auto w-[30vw] flex-col bg-white rounded-r-xl rounded-b-xl shadow-lg px-4 py-2 space-y-2"
            onMouseEnter={(e) => e.stopPropagation()}
          >
            {/* Dashboard Favorites Section */}
            {dashboardFavorites.length > 0 && (
              <div>
                <div
                  className="px-2 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    setExpandedCollapse((prev) => ({
                      ...prev,
                      dashboard: !prev.dashboard,
                    }))
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <IoStatsChartSharp className="text-lg text-black mr-2" />
                      <span className="text-sm font-medium text-black">
                        Dashboard ({dashboardFavorites.length})
                      </span>
                    </div>
                    {expandedCollapse.dashboard ? (
                      <MdExpandMore className="text-gray-600" size={20} />
                    ) : (
                      <MdChevronRight className="text-gray-600" size={20} />
                    )}
                  </div>
                </div>
                {expandedCollapse.dashboard && (
                  <div className="space-y-1 px-4">
                    {dashboardFavorites.map((folder) => (
                      <div
                        key={folder.id}
                        className="group cursor-pointer px-2 py-2 text-[#000] text-[0.95rem] hover:text-[#000] transition-colors"
                        style={{
                          background: "transparent",
                        }}
                        onClick={() => handleFolderClick(folder, "dashboard")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(211, 211, 211, 0.47)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm">📁</span>
                            <span
                              className="text-sm truncate"
                              // style={{ color: layoutTextColor }}
                              title={folder.folderName}
                            >
                              {folder.folderName}
                            </span>
                          </div>
                          <button
                            onClick={(e) =>
                              handleRemoveFromFavorites(
                                "dashboard",
                                folder.id,
                                e,
                              )
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                            title="Remove from favorites"
                          >
                            <MdFavorite className="text-sm text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Charts Section */}
            {chartFavorites.length > 0 && (
              <div>
                <div
                  className="px-2 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    setExpandedCollapse((prev) => ({
                      ...prev,
                      charts: !prev.charts,
                    }))
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ChartAreaIcon className="text-lg text-black mr-2" />
                      <span className="text-sm font-medium text-black">
                        Charts ({chartFavorites.length})
                      </span>
                    </div>
                    {expandedCollapse.charts ? (
                      <MdExpandMore className="text-gray-600" size={20} />
                    ) : (
                      <MdChevronRight className="text-gray-600" size={20} />
                    )}
                  </div>
                </div>
                {expandedCollapse.charts && (
                  <div className="space-y-1 px-4">
                    {chartFavorites.map((chart) => (
                      <div
                        key={chart.id}
                        className="group cursor-pointer px-2 py-2 text-[#000] text-[0.95rem] hover:text-[#000] transition-colors"
                        style={{
                          background: "transparent",
                        }}
                        onClick={() => handleChartClick(chart)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(211, 211, 211, 0.47)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <IoStatsChartSharp className="text-lg text-black mr-2" />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span
                                className="text-sm truncate font-medium"
                                title={chart.dashBoardName}
                              >
                                {chart.dashBoardName}
                              </span>
                              <span className="text-xs text-gray-500 truncate">
                                {chart.chartType}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) =>
                              handleRemoveChartFromFavorites(chart.id, e)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                            title="Remove from favorites"
                          >
                            <MdFavorite className="text-sm text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Report Favorites Section */}
            {reportFavorites.length > 0 && (
              <div>
                <div
                  className="px-2 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    setExpandedCollapse((prev) => ({
                      ...prev,
                      reports: !prev.reports,
                    }))
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BiSolidReport className="text-lg text-black mr-2" />
                      <span className="text-sm font-medium text-black">
                        Reports ({reportFavorites.length})
                      </span>
                    </div>
                    {expandedCollapse.reports ? (
                      <MdExpandMore className="text-gray-600" size={20} />
                    ) : (
                      <MdChevronRight className="text-gray-600" size={20} />
                    )}
                  </div>
                </div>
                {expandedCollapse.reports && (
                  <div className="space-y-1 px-4">
                    {reportFavorites.map((folder) => (
                      <div
                        key={folder.id}
                        className="group cursor-pointer px-2 py-2 text-[#000] text-[0.95rem] hover:text-[#000] transition-colors"
                        style={{
                          background: "transparent",
                        }}
                        onClick={() => handleFolderClick(folder, "report")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(211, 211, 211, 0.47)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm">📁</span>
                            <span
                              className="text-sm truncate"
                              // style={{ color: layoutTextColor }}
                              title={folder.folderName}
                            >
                              {folder.folderName}
                            </span>
                          </div>
                          <button
                            onClick={(e) =>
                              handleRemoveFromFavorites("report", folder.id, e)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                            title="Remove from favorites"
                          >
                            <MdFavorite className="text-sm text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Views Section */}
            {viewFavorites.length > 0 && (
              <div>
                <div
                  className="px-2 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    setExpandedCollapse((prev) => ({
                      ...prev,
                      views: !prev.views,
                    }))
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ViewIcon className="text-lg text-black mr-2" />
                      <span className="text-sm font-medium text-black">
                        Views ({viewFavorites.length})
                      </span>
                    </div>
                    {expandedCollapse.views ? (
                      <MdExpandMore className="text-gray-600" size={20} />
                    ) : (
                      <MdChevronRight className="text-gray-600" size={20} />
                    )}
                  </div>
                </div>
                {expandedCollapse.views && (
                  <div className="space-y-1 px-4">
                    {viewFavorites.map((view) => (
                      <div
                        key={view.id}
                        className="group cursor-pointer px-2 py-2 text-[#000] text-[0.95rem] hover:text-[#000] transition-colors"
                        style={{
                          background: "transparent",
                        }}
                        onClick={() => handleViewClick(view)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(211, 211, 211, 0.47)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <BiSolidReport className="text-lg text-black mr-2" />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span
                                className="text-sm truncate font-medium"
                                title={view.viewName}
                              >
                                {view.viewName}
                              </span>
                              <span className="text-xs text-gray-500 truncate">
                                {view.folderName}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) =>
                              handleRemoveViewFromFavorites(view.id, e)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                            title="Remove from favorites"
                          >
                            <MdFavorite className="text-sm text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ul>
        )}
      </li>
    </div>
  );
};

export default FavoritesPanel;
