import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, MenuItem, Select, TextField, Box, IconButton } from "@mui/material";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";

const conditions = [
  { label: "Equals", value: "Equals", symbol: "=" },
  { label: "Does not equal", value: "Does not equal", symbol: "≠" },
  { label: "Is greater than", value: "Is greater than", symbol: ">" },
  { label: "Is greater than or equal to", value: "Is greater than or equal to", symbol: "≥" },
  { label: "Is less than", value: "Is less than", symbol: "<" },
  { label: "Is less than or equal to", value: "Is less than or equal to", symbol: "≤" },
  { label: "Is between", value: "Is between", symbol: "↔" },
  { label: "Is not between", value: "Is not between", symbol: "↮" },

  { label: "Is blank", value: "Is blank", symbol: "○" },
  { label: "Is not blank", value: "Is not blank", symbol: "●" },
  { label: "Contains", value: "Contains", symbol: "⊆" }, 
  { label: "Does not contain", value: "Does not contain", symbol: "⊈" },
  { label: "Is any of", value: "Is any of", symbol: "***" },
  { label: "Is none of", value: "Is none of", symbol: "***" },
];

const initialFilter = { type: "filter", column: "", operator: "", value: "" };
const initialGroup = { type: "group", relation: "AND", children: [initialFilter] };

export const AdvanceFilter = ({ isOpen, onClose, fieldsArray, onApplyFilters }) => {
  //const dispatch = useDispatch();
  const [filters, setFilters] = useState([{ ...initialGroup }]);
 // const initialfilters = useSelector((state) => state.advancedFilter.filters);

  const updateNestedState = (filtersArray, groupPath, callback) => {
    let updatedFilters = structuredClone(filtersArray);
    let currentGroup = updatedFilters;

    for (let i = 0; i < groupPath.length; i++) {
      if (!currentGroup[groupPath[i]]) return filtersArray;
      currentGroup = currentGroup[groupPath[i]].children;
    }

    callback(currentGroup);
    return updatedFilters;
  };


  const handleChangeRelation = (groupPath, value) => {
    console.log("value",value)
    if (value === "ADD_GROUP") {
      handleAddGroup(groupPath);
    } else {
      setFilters((prev) =>
        updateNestedState(prev, groupPath, (currentGroup) => {
          currentGroup.relation = value;  // ✅ Fix: Updating the relation of the group itself
        })
      );
    }
  };

  const handleAddFilter = (groupPath) => {
    setFilters((prev) =>
      updateNestedState(prev, groupPath, (currentGroup) => {
        currentGroup.push({ ...initialFilter });
      })
    );
  };

  const handleAddGroup = (groupPath) => {
    setFilters((prev) =>
      updateNestedState(prev, groupPath, (currentGroup) => {
        currentGroup.push({ ...initialGroup });
      })
    );
  };

  const handleRemoveItem = (groupPath, itemIndex) => {
    setFilters((prev) =>
      updateNestedState(prev, groupPath, (currentGroup) => {
        if (currentGroup.length > 1) {
          currentGroup.splice(itemIndex, 1);
        }
      })
    );
  };

  const handleChange = (groupPath, itemIndex, field, value) => {
    setFilters((prev) =>
      updateNestedState(prev, groupPath, (currentGroup) => {
        if (currentGroup[itemIndex]) {
          currentGroup[itemIndex][field] = value;
        }
      })
    );
  };

  console.log("filters", filters);

  const renderFilters = (group, groupPath = [], index) => {
    if (!group || !group.children) return null;
    console.log(`group-${index}`,group)
    return (
      <Box key={index} border={1} padding={2} margin={1}>
        <Select
          // value={filters[index].group.relation}
          value={group.relation}
          onChange={(e) => handleChangeRelation(groupPath, e.target.value)}
        >
          <MenuItem value="AND">AND</MenuItem>
          <MenuItem value="OR">OR</MenuItem>
          <MenuItem value="ADD_GROUP">+ Add Group</MenuItem>
          {/* <MenuItem value="ADD_GROUP">+ Add Condition</MenuItem> */}

        </Select>

        {group.children.map((item, index) => {
          const newPath = [...groupPath, index];

          return (
            <Box key={index} display="flex" alignItems="center" marginTop={1}>
              {item.type === "group" ? (
                renderFilters(item, newPath, index)
              ) : (
                <>
                  <Select
                    value={item.column}
                    sx={{ minWidth: 150 }}
                    displayEmpty
                    onChange={(e) => handleChange(groupPath, index, "column", e.target.value)}
                  >
                    <MenuItem value="" disabled>
                      Select a column
                    </MenuItem>
                    {fieldsArray.map((col) => (
                      <MenuItem key={col} value={col}>
                        {col}
                      </MenuItem>
                    ))}
                  </Select>

                  <Select
                    value={item.operator}
                    sx={{ minWidth: 150 }}
                    displayEmpty

                    onChange={(e) => handleChange(groupPath, index, "operator", e.target.value)}
                  >
                    <MenuItem value="" disabled>
                      Select a Operator
                    </MenuItem>
                    {conditions.map((condition) => (
                      <MenuItem key={condition.value} value={condition.value}>
                        {condition.label} ({condition.symbol})
                      </MenuItem>
                    ))}
                  </Select>

                  {item.operator !== "Is blank" && item.operator !== "Is not blank" && (
                    <TextField
                      value={item.value}
                      placeholder="Enter Value"
                      onChange={(e) => handleChange(groupPath, index, "value", e.target.value)}
                    />
                  )}
                </>
              )}

              <IconButton onClick={() => handleRemoveItem(groupPath, index)}>
                <IoMdCloseCircleOutline />
              </IconButton>
            </Box>
          );
        })}

        <Button onClick={() => handleAddFilter(groupPath)}>+ Add Filter</Button>
      </Box>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 z-9999"
        >
          <Box className="relative w-[50vw] bg-white shadow-lg p-6 border rounded">
            <Button onClick={onClose} className="absolute top-2 right-2">
              Close
            </Button>
            {filters.map((group, index) => renderFilters(group, [index], index))}
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="border rounded p-1 mr-2"
              >
                Cancel
              </button>
              {/* <button onClick={()=>console.log("button is enabled")}>Test</button> */}
              <button
                onClick={() => {
                  console.log("Filters:", filters);
                  onApplyFilters(filters);
                }}
                className="bg-green-500 text-white rounded p-1"
              >
                OK
              </button>
            </div>
          </Box>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
