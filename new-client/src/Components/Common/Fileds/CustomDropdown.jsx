import { useEffect, useRef, useState } from "react";
import { CiEdit } from "react-icons/ci";
import { MdDelete } from "react-icons/md";

export const CustomDropdown = ({
  value,
  onChange,
  options,
  onEdit,
  onDelete,
  disabled,
  placeholder,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`relative mt-1 ${className}`} ref={dropdownRef}>
      <input
        type="text"
        value={searchTerm || value || ""}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-border-theme rounded-lg bg-input-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      />

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border-theme rounded-lg shadow-theme max-h-60 overflow-y-auto">
          {/* Create New Option */}
          <div
            onClick={() => handleSelect("CREATE_NEW")}
            className="px-4 py-2 text-sm font-bold border-b border-border-theme cursor-pointer hover:bg-accent-dim text-text-primary"
          >
            Create New
          </div>

          {/* Filtered Options with Edit/Delete buttons */}
          {filteredOptions.map((option) => (
            <div
              key={option}
              className="flex items-center justify-between px-4 py-2 text-sm cursor-pointer hover:bg-accent-dim text-text-primary"
            >
              <span onClick={() => handleSelect(option)} className="flex-1">
                {option}
              </span>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(option);
                    setIsOpen(false);
                  }}
                  className="p-1 text-accent hover:text-accent-dark"
                  title="Edit column"
                >
                  <CiEdit size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(option);
                    setIsOpen(false);
                  }}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="Delete column"
                >
                  <MdDelete size={14} />
                </button>
              </div>
            </div>
          ))}

          {filteredOptions.length === 0 && searchTerm && (
            <div className="px-4 py-2 text-sm text-text-sub">
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
