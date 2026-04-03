// components/CommonButton.jsx
import React from "react";

const CommonButton = ({
  children,
  onClick,
  disabled = false,
  backgroundColor = "bg-blue-600",
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor }}
      className={`        
        text-white
        font-bold
        px-4 py-1.5
        rounded-lg
        normal-case
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default CommonButton;
