import React from "react";
import { AiOutlineClose } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";

export const ChartPreviousModal = ({ isOpen, CloseModal, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="fixed inset-0 z-50 bg-gray-500 bg-opacity-50 flex justify-center items-center h-screen overflow-y-auto"
                >
                    <div className="relative w-full sm:max-w-[70%] mx-2 bg-white shadow-lg sm:p-6 p-2 border rounded mt-10 mb-10">
                        <button
                            onClick={CloseModal}
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                        >
                            <AiOutlineClose size={20} />
                        </button>

                        <h2 className="text-lg font-semibold mb-4">Chart Preview</h2>

                        <div className="max-h-[65vh] overflow-y-auto pr-2">
                            {children}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
