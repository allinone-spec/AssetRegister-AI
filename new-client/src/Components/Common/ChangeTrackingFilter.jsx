import { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  Checkbox,
  ListItemText,
  InputAdornment,
  ListSubheader,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { Search } from "lucide-react";
import { getRequest } from "../../Service/admin.save";

export const ChangeTrackingFilter = ({
  isOpen,
  onClose,
  tableName,
  onApplyFilter,
  onRemoveFilter,
  currentFilter = null,
}) => {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [days, setDays] = useState(7);
  const [validationError, setValidationError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (currentFilter?.xDaysFilter?.xDays && isOpen) {
      setSelectedColumns(
        currentFilter?.xDaysFilter?.columnNames.split(",") || [],
      );
      setDays(currentFilter?.xDaysFilter?.xDays || 7);
    }
  }, [currentFilter, isOpen]);

  useEffect(() => {
    if (isOpen)
      getRequest(`/table/${tableName}/getColumns`).then((response) => {
        if (response.status === 200 && response.data) setFields(response.data);
      });

    if (!isOpen) {
      setSelectedColumns([]);
      setDays(7);
      setValidationError("");
      setSearchText("");
    }
  }, [isOpen]);

  // Filter columns based on search text
  const filteredColumns = fields.filter((column) =>
    column.toLowerCase().includes(searchText.toLowerCase()),
  );

  const validateFilter = () => {
    if (selectedColumns.length === 0) {
      setValidationError("Please select at least one column to track changes.");
      return false;
    }

    if (!days || days < 1) {
      setValidationError("Please enter a valid number of days (minimum 1).");
      return false;
    }

    setValidationError("");
    return true;
  };

  const applyFilter = () => {
    if (!validateFilter()) return;

    const filterConfig = {
      days,
      selectedColumns,
    };

    onApplyFilter(filterConfig);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50 z-40 !m-0"
            onClick={onClose}
          />

          {/* Side Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col !m-0"
            style={{ width: "min(600px, 85vw)" }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Filter Changes by Column(s)
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <IoMdCloseCircleOutline size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {validationError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {validationError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Typography
                    variant="subtitle1"
                    className="font-medium mb-2 text-gray-700 dark:text-gray-200"
                  >
                    Select Columns to Track Changes
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      multiple
                      required
                      options={fields}
                      value={selectedColumns}
                      label="Select Columns"
                      onChange={(e) => setSelectedColumns(e.target.value)}
                      sx={{
                        backgroundColor: "var(--input-bg)",
                        color: "var(--text-primary)",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#d1d5db",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#9ca3af",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "var(--accent)",
                        },
                        "@media (prefers-color-scheme: dark)": {
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#4b5563",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#6b7280",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "var(--accent)",
                          },
                        },
                      }}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              sx={{
                                backgroundColor: "var(--accent-dim)",
                                color: "var(--accent)",
                                "& .MuiChip-deleteIcon": {
                                  color: "var(--accent)",
                                },
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: "var(--input-bg)",
                            border: "1px solid #d1d5db",
                            "& .MuiMenuItem-root": {
                              color: "var(--text-primary)",
                              "&:hover": {
                                backgroundColor: "var(--accent-dim)",
                              },
                              "&.Mui-selected": {
                                backgroundColor: "var(--accent-dim)",
                              },
                            },
                            "@media (prefers-color-scheme: dark)": {
                              border: "1px solid #4b5563",
                            },
                          },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          px: 1,
                          py: 1,
                          position: "sticky",
                          top: 0,
                          backgroundColor: "var(--input-bg)",
                          zIndex: 1,
                          borderBottom: "1px solid #d1d5db",
                          "@media (prefers-color-scheme: dark)": {
                            borderBottom: "1px solid #4b5563",
                          },
                        }}
                      >
                        <ListSubheader
                          sx={{
                            backgroundColor: "transparent",
                            borderBottom: "1px solid #d1d5db",
                            "@media (prefers-color-scheme: dark)": {
                              borderBottom: "1px solid #4b5563",
                            },
                          }}
                        >
                          <TextField
                            size="small"
                            placeholder="Search columns..."
                            value={searchText}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSearchText(e.target.value);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              width: "100%",
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: "var(--input-bg)",
                                color: "var(--text-primary)",
                                "& fieldset": {
                                  borderColor: "#d1d5db",
                                },
                                "&:hover fieldset": {
                                  borderColor: "#9ca3af",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: "var(--accent)",
                                },
                                "@media (prefers-color-scheme: dark)": {
                                  "& fieldset": {
                                    borderColor: "#4b5563",
                                  },
                                  "&:hover fieldset": {
                                    borderColor: "#6b7280",
                                  },
                                  "&.Mui-focused fieldset": {
                                    borderColor: "var(--accent)",
                                  },
                                },
                              },
                              "& .MuiInputBase-input::placeholder": {
                                color: "var(--text-sub)",
                                opacity: 1,
                              },
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search size={18} className="text-text-sub" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </ListSubheader>
                      </Box>
                      {filteredColumns.map((column, index) => (
                        <MenuItem key={index} value={column}>
                          <Checkbox
                            checked={selectedColumns.indexOf(column) > -1}
                            sx={{
                              color: "var(--text-sub)",
                              "&.Mui-checked": {
                                color: "var(--accent)",
                              },
                            }}
                          />
                          <ListItemText
                            primary={column}
                            sx={{
                              "& .MuiListItemText-primary": {
                                color: "var(--text-primary)",
                              },
                            }}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
                <div>
                  <TextField
                    label="Number of Days"
                    type="number"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 365 }}
                    sx={{
                      width: "200px",
                      "& .MuiInputLabel-root": {
                        color: "var(--text-sub)",
                        "&.Mui-focused": {
                          color: "var(--accent)",
                        },
                      },
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "var(--input-bg)",
                        color: "var(--text-primary)",
                        "& fieldset": {
                          borderColor: "#d1d5db",
                        },
                        "&:hover fieldset": {
                          borderColor: "#9ca3af",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "var(--accent)",
                        },
                        "@media (prefers-color-scheme: dark)": {
                          "& fieldset": {
                            borderColor: "#4b5563",
                          },
                          "&:hover fieldset": {
                            borderColor: "#6b7280",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "var(--accent)",
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              {currentFilter?.xDaysFilter?.xDays && (
                <button
                  onClick={() => {
                    onRemoveFilter();
                    onClose();
                  }}
                  className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Remove Filter
                </button>
              )}
              <button
                onClick={applyFilter}
                disabled={selectedColumns.length === 0}
                className="px-5 py-2 bg-accent hover:opacity-50 dark:hover:bg-accent-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {currentFilter?.xDaysFilter?.xDays
                  ? "Update Filter"
                  : "Apply Filter"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChangeTrackingFilter;
