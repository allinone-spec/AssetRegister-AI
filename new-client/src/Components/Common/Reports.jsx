import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {  setFoldersData } from "../../redux/Slices/FolderSlice";
import { useNavigate } from "react-router-dom";

const Reports = ({ exp, onInsertNode, onEnterClick, showFolderInput, setShowFolderInput }) => {
    const [extanded, setExtanded] = useState(false);
    const [showInput, setShowInput] = useState({ visible: false, isFolder: null, id: null });
    const dispatch = useDispatch();
    const navigate = useNavigate();


    const handleNewFolder = (id, e, isFolder) => {
        // dispatch(setIsFolder(isFolder))
        navigate("/dashboard/create-folder");
        e.stopPropagation();
        setExtanded(true);
    };



    if (!exp) return null;

    return (
        <>
            {exp.Links?.map((data, index) => (
                <div key={index} className="w-full">
                    {data?.isFolder ? (
                        <div>
                            <div className="flex justify-between items-center">
                                <span
                                    className={`font-bold ml-2 my-1 text-[#000] w-[60%] `}
                                ><span className="cursor-pointer" onClick={() => setExtanded(!extanded)}>📁</span>
                                    {data?.name}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={(e) => handleNewFolder(data?.id, e, true)} className="p-1">
                                        📁
                                    </button>
                                    <button onClick={(e) => handleNewFolder(data?.id, e, false)} className="p-1">
                                        🗄️
                                    </button>
                                </div>
                            </div>
                            <div
                                style={{
                                    marginLeft: "10px",
                                    width: "100%",
                                    display: extanded ? "block" : "none",
                                }}
                            >
                                {data?.Links?.map((child, index) => (
                                    <FileExplorer
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
                            🗄️ {data?.name}
                        </div>
                    )}
                </div>
            ))}
        </>
    );
};

export default Reports;
