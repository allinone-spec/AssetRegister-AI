import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { setFoldersData } from "../../redux/Slices/FolderSlice";
import { deleteRequest, patchRequest } from "../../Service/api.service";
import { IoMdMore } from "react-icons/io";
import { AiOutlineFolderAdd, AiOutlineFileAdd, AiOutlineEdit, AiOutlineDelete, AiOutlineClose } from "react-icons/ai";


const ReportFileExplorer = ({ exp, onInsertNode, onEnterClick, showFolderInput, setShowFolderInput, fetchFolders }) => {
    const [expanded, setExpanded] = useState(false);
    const [showModal, setShowModal] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleNewFolder = (exp, e, isFolder) => {
        e.stopPropagation();
        dispatch(setFoldersData("parentFolderId"));
        navigate(`/data-console/dashboard/create-folder/${exp.userId}`);
        setExpanded(true);
    };

    useEffect(() => {
        setNewFolderName(showModal?.folderName)
    }, [showModal])

    const handleRightClick = (e, data) => {
        e.preventDefault();
        setShowModal(data);
    };

    const handleUpdateFolderName = async () => {
        try {
            const payload = {
                ...showModal,
                folderName: newFolderName
            }
            const response = await patchRequest(`/folder/${showModal.id}/update`, payload)
            if (response.status === 200) {
                setShowModal(null);
                fetchFolders();

            }
        } catch (error) {
            console.error(error || "Internal server error")
        }
    };

    const handleDeleteFolder = async () => {
        try {

            const response = await deleteRequest(`/folder/${showModal.id}/delete`,)
            if (response.status === 200) {
                setShowModal(null);
                fetchFolders();

            }
        } catch (error) {
            console.error(error || "Internal server error")
        }

        setShowModal(false);
    };

    if (!exp) return null;
    return (
        <div className="w-full">
            {exp?.folderType ? (
                <div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold ml-2 my-1 text-[#000] w-[60%]">
                            <span className="cursor-pointer" onClick={() => setExpanded(!expanded)}>📁</span>
                            <Link to={`/data-console/dashboard/my-reports/${exp?.id}`}>
                                <span className="cursor-pointer"
                                // onContextMenu={(e) => handleRightClick(e, exp)}
                                > {exp?.folderName}</span>
                            </Link>
                        </span>
                        <div className="flex gap-2">
                            <IoMdMore className="text-black cursor-pointer" onClick={(e) => handleRightClick(e, exp)} />

                        </div>

                    </div>

                    <div style={{ marginLeft: "10px", display: expanded ? "block" : "none" }}>
                        {exp?.childFolders?.map((child, index) => (
                            <ReportFileExplorer
                                key={index}
                                exp={child}
                                onInsertNode={onInsertNode}
                                onEnterClick={onEnterClick}
                                showFolderInput={showFolderInput}
                                setShowFolderInput={setShowFolderInput}
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
                            <p onClick={(e) => handleNewFolder(exp, e, true)}
                                className="flex w-full justify-between items-center gap-1 p-1 cursor-pointer  hover:bg-blue-500  transition">
                                Create Folder
                                <AiOutlineFolderAdd />
                            </p>
                            <p onClick={(e) => handleNewFolder(exp?.id, e, false)}
                                className="flex w-full justify-between items-center gap-1 p-1 cursor-pointer  hover:bg-blue-500  transition">
                                Create File
                                <AiOutlineFileAdd />
                            </p>
                            <p
                                className="flex w-full justify-between items-center gap-1 p-1 cursor-pointer hover:bg-blue-500 transition" onClick={handleUpdateFolderName}>
                                Rename
                                <AiOutlineEdit />
                            </p>
                            <p className="flex items-center w-full justify-between gap-1 p-1 cursor-pointer hover:bg-blue-500 transition" onClick={handleDeleteFolder}>
                                Delete
                                <AiOutlineDelete />
                            </p>
                            <p className="flex items-center w-full justify-between gap-1 p-1 cursor-pointer hover:bg-blue-500 transition" onClick={() => setShowModal(false)}>
                                Cancel
                                <AiOutlineClose />
                            </p>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportFileExplorer;
