import React from "react";

/**
 * A component for toggling between replace and update modes
 * @param {Object} props - Component props
 * @param {string} props.toggleButton - Current selected value ("replace" or "update")
 * @param {Function} props.handleToggleChange - Function to handle toggle change
 * @param {boolean} props.isVisible - Whether the component should be visible
 * @returns {JSX.Element} The rendered component
 */
const ImportModeToggle = ({
  toggleButton,
  handleToggleChange,
  isVisible = true,
}) => {
  if (!isVisible) return null;

  return (
    <>
      <label className="block text-sm font-medium my-3">Import Mode</label>
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <input
            type="radio"
            id="replace"
            name="toggleButton"
            value="replace"
            checked={toggleButton === "replace"}
            onChange={(e) => handleToggleChange(e.target.value)}
            className="w-4 h-4 text-blue-600 cursor-pointer"
          />
          <label
            htmlFor="replace"
            className="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
          >
            Replace
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="radio"
            id="update"
            name="toggleButton"
            value="update"
            checked={toggleButton === "update"}
            onChange={(e) => handleToggleChange(e.target.value)}
            className="w-4 h-4 text-blue-600 cursor-pointer"
          />
          <label
            htmlFor="update"
            className="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
          >
            Update
          </label>
        </div>
      </div>
    </>
  );
};

export default ImportModeToggle;
