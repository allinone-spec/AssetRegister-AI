import React from "react";
import { AiOutlineCloseCircle } from "react-icons/ai";


export const JobResponseModal = ({ isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-2xl shadow-lg w-96 p-6 relative">
        <AiOutlineCloseCircle
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        />
  
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
      </div>
    </div>
  );
};
