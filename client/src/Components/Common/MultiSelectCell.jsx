import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MultiSelectCell = ({
  getValue,
  row,
  column,
  table,
  handleDropdownChange,
  options = [],
  disabled = false,
}) => {
  const initialValue = getValue() || [];
  const [selectedValues, setSelectedValues] = useState(initialValue || []);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    setSelectedValues(initialValue);
  }, [initialValue]);

  const handleToggleOption = (option, optionToRemove) => {
    const newSelected = selectedValues.includes(option)
      ? selectedValues.filter((item) => item !== option)
      : [...selectedValues, option];

    setSelectedValues(newSelected);
    // Send all selected values, not just the toggled one
    if (optionToRemove)
      handleDropdownChange(row.original, newSelected, optionToRemove);
    else handleDropdownChange(row.original, newSelected);

    table.options.meta?.updateData(row.index, column.id, newSelected);
  };

  const handleRemoveTag = (optionToRemove) => {
    const newSelected = selectedValues.filter(
      (item) => item !== optionToRemove
    );
    setSelectedValues(newSelected);
    // Send all remaining selected values
    handleDropdownChange(row.original, newSelected, optionToRemove);

    table.options.meta?.updateData(row.index, column.id, newSelected);
  };

  return (
    <div className="relative w-40" ref={dropdownRef}>
      {/* Selected values display */}
      <div
        className={`min-h-[32px] border rounded px-2 py-1 bg-white flex gap-1 items-center flex-wrap ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        {selectedValues?.length === 0 ? (
          <span className="text-gray-400 text-sm">Select options...</span>
        ) : (
          selectedValues?.map((value, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
            >
              {value}
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(value);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))
        )}
        <ChevronDown
          size={16}
          className={`ml-auto text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown options */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 text-sm">No options</div>
          ) : (
            options.map((option, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() =>
                  handleToggleOption(
                    option,
                    selectedValues.includes(option) && option
                  )
                }
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => {}} // Handled by parent div onClick
                  className="rounded"
                  disabled={disabled}
                />
                <span className="text-sm">{option}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectCell;
