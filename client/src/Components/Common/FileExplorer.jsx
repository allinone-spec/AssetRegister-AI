import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { setFoldersData } from "../../redux/Slices/FolderSlice";
import {
  addToFavorites,
  removeFromFavorites,
} from "../../redux/Slices/FavoritesSlice";
import { deleteRequest, patchRequest } from "../../Service/api.service";
import { IoMdMore } from "react-icons/io";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import {
  AiOutlineFolderAdd,
  AiOutlineFileAdd,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineClose,
} from "react-icons/ai";
import { DeleteConfirm } from "./DeleteConfirm";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import useResize from "../../Hooks/useResize";

const FileExplorer = ({
  exp,
  onInsertNode,
  subItem,
  onEnterClick,
  showFolderInput,
  setShowFolderInput,
  fetchFolders,
  routeTitle = "dashboard",
  sourceType = "DashBoard",
  title,
  hideSidebar,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [renameLoader, setRenameLoader] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission
  );
  const { dashboardFavorites, reportFavorites } = useSelector(
    (state) => state.favorites
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isLgUp } = useResize();
  const handleDelete = () => {
    setIsModalOpen(true);
  };

  const handleToggleFavorite = async (e, folder) => {
    e.stopPropagation();
    e.preventDefault();

    const type =
      sourceType === "DashBoard" || sourceType === "dashboard"
        ? "dashboard"
        : "report";
    const favorites =
      type === "dashboard" ? dashboardFavorites : reportFavorites;
    const isFavorite = favorites.some((fav) => fav.id === folder.id);

    try {
      // API call to update favorite status on server
      const payload = {
        favourite: !isFavorite,
      };

      const response = await patchRequest(
        `/folder/${folder.id}/update`,
        payload
      );

      if (response.status === 200) {
        // Update Redux state only after successful API call
        if (isFavorite) {
          dispatch(removeFromFavorites({ type, folderId: folder.id }));
          toast.success("Removed from favorites");
        } else {
          dispatch(
            addToFavorites({ type, folder: { ...folder, favourite: true } })
          );
          toast.success("Added to favorites");
        }

        // Refresh folders to ensure server and client state are synchronized
        if (fetchFolders) {
          fetchFolders();
        }
      }
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toast.error("Failed to update favorite status. Please try again.");
    }
  };

  const isFolderFavorite = (folderId) => {
    const type =
      sourceType === "DashBoard" || sourceType === "dashboard"
        ? "dashboard"
        : "report";
    const favorites =
      type === "dashboard" ? dashboardFavorites : reportFavorites;
    return favorites.some((fav) => fav.id === folderId);
  };

  const handleNewFolder = (exp, e, isFolder) => {
    e.stopPropagation();
    dispatch(setFoldersData("parentFolderId"));
    navigate(`/data-console/dashboard/create-folder/${exp.id}`, {
      state: { sourceType, selectedFolder: exp },
    });
    setExpanded(true);
    setShowModal(null);
  };

  const handleNewFile = (exp, e, isFolder) => {
    e.stopPropagation();
    navigate(`/data-console/dashboard/create-file/${exp.id}`);
  };

  useEffect(() => {
    setNewFolderName(showModal?.folderName);
  }, [showModal]);

  const handleRightClick = (e, data) => {
    e.preventDefault();
    setShowModal(data);
  };

  const handleUpdateFolderName = async () => {
    setRenameLoader(true);
    try {
      const payload = {
        ...showModal,
        folderName: newFolderName,
      };
      const response = await patchRequest(
        `/folder/${showModal.id}/update`,
        payload
      );
      if (response.status === 200) {
        setShowModal(null);
        fetchFolders();
      }
    } catch (error) {
      console.error(error || "Internal server error");
    } finally {
      setRenameLoader(false);
    }
  };
  const handleDeleteFolder = async () => {
    if (!showModal?.id) return;
    setDeleteLoading(true);

    try {
      const response = await deleteRequest(
        `/folder/${showModal.id}/delete/${routeTitle}`
      );

      if (response.status === 200) {
        setShowModal(null);
        setIsModalOpen(false);
        fetchFolders();
      }
    } catch (error) {
      console.error(error || "Internal server error");
      setShowModal(null);
      setIsModalOpen(false);
      toast.error(error.response.data.error || "Failed to Delete Folder");
    } finally {
      setShowModal(null);
      setIsModalOpen(false);
      setDeleteLoading(false);
    }
  };

  if (!exp) return null;
  return (
    <div className="w-full">
      {exp?.accessType ? (
        <div>
          <div className="flex justify-between items-center">
            <span className="font-bold ml-2 my-1 text-[#000] w-[60%]">
              <span
                className="cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                📁
              </span>
              {exp.type === "reports" ? (
                <Link
                  to={`/data-console/reports/file-list/${exp?.id}`}
                  state={exp}
                  onClick={() => {
                    if (!isLgUp && hideSidebar) hideSidebar();
                  }}
                >
                  <span
                    className="cursor-pointer"
                    // onContextMenu={(e) => handleRightClick(e, exp)}
                  >
                    {" "}
                    {exp?.folderName}
                  </span>
                </Link>
              ) : (
                <Link
                  to={`/data-console/dash-folder/${exp?.id}`}
                  state={{
                    folderName: exp?.folderName,
                  }}
                >
                  <span
                    className="cursor-pointer"
                    onClick={() => {
                      if (!isLgUp && hideSidebar) hideSidebar();
                    }}
                    // onContextMenu={(e) => handleRightClick(e, exp)}
                  >
                    {" "}
                    {exp?.folderName}
                  </span>
                </Link>
              )}
            </span>
            {permissionList.includes(title) &&
              permissionDetails[title]?.hasWriteOnly && (
                <div className={"flex gap-2"}>
                  <IoMdMore
                    className="text-black cursor-pointer"
                    onClick={(e) => handleRightClick(e, exp)}
                  />
                </div>
              )}
          </div>

          <div
            style={{ marginLeft: "10px", display: expanded ? "block" : "none" }}
          >
            {exp?.childFolders?.map((child, index) => (
              <FileExplorer
                key={index}
                exp={{ ...child, type: exp?.type || "" }}
                onInsertNode={onInsertNode}
                onEnterClick={onEnterClick}
                showFolderInput={showFolderInput}
                setShowFolderInput={setShowFolderInput}
                type={exp.type}
                routeTitle={routeTitle}
                fetchFolders={fetchFolders}
                sourceType={sourceType}
                title={title}
                hideSidebar={hideSidebar}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="ml-2 text-sm overflow-x-hidden px-2 text-[#000] cursor-pointer py-1">
          🗄️ {exp?.name}
        </div>
      )}

      {showModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="border  w-full mb-1 text-black text-[0.7rem] py-1 px-3 rounded-md"
            />

            <div className="flex flex-col  items-start text-black text-[0.7rem]">
              {exp?.type == "dashboard" && (
                <p
                  onClick={(e) => handleNewFolder(exp, e, true)}
                  className="flex w-full justify-between items-center gap-1 p-1 cursor-pointer  hover:bg-blue-500  transition"
                >
                  Create Folder
                  <AiOutlineFolderAdd />
                </p>
              )}
              {exp?.type === "reports" && (
                <p
                  onClick={(e) => handleNewFolder(exp, e, false)}
                  className="flex w-full justify-between items-center gap-1 p-1 cursor-pointer  hover:bg-blue-500  transition"
                >
                  Create Folder
                  <AiOutlineFileAdd />
                </p>
              )}
              <p
                className={`flex w-full justify-between items-center gap-1 p-1 
                                 ${
                                   renameLoader
                                     ? "cursor-not-allowed opacity-50"
                                     : "cursor-pointer hover:bg-blue-500"
                                 } 
                                    transition`}
                onClick={!renameLoader ? handleUpdateFolderName : undefined} // Prevent click when loading
              >
                {renameLoader ? "Renaming..." : "Rename"}
                <AiOutlineEdit />
              </p>

              <p
                className="flex items-center w-full justify-between gap-1 p-1 cursor-pointer hover:bg-blue-500 transition"
                onClick={() => handleDelete()}
              >
                Delete
                <AiOutlineDelete />
              </p>
              <button
                onClick={(e) => handleToggleFavorite(e, exp)}
                className="flex items-center w-full justify-between gap-1 p-1"
                title={
                  isFolderFavorite(exp.id)
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                {isFolderFavorite(exp.id) ? "Unfavorite" : "Favorite"}
                {isFolderFavorite(exp.id) ? (
                  <MdFavorite className="text-red-500" />
                ) : (
                  <MdFavoriteBorder className="text-gray-500 hover:text-red-500" />
                )}
              </button>
              <p
                className="flex items-center w-full justify-between gap-1 p-1 cursor-pointer hover:bg-blue-500 transition"
                onClick={() => setShowModal(false)}
              >
                Cancel
                <AiOutlineClose />
              </p>
            </div>
          </div>
        </div>
      )}

      {
        <DeleteConfirm
          isOpen={isModalOpen}
          close={() => setIsModalOpen(false)}
          handleDelete={handleDeleteFolder}
          deleteLoading={deleteLoading}
        />
      }
    </div>
  );
};

export default FileExplorer;
