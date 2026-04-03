import { useEffect, useState, useRef } from "react";
import { Folder, ChevronRight, ChevronDown, ViewIcon } from "lucide-react";
import { IoMdMore } from "react-icons/io";
import {
  AiOutlineFolderAdd,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineClose,
} from "react-icons/ai";
import {
  MdFavorite,
  MdFavoriteBorder,
  MdExpandMore,
  MdChevronRight,
} from "react-icons/md";
import { BiSolidReport } from "react-icons/bi";
import { useSelector, useDispatch } from "react-redux";
import {
  addToFavorites,
  removeFromFavorites,
  setFavorites,
} from "../../redux/Slices/FavoritesSlice";
import {
  deleteRequest,
  getRequest,
  patchRequest,
} from "../../Service/api.service";
import toast from "react-hot-toast";
import CommonButton from "../Common/CommonButton";
import { BiPlus } from "react-icons/bi";

export default function ReportsSidebar({
  active,
  onChange,
  loading = false,
  permissionList = [],
  permissionDetails = {},
  onViewClick,
}) {
  const dispatch = useDispatch();
  const { reportFavorites, viewFavorites } = useSelector(
    (state) => state.favorites,
  );
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [foldersReport, setFoldersReport] = useState([]);
  const [hoveredFolder, setHoveredFolder] = useState(null);
  const [favoritesExpanded, setFavoritesExpanded] = useState({
    reportFolders: false,
    views: false,
  });

  // Context menu state
  const [menuState, setMenuState] = useState({
    visible: false,
    x: 0,
    y: 0,
    folder: null,
  });
  const [newFolderName, setNewFolderName] = useState("");
  const [renameLoader, setRenameLoader] = useState(false);
  const menuRef = useRef(null);

  const staticNavItems = ["Original Source", "By AR Source"];

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    if (menuState.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuState.visible]);

  const closeMenu = () => {
    setMenuState({ visible: false, x: 0, y: 0, folder: null });
    setNewFolderName("");
  };

  const handleRightClick = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setNewFolderName(folder.folderName || "");
    setMenuState({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      folder,
    });
  };

  const handleCreateFolder = async () => {
    try {
      onChange("Create Folder", menuState.folder);
    } catch (err) {
      console.error("Create folder error:", err);
    } finally {
      closeMenu();
    }
  };

  const handleUpdateFolderName = async () => {
    setRenameLoader(true);
    try {
      const payload = {
        ...menuState.folder,
        folderName: newFolderName,
      };
      const response = await patchRequest(
        `/folder/${menuState.folder.id}/update`,
        payload,
      );
      if (response.status === 200) {
        fetchReportFolders();
      }
    } catch (error) {
      console.error(error || "Internal server error");
    } finally {
      setRenameLoader(false);
      closeMenu();
    }
  };

  const handleDelete = async () => {
    if (!menuState?.folder?.id) return;
    // setDeleteLoading(true);

    try {
      const response = await deleteRequest(
        `/folder/${menuState?.folder?.id}/delete/${"report"}`,
      );

      if (response.status === 200) {
        fetchReportFolders();
      }
    } catch (error) {
      console.error(error || "Internal server error");
      toast.error(error.response.data.error || "Failed to Delete Folder");
    } finally {
      closeMenu();
    }
  };

  const isFolderFavorite = (folderId) => {
    return reportFavorites.some((fav) => fav.id === folderId);
  };

  const handleToggleFavorite = async (folder) => {
    const isFavorite = isFolderFavorite(folder.id);
    try {
      const response = await patchRequest(`/folder/${folder.id}/update`, {
        favourite: !isFavorite,
      });
      if (response.status === 200) {
        if (isFavorite) {
          dispatch(
            removeFromFavorites({ type: "report", folderId: folder.id }),
          );
          toast.success("Removed from favorites");
        } else {
          dispatch(
            addToFavorites({
              type: "report",
              folder: { ...folder, favourite: true },
            }),
          );
          toast.success("Added to favorites");
        }
        fetchReportFolders();
      }
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toast.error("Failed to update favorite status");
    } finally {
      closeMenu();
    }
  };

  const handleRemoveFolderFavorite = async (folderId, e) => {
    e.stopPropagation();
    try {
      const response = await patchRequest(`/folder/${folderId}/update`, {
        favourite: false,
      });
      if (response.status === 200) {
        dispatch(removeFromFavorites({ type: "report", folderId }));
        toast.success("Removed from favorites");
        fetchReportFolders();
      }
    } catch (error) {
      console.error("Error removing from favorites:", error);
      toast.error("Failed to remove from favorites");
    }
  };

  const handleRemoveViewFavorite = async (viewId, e) => {
    e.stopPropagation();
    try {
      const response = await patchRequest(`/view/${viewId}/update`, {
        favourite: false,
      });
      if (response.status === 200) {
        dispatch(removeFromFavorites({ type: "view", viewId }));
        toast.success("Removed view from favorites");
      }
    } catch (error) {
      console.error("Error removing view from favorites:", error);
      toast.error("Failed to remove view from favorites");
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.childFolders && folder.childFolders.length > 0;
    const isActive = active?.id === folder.id || active === folder.id;
    return (
      <div key={folder.id} className="w-full">
        <button
          onClick={() => onChange("File List", folder)}
          onMouseEnter={() => setHoveredFolder(folder.id)}
          onMouseLeave={() => setHoveredFolder(null)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            isActive
              ? "bg-accent-muted text-text-primary"
              : "text-text-sub hover:bg-accent-dim hover:text-text-primary"
          } pl-[${12 + level * 20}px]`}
        >
          <span
            className={`flex items-center justify-center w-4 h-4 transition-all duration-150 ${
              hasChildren && hoveredFolder === folder.id
                ? "bg-accent text-white rounded-md"
                : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleFolder(folder.id);
            }}
          >
            {hasChildren && hoveredFolder === folder.id ? (
              isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )
            ) : (
              <Folder className="w-3 h-3" />
            )}
          </span>

          <span className="flex-1 truncate">{folder.folderName}</span>

          {/* {showMoreIcon && ( */}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <IoMdMore
              className="text-text-sub cursor-pointer hover:text-text-primary transition-colors"
              onClick={(e) => handleRightClick(e, folder)}
            />
          </div>
          {/* )} */}
        </button>

        {hasChildren && isExpanded && (
          <div className="ml-2">
            {folder.childFolders.map((childFolder) =>
              renderFolder(childFolder, level + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  const extractAllFavorites = (folders) => {
    const favorites = [];
    const traverse = (folderList) => {
      if (!Array.isArray(folderList)) return;
      folderList.forEach((folder) => {
        if (folder.favourite === true) {
          favorites.push(folder);
        }
        if (folder.childFolders && Array.isArray(folder.childFolders)) {
          traverse(folder.childFolders);
        }
      });
    };
    traverse(folders);
    return favorites;
  };

  const fetchReportFolders = async () => {
    try {
      const user = localStorage.getItem("user-id");
      const response = await getRequest(`/folder/${user}/user/Report`);
      localStorage.setItem("myReportFolders", JSON.stringify(response?.data));
      setFoldersReport(
        response?.data.map((v) => ({ ...v, type: "reports" })) || [],
      );

      // Extract and set report folder favorites
      const reportFavorites = extractAllFavorites(response?.data || []);
      dispatch(setFavorites({ reportFavorites }));
    } catch (error) {
      console.error("Error fetching folders:", error);
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
      } else {
        dispatch(setFavorites({ viewFavorites: [] }));
      }
    } catch (error) {
      console.error("Error fetching view favorites:", error);
    }
  };

  useEffect(() => {
    fetchReportFolders();
    fetchViewFavorites();
  }, []);

  return (
    <>
      <nav className="flex flex-col gap-0.5 w-64 shrink-0 bg-[var(--surface)] p-2 rounded-lg">
        {/* Static Navigation Items */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider px-3 py-1 mb-1">
            Actions
          </h3>
          {staticNavItems.map((item) => (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                active === item
                  ? "bg-accent-muted text-text-primary"
                  : "text-text-sub hover:bg-accent-dim hover:text-text-primary"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Favorites Section */}
        {(reportFavorites.length > 0 || viewFavorites.length > 0) && (
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-text-faint uppercase tracking-wider px-3 py-1 mb-1">
              Favorites
            </h3>

            {/* Report Folder Favorites */}
            {reportFavorites.length > 0 && (
              <div>
                <button
                  onClick={() =>
                    setFavoritesExpanded((prev) => ({
                      ...prev,
                      reportFolders: !prev.reportFolders,
                    }))
                  }
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-text-sub hover:bg-accent-dim rounded-md transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <BiSolidReport className="w-3 h-3" />
                    <span>Reports ({reportFavorites.length})</span>
                  </div>
                  {favoritesExpanded.reportFolders ? (
                    <MdExpandMore className="w-4 h-4" />
                  ) : (
                    <MdChevronRight className="w-4 h-4" />
                  )}
                </button>
                {favoritesExpanded.reportFolders && (
                  <div className="ml-2 space-y-0.5">
                    {reportFavorites.map((folder) => (
                      <div
                        key={folder.id}
                        className="group/fav flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer text-text-sub hover:bg-accent-dim hover:text-text-primary transition-colors"
                        onClick={() => onChange("File List", folder)}
                      >
                        <Folder className="w-3 h-3 shrink-0" />
                        <span
                          className="flex-1 truncate"
                          title={folder.folderName}
                        >
                          {folder.folderName}
                        </span>
                        <button
                          onClick={(e) =>
                            handleRemoveFolderFavorite(folder.id, e)
                          }
                          className="opacity-0 group-hover/fav:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
                          title="Remove from favorites"
                        >
                          <MdFavorite className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View Favorites */}
            {viewFavorites.length > 0 && (
              <div>
                <button
                  onClick={() =>
                    setFavoritesExpanded((prev) => ({
                      ...prev,
                      views: !prev.views,
                    }))
                  }
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-text-sub hover:bg-accent-dim rounded-md transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <ViewIcon className="w-3 h-3" />
                    <span>Views ({viewFavorites.length})</span>
                  </div>
                  {favoritesExpanded.views ? (
                    <MdExpandMore className="w-4 h-4" />
                  ) : (
                    <MdChevronRight className="w-4 h-4" />
                  )}
                </button>
                {favoritesExpanded.views && (
                  <div className="ml-2 space-y-0.5">
                    {viewFavorites.map((view) => (
                      <div
                        key={view.id}
                        className="group/fav flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer text-text-sub hover:bg-accent-dim hover:text-text-primary transition-colors"
                        onClick={() =>
                          onViewClick
                            ? onViewClick(view)
                            : onChange("File List", view)
                        }
                      >
                        <BiSolidReport className="w-3 h-3 shrink-0" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate" title={view.viewName}>
                            {view.viewName}
                          </span>
                          <span className="text-xs text-text-faint truncate">
                            {view.folderName}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleRemoveViewFavorite(view.id, e)}
                          className="opacity-0 group-hover/fav:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
                          title="Remove from favorites"
                        >
                          <MdFavorite className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Dynamic Folders Section */}
        <div>
          <div className="flex items-center justify-between pl-3 py-1 mb-1">
            <h3 className="text-xs font-semibold text-text-faint uppercase tracking-wider">
              Folders
            </h3>
            <div className="relative group">
              <CommonButton onClick={() => onChange("Create Folder")}>
                <BiPlus className="text-accent" />
              </CommonButton>
              <div className="absolute right-0 top-[-25px] mt-1 z-50 px-2 py-1 text-xs rounded bg-accent text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
                Create Folder
              </div>
            </div>
            {loading && (
              <div className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full"></div>
            )}
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-text-sub">
              Loading folders...
            </div>
          ) : foldersReport.length === 0 ? (
            <div className="px-3 py-4 text-sm text-text-sub">
              No folders found
            </div>
          ) : (
            foldersReport.map((folder) => renderFolder(folder))
          )}
        </div>
      </nav>

      {/* Context Menu */}
      {menuState.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ top: menuState.y, left: menuState.x }}
        >
          {/* Rename input */}
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="border border-gray-200 w-full text-black text-xs py-1 px-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Folder name..."
              autoFocus
            />
          </div>

          {/* Menu items */}
          <div className="flex flex-col text-black text-xs">
            {/* Create Folder */}
            <button
              onClick={handleCreateFolder}
              className="flex w-full justify-between items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
            >
              <span>Create Folder</span>
              <AiOutlineFolderAdd className="w-4 h-4" />
            </button>

            {/* Rename */}
            <button
              onClick={handleUpdateFolderName}
              disabled={renameLoader}
              className={`flex w-full justify-between items-center gap-2 px-3 py-2 transition-colors ${
                renameLoader
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-blue-500 hover:text-white"
              }`}
            >
              <span>{renameLoader ? "Renaming..." : "Rename Folder"}</span>
              <AiOutlineEdit className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="flex w-full justify-between items-center gap-2 px-3 py-2 cursor-pointer hover:bg-red-500 hover:text-white transition-colors"
            >
              <span>Delete Folder</span>
              <AiOutlineDelete className="w-4 h-4" />
            </button>

            {/* Favorite */}
            <button
              onClick={() => handleToggleFavorite(menuState.folder)}
              className="flex w-full justify-between items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
            >
              <span>
                {isFolderFavorite(menuState.folder?.id)
                  ? "Unfavorite"
                  : "Favorite"}
              </span>
              {isFolderFavorite(menuState.folder?.id) ? (
                <MdFavorite className="w-4 h-4 text-red-500" />
              ) : (
                <MdFavoriteBorder className="w-4 h-4" />
              )}
            </button>

            {/* Cancel */}
            <button
              onClick={closeMenu}
              className="flex w-full justify-between items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors border-t border-gray-100 mt-1"
            >
              <span>Cancel</span>
              <AiOutlineClose className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
