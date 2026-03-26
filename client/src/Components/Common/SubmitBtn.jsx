import React from "react";
import { useTheme } from "../../ThemeContext";
import { useDispatch } from 'react-redux';

const SubmitBtn = ({text = "Submit",isLoading = false,onClick,className = "",type = "submit",disabled = false,
}) => {
    const dispatch = useDispatch();
    const { colorPalette, selectedColor,bgColor } = useTheme();

    const backgroundColor = colorPalette[selectedColor]["200"];
    const withoutHoverBackground = colorPalette[selectedColor]["500"];
    const hoverBackground2 = colorPalette[selectedColor]["400"];
  return (
    <button
      className={`w-full py-2 text-white rounded-md ${className}`}
      style={{ backgroundColor:disabled ? "#b0bec5": bgColor?.backgroundColor || withoutHoverBackground }}
      onMouseEnter={(e) => e.target.style.backgroundColor = disabled ? "#b0bec5": withoutHoverBackground}
      onMouseLeave={(e) => e.target.style.backgroundColor = disabled ? "#b0bec5": bgColor?.backgroundColor || withoutHoverBackground}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : (
        text
      )}
    </button>
  );
};

export default SubmitBtn;
