import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  Button,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Modal,
} from "@mui/material";
import {
  setFilters,
  addFilter,
  removeFilter,
} from "../../redux/Slices/AdvancedFilterSlice";
import toast from "react-hot-toast";
import AdvanceFilterIsAnyOfList from "./AdvanceFilterIsAnyOfList";
import { getUniqueColumnValueList } from "../../Utility/utilityFunction";
import { getRequest } from "../../Service/Console.service";

const baseOperators = [
  { label: "Equals", value: "Equals", symbol: "=" },
  { label: "Does not equal", value: "Does not equal", symbol: "≠" },
  { label: "Is greater than", value: "Is greater than", symbol: ">" },
  {
    label: "Is greater than or equal to",
    value: "Is greater than or equal to",
    symbol: "≥",
  },
  { label: "Is less than", value: "Is less than", symbol: "<" },
  {
    label: "Is less than or equal to",
    value: "Is less than or equal to",
    symbol: "≤",
  },
  { label: "Is between", value: "Is between", symbol: "↔" },
  { label: "Is not between", value: "Is not between", symbol: "↮" },

  { label: "Is blank", value: "Is blank", symbol: "○" },
  { label: "Is not blank", value: "Is not blank", symbol: "●" },
  { label: "Contains", value: "Contains", symbol: "⊆" },
  { label: "Does not contain", value: "Does not contain", symbol: "⊈" },
  { label: "Is any of", value: "Is any of", symbol: "***" },
  { label: "Is none of", value: "Is none of", symbol: "***" },
];

const referenceOperators = [
  { label: "Reference Equals", value: "Reference Equals", symbol: "⟷" },
  { label: "Reference Not Equals", value: "Reference Not Equals", symbol: "⟷̸" },
];

