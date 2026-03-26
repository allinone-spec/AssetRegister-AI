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
        currentFilter?.xDaysFilter?.columnNames.split(",") || []
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
    column.toLowerCase().includes(searchText.toLowerCase())
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
    <Modal open={isOpen} onClose={onClose}>
      <Box className="fixed inset-0">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 z-10"
          >
            <Box
              className="relative bg-white shadow-lg sm:p-6 p-4 border rounded sm:mx-5 mx-2 max-h-[90vh] overflow-auto"
              sx={{ minWidth: "600px", maxWidth: "90vw" }}
            >
            <div className="flex justify-between items-center mb-4">
              <Typography variant="h5" className="font-semibold">
                Filter Changes by Column(s)
              </Typography>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <IoMdCloseCircleOutline size={24} />
              </button>
            </div>

            {validationError && (
              <Alert severity="error" className="mb-4">
                {validationError}
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Typography variant="subtitle1" className="font-medium mb-2">
                  Select Columns to Track Changes
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Select Columns</InputLabel>
                  <Select
                    multiple
                    value={selectedColumns}
                    label="Select Columns"
                    onChange={(e) => setSelectedColumns(e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 1,
                        position: "sticky",
                        top: 0,
                        bgcolor: "white",
                        zIndex: 1,
                      }}
                    >
                      <ListSubheader>
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
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search size={18} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ width: "100%" }}
                        />
                      </ListSubheader>
                    </Box>
                    {filteredColumns.map((column, index) => (
                      <MenuItem key={index} value={column}>
                        <Checkbox
                          checked={selectedColumns.indexOf(column) > -1}
                        />
                        <ListItemText primary={column} />
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
                  sx={{ width: "200px" }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outlined" onClick={onClose}>
                Cancel
              </Button>
              {currentFilter?.xDaysFilter?.xDays && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    onRemoveFilter();
                    onClose();
                  }}
                >
                  Remove Filter
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={applyFilter}
                disabled={selectedColumns.length === 0}
              >
                {currentFilter?.xDaysFilter?.xDays
                  ? "Update Filter"
                  : "Apply Filter"}
              </Button>
            </div>
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Modal>
  );
};

export default ChangeTrackingFilter;
