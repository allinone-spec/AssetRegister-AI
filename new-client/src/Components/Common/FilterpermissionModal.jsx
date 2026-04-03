import React, { useCallback, useMemo } from "react";
import { motion } from "framer-motion";

import { IoMdCloseCircleOutline } from "react-icons/io";
import {Modal
  } from "@mui/material";
const FilterPermissionModal = ({ isPermissionModal, onClose, selectedColumns, setSelectedColumns ,fieldsArray}) => {
    // const onToggleColumn = useCallback((col) => {
    //     setSelectedColumns((prev) =>
    //         prev.includes(col) ? prev.filter((item) => item !== col) : [...prev, col]
    //     );
    // }, [setSelectedColumns]);

 console.log("  b c nyh",fieldsArray,selectedColumns)


    const onToggleColumn = useCallback((col) => {
        setSelectedColumns((prev) => {
            if (prev?.includes(col)) {
                return prev?.filter((item) => item !== col);
            } else {
                return fieldsArray || selectedColumns?.filter((item) => prev.includes(item) || item === col);
            }
        });
    }, [setSelectedColumns]);
    

    const filteredFields = useMemo(() => fieldsArray || selectedColumns, []);

    return (
        <Modal open={isPermissionModal} onClose={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={isPermissionModal ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: -10 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute top-12 right-12 h-[75vh] w-auto bg-white shadow-lg p-4 border rounded"
            >
                <div className="flex justify-between items-center border-b pb-2 mb-2">
                    <h4 className="text-lg font-semibold">Select Columns</h4>
                    <IoMdCloseCircleOutline className="text-red-500 text-xl cursor-pointer" onClick={onClose}></IoMdCloseCircleOutline>
                </div>
                <ul className="space-y-2 h-[90%] overflow-y-scroll">
                    {filteredFields?.map((column, index) => (
                        <li key={index} className="flex items-center cursor-pointer" onClick={() => onToggleColumn(column)}>
                            <input
                                id={`col-${index}`}
                                type="checkbox"
                                checked={(selectedColumns || []).includes(column)}
                                readOnly
                                className="mr-2"
                            />
                            <label htmlFor={`col-${index}`}>{column}</label>
                        </li>
                    ))}
                </ul>
            </motion.div>

        </Modal>
    );
};

export default React.memo(FilterPermissionModal);