export const AdvanceFilter = ({
  isOpen,
  onClose,
  fieldsArray,
  onApplyFilters,
  originalData,
  sourceData,
  setSaveFilters,
  jobName,
  tableDataSource,
  availableTables = [], // New prop for available table names
  tableName, // New prop to determine if advanced features should be shown
}) => {
  const dispatch = useDispatch();
  const savedFilters = useSelector((state) => state.advancedFilter.filters);
  const { value: selectedObject, valueName: ObjectName } = useSelector(
    (state) => state.selectedObject
  );
  const { pathname } = useLocation();
  const [columnNames, setColumnName] = useState([]);
  const [referenceColumnNames, setReferenceColumnNames] = useState({}); // Store columns for each reference table

  const [filteredData, setFilteredData] = useState(originalData);
  const [querySummary, setQuerySummary] = useState("");

  // Computed columns array - use API columns for Register, fieldsArray for others
  const availableColumns = useMemo(() => {
    if (tableName === "Register" && columnNames.length > 0) {
      return columnNames;
    }
    return fieldsArray || [];
  }, [tableName, columnNames, fieldsArray]);

  // Function to get reference table columns
  const getReferenceTableColumns = (tableName) => {
    if (tableName === "Register") {
      return fieldsArray || [];
    }
    return referenceColumnNames[tableName] || [];
  };

  // Function to fetch columns for a specific reference table
  const fetchReferenceTableColumns = async (refTableName) => {
    try {
      if (refTableName && tableName === "Register") {
        const response = await getRequest(`/table/${refTableName}/getColumns`);
        setReferenceColumnNames((prev) => ({
          ...prev,
          [refTableName]: response.data || [],
        }));
        console.log("Reference API Columns:", response.data);
      }
    } catch (error) {
      console.log("Error fetching reference columns:", error);
      // Fallback to fieldsArray if API fails
      setReferenceColumnNames((prev) => ({
        ...prev,
        [refTableName]: fieldsArray || [],
      }));
    }
  };

  // Dynamic operators based on tableName
  const operators = useMemo(() => {
    if (tableName === "Register") {
      return [...baseOperators, ...referenceOperators];
    }
    return baseOperators;
  }, [tableName]);

  const [columnValues, setColumnValues] = useState({});
  const [selectedValues, setSelectedValues] = useState({});
  const [loadingColumnValues, setLoadingColumnValues] = useState({});

  const [groups, setGroups] = useState(() => {
    const createCondition = () => ({
      ...(tableName === "Register"
        ? { table: "Register", table2: "", field2: "" }
        : {}),
      column: "",
      operator: "Contains",
      value: "",
    });

    if (savedFilters && savedFilters.length > 0) {
      const conditions = savedFilters.map((filter, index) => {
        // Convert AssetRegister_${ObjectName} back to "Register" for display
        const normalizeTableName = (tableName) => {
          if (!tableName) return "";
          if (tableName.startsWith("AssetRegister_")) {
            return "Register";
          }
          return tableName;
        };

        const normalizedCondition = {
          ...(tableName === "Register"
            ? {
                table: normalizeTableName(filter.table) || "",
                table2: normalizeTableName(filter.table2) || "",
                field2: filter.field2 || "",
              }
            : {}),
          column: filter.column,
          operator: filter.condition,
          value: filter.value,
        };
        return normalizedCondition;
      });

      return [
        {
          operator: savedFilters[0]?.operator || "AND",
          conditions: conditions.length > 0 ? conditions : [createCondition()],
          subGroups: [],
        },
      ];
    } else {
      return [
        {
          operator: "AND",
          conditions: [createCondition()],
          subGroups: [],
        },
      ];
    }
  });

  const fetchColumnsName = useCallback(
    async (specificTableName) => {
      try {
        if (specificTableName && tableName === "Register") {
          const response = await getRequest(
            `/table/${specificTableName}/getColumns`
          );
          setColumnName(response.data || []);
          console.log("Main Table API Columns:", response.data);
        } else if (tableName !== "Register") {
          // For non-Register tables, use fieldsArray
          setColumnName(fieldsArray || []);
        }
      } catch (error) {
        console.log("Error fetching main table columns:", error);
        // Fallback to fieldsArray if API fails
        setColumnName(fieldsArray || []);
      }
    },
    [tableName, fieldsArray]
  );

  useEffect(() => {
    if (tableName === "Register") {
      // Load columns for default "Register" table selection
      setColumnName(fieldsArray || []);
    }
  }, [tableName, fieldsArray]);

  // Load main table columns when modal opens with existing filters
  useEffect(() => {
    if (
      isOpen &&
      savedFilters &&
      savedFilters.length > 0 &&
      tableName === "Register"
    ) {
      const nonRegisterTable = savedFilters.find((filter) => {
        const normalizeTableName = (tableName) => {
          if (!tableName) return "";
          if (tableName.startsWith("AssetRegister_")) {
            return "Register";
          }
          return tableName;
        };

        const normalizedTable = normalizeTableName(filter.table);
        return normalizedTable && normalizedTable !== "Register";
      });

      if (nonRegisterTable) {
        const normalizeTableName = (tableName) => {
          if (!tableName) return "";
          if (tableName.startsWith("AssetRegister_")) {
            return "Register";
          }
          return tableName;
        };

        const normalizedTable = normalizeTableName(nonRegisterTable.table);
        fetchColumnsName(normalizedTable);
      } else {
        console.log(
          "All filters use Register table, setting fieldsArray columns"
        );
        setColumnName(fieldsArray || []);
      }
    }
  }, [isOpen, savedFilters, tableName, fetchColumnsName, fieldsArray]);

  // Initialize selected values when modal opens with existing filters
  useEffect(() => {
    if (isOpen && savedFilters && savedFilters.length > 0) {
      const newSelectedValues = {};

      savedFilters.forEach((filter, index) => {
        if (["Is any of", "Is none of"].includes(filter.condition)) {
          console.log("filter", filter);
          getUniqueValuesForColumn(filter.column);
          const conditionKey = `${groups[0]?.operator || "AND"}-${index}`;

          // split on comma with optional spaces, handle single value
          const parts = (filter.value || "")
            .toString()
            .split(/\s*,\s*/)
            .map((v) => v.trim().toLowerCase())
            .filter(Boolean);
          newSelectedValues[conditionKey] = new Set(parts);
        }
      });

      setSelectedValues(newSelectedValues);
    }
  }, [isOpen, savedFilters]);

  // Load reference columns when modal opens with existing filters
  useEffect(() => {
    if (
      isOpen &&
      savedFilters &&
      savedFilters.length > 0 &&
      tableName === "Register"
    ) {
      console.log(
        "Loading reference columns for existing filters:",
        savedFilters
      );

      savedFilters.forEach((filter, filterIndex) => {
        // Normalize table names by removing AssetRegister_ prefix
        const normalizeTableName = (tableName) => {
          if (!tableName) return "";
          if (tableName.startsWith("AssetRegister_")) {
            return "Register";
          }
          return tableName;
        };

        const normalizedTable2 = normalizeTableName(filter.table2);

        // Load reference columns if reference operator is used and table2 is set
        if (
          ["Reference Equals", "Reference Not Equals"].includes(
            filter.condition
          ) &&
          filter.table2
        ) {
          if (normalizedTable2 === "Register") {
            setReferenceColumnNames((prev) => ({
              ...prev,
              Register: fieldsArray || [],
            }));
          } else if (normalizedTable2) {
            fetchReferenceTableColumns(normalizedTable2);
          }
        }
      });
    }
  }, [isOpen, savedFilters, tableName, fieldsArray]);

  // Function to get unique values from API or local data
  const getUniqueValuesForColumn = async (columnId) => {
    if (!columnId) return [];

    // Check if we already have values cached
    if (columnValues[columnId]) {
      return columnValues[columnId];
    }

    setLoadingColumnValues((prev) => ({ ...prev, [columnId]: true }));

    try {
      let uniqueValues = [];

      // Use API calls if setSaveFilters is available (similar to ColumnFilterDropdown)
      if (setSaveFilters) {
        uniqueValues = await getUniqueColumnValueList(
          pathname,
          columnId,
          selectedObject,
          tableDataSource,
          jobName
        );
      } else {
        // Use local data if no API setup
        uniqueValues = [
          ...new Set(
            sourceData.map((row) => String(row[columnId])).filter(Boolean)
          ),
        ];
      }

      // Cache the values
      setColumnValues((prev) => ({
        ...prev,
        [columnId]: uniqueValues,
      }));

      return uniqueValues;
    } catch (error) {
      console.error("Error fetching column values:", error);
      // Fallback to local data on API error
      const localValues = [
        ...new Set(
          sourceData.map((row) => String(row[columnId])).filter(Boolean)
        ),
      ];
      setColumnValues((prev) => ({
        ...prev,
        [columnId]: localValues,
      }));
      return localValues;
    } finally {
      setLoadingColumnValues((prev) => ({ ...prev, [columnId]: false }));
    }
  };

  // Function to handle column change and load values
  const handleColumnChange = async (group, index, value) => {
    // Reset selected values when column changes
    const conditionKey = `${group.operator}-${index}`;
    setSelectedValues((prev) => ({
      ...prev,
      [conditionKey]: new Set(),
    }));

    // Get unique values for the new column
    if (value) {
      await getUniqueValuesForColumn(value);
    }

    handleFilterChange(group, index, "column", value);
  };

  const handleAddFilter = (group) => {
    const newCondition = {
      ...(tableName === "Register"
        ? { table: "Register", table2: "", field2: "" }
        : {}),
      column: "",
      operator: "Equals",
      value: "",
    };
    group.conditions.push(newCondition);
    setGroups([...groups]);
  };

  const applyFilters = () => {
    dispatch(setFilters([]));
    const filterData = (group, data) => {
      let groupQueryStr = "(";
      let filtered = group.operator === "AND" ? [...data] : new Set();

      group.conditions.forEach((condition, index) => {
        const { column, operator, value, table, table2, field2 } = condition;
        if (!column || !operator) return;

        dispatch(
          addFilter({
            ...(tableName === "Register"
              ? {
                  table:
                    table === "Register"
                      ? `AssetRegister_${ObjectName}`
                      : table,
                  table2:
                    table2 === "Register"
                      ? `AssetRegister_${ObjectName}`
                      : table2,
                  field2,
                }
              : {}),
            column,
            condition: operator,
            value,
            operator: group.operator,
          })
        );

        let tempFiltered = [];

        switch (operator) {
          case "Equals":
            tempFiltered = data.filter(
              (item) =>
                item[column]?.toString().toLowerCase() === value.toLowerCase()
            );
            break;
          case "Does not equal":
            tempFiltered = data.filter(
              (item) =>
                item[column]?.toString().toLowerCase() !== value.toLowerCase()
            );
            break;
          case "Is greater than":
            tempFiltered = data.filter(
              (item) => parseFloat(item[column]) > parseFloat(value)
            );
            break;
          case "Is greater than or equal to":
            tempFiltered = data.filter(
              (item) => parseFloat(item[column]) >= parseFloat(value)
            );
            break;
          case "Is less than":
            tempFiltered = data.filter(
              (item) => parseFloat(item[column]) < parseFloat(value)
            );
            break;
          case "Is less than or equal to":
            tempFiltered = data.filter(
              (item) => parseFloat(item[column]) <= parseFloat(value)
            );
            break;
          case "Is between":
            tempFiltered = data.filter(
              (item) =>
                parseFloat(item[column]) >= parseFloat(value[0]) &&
                parseFloat(item[column]) <= parseFloat(value[1])
            );
            break;
          case "Is not between":
            tempFiltered = data.filter(
              (item) =>
                parseFloat(item[column]) < parseFloat(value[0]) ||
                parseFloat(item[column]) > parseFloat(value[1])
            );
            break;
          case "Contains":
            tempFiltered = data.filter((item) =>
              item[column]
                ?.toString()
                .toLowerCase()
                .includes(value.toLowerCase())
            );
            break;
          case "Does not contain":
            tempFiltered = data.filter(
              (item) =>
                !item[column]
                  ?.toString()
                  .toLowerCase()
                  .includes(value.toLowerCase())
            );
            break;
          case "Is blank":
            tempFiltered = data.filter(
              (item) => !item[column] || item[column].toString().trim() === ""
            );
            break;
          case "Is not blank":
            tempFiltered = data.filter(
              (item) => item[column] && item[column].toString().trim() !== ""
            );
            break;
          case "Is any of":
            {
              const list = Array.isArray(value)
                ? value.map((v) => String(v).toLowerCase())
                : String(value || "")
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .filter(Boolean);
              tempFiltered = data.filter((item) =>
                list.includes(item[column]?.toString().toLowerCase())
              );
            }
            break;
          case "Is none of":
            {
              const list = Array.isArray(value)
                ? value.map((v) => String(v).toLowerCase())
                : String(value || "")
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .filter(Boolean);
              tempFiltered = data.filter(
                (item) => !list.includes(item[column]?.toString().toLowerCase())
              );
            }
            break;
          case "Reference Equals":
            // For reference equals, we need to compare values from different tables/columns
            // This assumes we have access to reference data through the same primary key
            tempFiltered = data.filter((item) => {
              if (!table2 || !field2) return false;
              // Compare the current table's column value with reference table's column value
              // This is a simplified implementation - in a real scenario, you'd need to
              // fetch data from the reference table and match by primary key
              return (
                item[column]?.toString().toLowerCase() ===
                item[field2]?.toString().toLowerCase()
              );
            });
            break;
          case "Reference Not Equals":
            // For reference not equals, we need to compare values from different tables/columns
            tempFiltered = data.filter((item) => {
              if (!table2 || !field2) return false;
              // Compare the current table's column value with reference table's column value
              return (
                item[column]?.toString().toLowerCase() !==
                item[field2]?.toString().toLowerCase()
              );
            });
            break;
          default:
            break;
        }

        if (group.operator === "AND") {
          filtered = filtered.filter((item) => tempFiltered.includes(item));
        } else {
          tempFiltered.forEach((item) => filtered.add(item));
        }

        if (
          operator === "Reference Equals" ||
          operator === "Reference Not Equals"
        ) {
          groupQueryStr += `${
            tableName === "Register" && table2 ? table + " - " : ""
          }${column} ${operator} ${
            tableName === "Register" && table2 ? table2 + " - " : ""
          }${field2}`;
        } else {
          groupQueryStr += `${
            tableName === "Register" && table ? table + " - " : ""
          }${column} ${operator} '${
            Array.isArray(value) ? value.join(", ") : value
          }'`;
        }
        if (index < group.conditions.length - 1) {
          groupQueryStr += ` ${group.operator} `;
        }
      });

      group.subGroups.forEach((subGroup, subIndex) => {
        const subFiltered = filterData(subGroup, data);
        if (group.operator === "AND") {
          filtered = filtered.filter((item) =>
            subFiltered.filtered.includes(item)
          );
        } else {
          subFiltered.filtered.forEach((item) => filtered.add(item));
        }

        if (subIndex > 0 || group.conditions.length > 0) {
          groupQueryStr += ` ${group.operator} `;
        }
        groupQueryStr += subFiltered.query;
      });

      groupQueryStr += ")";
      return { filtered: Array.from(filtered), query: groupQueryStr };
    };

    const { filtered, query } = filterData(
      {
        operator: groups[0].operator,
        conditions: groups[0].conditions,
        subGroups: groups[0].subGroups,
      },
      sourceData
    );

    console.log("Filtered Data:", filtered);
    console.log("Generated Query:", query);
    setFilteredData(filtered);
    onApplyFilters(filtered);
    setQuerySummary(query);
    onClose();
  };

  const handleFilterChange = (group, index, key, value) => {
    const newConditions = [...group.conditions];
    const updatedCondition = { ...newConditions[index], [key]: value };

    // Validation for reference operators - prevent same table selection
    if (
      tableName === "Register" &&
      ["Reference Equals", "Reference Not Equals"].includes(
        updatedCondition.operator
      )
    ) {
      if (key === "table" && value === updatedCondition.table2) {
        toast.error("Table Name and Reference Table cannot be the same.");
        return;
      }
      if (key === "table2" && value === updatedCondition.table) {
        toast.error("Reference Table cannot be the same as Table Name.");
        return;
      }
    }

    newConditions[index] = updatedCondition;
    const isDuplicate = newConditions.some(
      (cond, i) =>
        i !== index &&
        cond.table === updatedCondition.table &&
        cond.column === updatedCondition.column &&
        cond.operator === updatedCondition.operator &&
        cond.table2 === updatedCondition.table2 &&
        cond.field2 === updatedCondition.field2 &&
        JSON.stringify(cond.value) === JSON.stringify(updatedCondition.value)
    );
    if (isDuplicate) {
      toast.error("This filter already exists in the group.");
      return;
    }
    group.conditions = newConditions;
    setGroups([...groups]);
  };

  const handleAddGroup = (parentGroup) => {
    const newCondition = {
      ...(tableName === "Register"
        ? { table: "Register", table2: "", field2: "" }
        : {}),
      column: "",
      operator: "Equals",
      value: "",
    };

    const newGroup = {
      operator: "AND",
      conditions: [newCondition],
      subGroups: [],
    };
    parentGroup.subGroups.push(newGroup);
    setGroups([...groups]);
  };

  const handleRemoveCondition = (group, index) => {
    if (group.conditions.length > 1) {
      group.conditions.splice(index, 1);
      setGroups([...groups]);
      dispatch(removeFilter(index));

      // Clean up selected values for this condition
      const conditionKey = `${group.operator}-${index}`;
      setSelectedValues((prev) => {
        const newValues = { ...prev };
        delete newValues[conditionKey];
        return newValues;
      });
    }
  };

  const handleRemoveGroup = (parentGroup, subGroupIndex) => {
    parentGroup.subGroups.splice(subGroupIndex, 1);
    setGroups([...groups]);
  };

  // Function to handle value selection for Is any of/Is none of operators
  const handleValueSelection = (group, index, selectedValue) => {
    const conditionKey = `${group.operator}-${index}`;
    const currentSelected = selectedValues[conditionKey] || new Set();
    const newSelected = new Set(currentSelected);

    if (newSelected.has(selectedValue)) {
      newSelected.delete(selectedValue);
    } else {
      newSelected.add(selectedValue);
    }

    setSelectedValues((prev) => ({
      ...prev,
      [conditionKey]: newSelected,
    }));

    // Update the filter value with selected items
    handleFilterChange(
      group,
      index,
      "value",
      Array.from(newSelected).join(",")
    );
  };

  // const handleSelectAll = (group, index, columnId) => {
  //   const conditionKey = `${group.operator}-${index}`;
  //   const allValues = columnValues[columnId] || [];
  //   const lowerCaseValues = allValues.map((val) => val.toLowerCase());

  //   setSelectedValues((prev) => ({
  //     ...prev,
  //     [conditionKey]: new Set(lowerCaseValues),
  //   }));

  //   handleFilterChange(group, index, "value", lowerCaseValues);
  // };

  // const handleDeselectAll = (group, index) => {
  //   const conditionKey = `${group.operator}-${index}`;

  //   setSelectedValues((prev) => ({
  //     ...prev,
  //     [conditionKey]: new Set(),
  //   }));

  //   handleFilterChange(group, index, "value", "");
  // };

  // Load column values when operator changes to "Is any of" or "Is none of"
  const handleOperatorChange = async (group, index, operator) => {
    const conditionKey = `${group.operator}-${index}`;
    setSelectedValues((prev) => ({
      ...prev,
      [conditionKey]: new Set(),
    }));

    // Clear reference fields when switching away from reference operators
    if (!["Reference Equals", "Reference Not Equals"].includes(operator)) {
      if (tableName === "Register") {
        handleFilterChange(group, index, "table2", "");
        handleFilterChange(group, index, "field2", "");
      }
    }
    // else {
    //   // Auto-sync Reference Column with main Column when switching to reference operators
    //   if (tableName === "Register" && group.conditions[index].column) {
    //     handleFilterChange(
    //       group,
    //       index,
    //       "field2",
    //       group.conditions[index].column
    //     );
    //   }
    // }

    handleFilterChange(group, index, "operator", operator);

    if (["Is any of", "Is none of"].includes(operator)) {
      const column = group.conditions[index].column;
      if (column) {
        await getUniqueValuesForColumn(column);
      }
      handleFilterChange(group, index, "value", "");
    } else if (["Is not blank", "Is blank"].includes(operator)) {
      handleFilterChange(group, index, "value", "");
    }
  };

  const renderGroup = (group) => (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "10px",
        marginBottom: "10px",
      }}
    >
      <FormControl fullWidth sx={{ my: 1 }}>
        <InputLabel>Group Operator</InputLabel>
        <Select
          label="Group Operator"
          value={group.operator}
          onChange={(e) => {
            group.operator = e.target.value;
            setGroups([...groups]);
          }}
        >
          <MenuItem value="AND">AND</MenuItem>
          <MenuItem value="OR">OR</MenuItem>
        </Select>
      </FormControl>

      {group.conditions.map((filter, index) => {
        const conditionKey = `${group.operator}-${index}`;
        const currentSelectedValues = selectedValues[conditionKey] || new Set();
        const availableValues = columnValues[filter.column] || [];
        const isLoading = loadingColumnValues[filter.column] || false;

        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "10px",
              border: "1px solid #eee",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Table Name field - only visible for Register table */}
              {tableName === "Register" && (
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel>Register</InputLabel>
                  <Select
                    value={filter.table}
                    label="Register"
                    onChange={(e) => {
                      handleFilterChange(group, index, "table", e.target.value);
                      // Reset column selection when table changes
                      handleFilterChange(group, index, "column", "");
                      // Handle column fetching based on table selection
                      if (e.target.value === "Register") {
                        // For Register, use fieldsArray directly
                        setColumnName(fieldsArray || []);
                      } else if (e.target.value) {
                        // For other tables, fetch columns from API
                        fetchColumnsName(e.target.value);
                      }
                    }}
                  >
                    <MenuItem
                      value="Register"
                      disabled={
                        // For reference operators, disable the reference table
                        ["Reference Equals", "Reference Not Equals"].includes(
                          filter.operator
                        )
                          ? "Register" === filter.table2
                          : false
                      }
                    >
                      Register
                    </MenuItem>
                    {availableTables.map((table, idx) => (
                      <MenuItem
                        key={idx}
                        value={table}
                        disabled={
                          // For reference operators, disable the reference table
                          ["Reference Equals", "Reference Not Equals"].includes(
                            filter.operator
                          )
                            ? table === filter.table2
                            : false
                        }
                      >
                        {table}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Column</InputLabel>
                <Select
                  value={filter.column}
                  label="Column"
                  onChange={(e) => {
                    handleColumnChange(group, index, e.target.value);
                    // Auto-sync Reference Column when using reference operators
                    // if (
                    //   ["Reference Equals", "Reference Not Equals"].includes(
                    //     filter.operator
                    //   )
                    // ) {
                    //   handleFilterChange(
                    //     group,
                    //     index,
                    //     "field2",
                    //     e.target.value
                    //   );
                    // }
                  }}
                >
                  {availableColumns.map((item, idx) => (
                    <MenuItem key={idx} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Operator</InputLabel>
                <Select
                  label="Operator"
                  value={filter.operator}
                  onChange={(e) =>
                    handleOperatorChange(group, index, e.target.value)
                  }
                >
                  {operators.map((op, idx) => (
                    <MenuItem key={idx} value={op.value}>
                      {op.label} ({op.symbol})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {![
                "Is not blank",
                "Is blank",
                "Is any of",
                "Is none of",
                "Reference Equals",
                "Reference Not Equals",
              ].includes(filter.operator) && (
                <TextField
                  label="Value"
                  value={filter.value}
                  onChange={(e) =>
                    handleFilterChange(group, index, "value", e.target.value)
                  }
                />
              )}

              {/* Reference Table and Column fields for reference operators */}
              {["Reference Equals", "Reference Not Equals"].includes(
                filter.operator
              ) && (
                <>
                  <FormControl sx={{ minWidth: 140 }}>
                    <InputLabel>Reference Table</InputLabel>
                    <Select
                      value={filter.table2}
                      label="Reference Table"
                      onChange={(e) => {
                        handleFilterChange(
                          group,
                          index,
                          "table2",
                          e.target.value
                        );
                        // Reset reference column when table changes
                        handleFilterChange(group, index, "field2", "");
                        // Handle reference column fetching based on table selection
                        if (e.target.value === "Register") {
                          // For Register, columns are already available in fieldsArray (handled by getReferenceTableColumns)
                          console.log(
                            "Reference table 'Register' selected - using fieldsArray"
                          );
                        } else if (e.target.value) {
                          // For other tables, fetch columns from API
                          fetchReferenceTableColumns(e.target.value);
                        }
                      }}
                    >
                      <MenuItem
                        value="Register"
                        disabled={"Register" === filter.table} // Disable the same table as the main table
                      >
                        Register
                      </MenuItem>
                      {availableTables.map((table, idx) => (
                        <MenuItem
                          key={idx}
                          value={table}
                          disabled={table === filter.table} // Disable the same table as the main table
                        >
                          {table}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 140 }}>
                    <InputLabel>Reference Column</InputLabel>
                    <Select
                      value={filter.field2}
                      label="Reference Column"
                      onChange={(e) =>
                        handleFilterChange(
                          group,
                          index,
                          "field2",
                          e.target.value
                        )
                      }
                    >
                      {getReferenceTableColumns(filter.table2).map(
                        (item, idx) => (
                          <MenuItem key={idx} value={item}>
                            {item}
                          </MenuItem>
                        )
                      )}
                    </Select>
                  </FormControl>
                </>
              )}
              {group.conditions.length > 1 && (
                <Button
                  color="error"
                  onClick={() => handleRemoveCondition(group, index)}
                  sx={{ minWidth: "30px" }}
                >
                  <IoMdCloseCircleOutline size={24} />
                </Button>
              )}
            </div>

            <AdvanceFilterIsAnyOfList
              availableValues={availableValues}
              currentSelectedValues={currentSelectedValues}
              filter={filter}
              isLoading={isLoading}
              handleValueSelection={(val) =>
                handleValueSelection(group, index, val)
              }
            />
          </div>
        );
      })}

      <Button
        onClick={() => handleAddFilter(group)}
        variant="contained"
        color="primary"
      >
        Add Condition
      </Button>
      <Button
        onClick={() => handleAddGroup(group)}
        variant="outlined"
        color="secondary"
        sx={{ ml: 1 }}
      >
        Add Group
      </Button>

      {group.subGroups.map((subGroup, subIndex) => (
        <div key={subIndex} style={{ marginLeft: 0, marginTop: "10px" }}>
          {renderGroup(subGroup)}
          <Button
            color="error"
            onClick={() => handleRemoveGroup(group, subIndex)}
            sx={{ mt: 1 }}
          >
            Remove Group
          </Button>
        </div>
      ))}
    </div>
  );

  const hasValidFilters = groups.some((group) =>
    group.conditions.some(
      (cond) =>
        cond.column &&
        cond.operator &&
        (cond.value ||
          cond.operator.includes("blank") ||
          (["Is any of", "Is none of"].includes(cond.operator) &&
            Array.isArray(cond.value) &&
            cond.value.length > 0) ||
          (["Reference Equals", "Reference Not Equals"].includes(
            cond.operator
          ) &&
            cond.field2 &&
            cond.table2))
    )
  );

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
              className="relative bg-white shadow-lg sm:p-6 p-2 border rounded sm:mx-5 mx-2 max-h-[85vh] overflow-auto"
              sx={{ minWidth: "700px", maxWidth: "90vw" }}
            >
            <Typography variant="h6">
              Original Data ({sourceData?.length} records)
            </Typography>
            <Typography variant="body2">
              Filtered Data ({filteredData.length} records)
            </Typography>
            <Typography variant="body1" sx={{ my: 2 }}>
              <strong>Applied Query:</strong> {querySummary}
            </Typography>

            {groups.map((group, index) => (
              <div key={index}>
                <Typography variant="h6">Filters</Typography>
                <div key={index}>{renderGroup(group)}</div>
              </div>
            ))}

            <div className="flex justify-end mt-4">
              <button onClick={onClose} className="border rounded p-1 mr-2">
                Cancel
              </button>
              <Button
                variant="contained"
                color="secondary"
                onClick={applyFilters}
                disabled={!hasValidFilters}
              >
                Apply Filter
              </Button>
            </div>
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Modal>
  );
};
