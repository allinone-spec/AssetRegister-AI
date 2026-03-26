import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { IoAdd } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import {
  addFilter,
  removeFilter,
  updateFilter,
  setFilters,
} from "../../redux/Slices/AdvancedFilterSlice";

export const AdvanceFilter = ({ isOpen, onClose, onApplyFilters, fieldsArray }) => {
  const dispatch = useDispatch();
  const [selectedOperater, setSelectedOperater] = useState("AND");
  const filters = useSelector((state) => state.advancedFilter.filters);
  console.log("fnbxbvjkn dioe", filters)

  const columnInputFields = [
    { label: "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_InventoryDate", type: "date" }
  ]
  const conditions = [
    { label: "Equals", value: "Equals", symbol: "=" },
    { label: "Does not equal", value: "Does not equal", symbol: "≠" },
    { label: "Is greater than", value: "Is greater than", symbol: ">" },
    { label: "Is greater than or equal to", value: "Is greater than or equal to", symbol: "≥" },
    { label: "Is less than", value: "Is less than", symbol: "<" },
    { label: "Is less than or equal to", value: "Is less than or equal to", symbol: "≤" },
    { label: "Is blank", value: "Is blank", symbol: "○" },
    { label: "Is not blank", value: "Is not blank", symbol: "●" },
    { label: "Contains", value: "Contains", symbol: "⊆" },
    { label: "Does not contain", value: "Does not contain", symbol: "⊈" },
  ];

  const operators = [
    { label: "AND", value: "AND", symbol: "AND" },
    { label: "OR", value: "OR", symbol: "OR" },
    { label: "Add Group", value: "Add Group", symbol: "+" },
    { label: "Add Condition", value: "Add Condition", symbol: "+" },
    { label: "Remove", value: "Remove", symbol: "X" },
  ];

  const handleAddFilter = () => {
    dispatch(
      addFilter({
        column: fieldsArray && fieldsArray.length > 0 ? fieldsArray[0] : '',
        condition: conditions[0].value,
        value: "",
        operator: "AND",
        indentLevel: 0,
      })
    );
  };


  const handleRemoveFilter = (index) => {
    dispatch(removeFilter(index));
  };

  const handleFilterChange = (index, field, value) => {
    if (field === "operator") {
      if (value === "Add Group") {
        dispatch(
          addFilter({
            column: fieldsArray && fieldsArray.length > 0 ? fieldsArray[0] : '',
            condition: conditions[0].value,
            value: "",
            operator: "AND",
            indentLevel: 0,
          })
        );
      } else if (value === "Add Condition") {
        dispatch(
          addFilter({
            column: fieldsArray && fieldsArray.length > 0 ? fieldsArray[0] : '',
            condition: conditions[0].value,
            value: "",
            operator: "AND",
            indentLevel: 0,
          })
        );
      } else if (value === "Remove") {
        if (filters.length > 1) {
          dispatch(removeFilter(index));
        }
      } else if (value === "AND") {
        dispatch(
          addFilter({
            column: fieldsArray && fieldsArray.length > 0 ? fieldsArray[0] : '',
            condition: conditions[0].value,
            value: "",
            operator: "AND",
            indentLevel: 0,
          })
        );
      } else if (value === "OR") {
        dispatch(
          addFilter({
            column: fieldsArray && fieldsArray.length > 0 ? fieldsArray[0] : '',
            condition: conditions[0].value,
            value: "",
            operator: "OR",
            indentLevel: index + 1,
          })
        );
      } else {
        dispatch(updateFilter({ index, field, value }));
      }
    } else {
      dispatch(updateFilter({ index, field, value }));
    }
  };



  const getInputWidth = useMemo(() => {
    return (condition) => {
      switch (condition) {
        case "Is between":
        case "Is not between":
          return "w-48"; // Adjust as needed for two inputs
        case "Is any of":
        case "Is none of":
          return "w-64"; // Adjust as needed for multiple values
        default:
          return "w-32"; // Default width
      }
    };
  }, []);

  return (
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute z-10 transform -translate-x-1/2 w-[50vw] bg-white shadow-lg p-4 border rounded"
          >
            <div className="flex justify-between items-center border-b pb-2 mb-2">
              <h4 className="text-lg font-semibold">Advanced Filter</h4>
              <IoMdCloseCircleOutline
                className="text-red-500 text-xl cursor-pointer"
                onClick={onClose}
              />
            </div>

            <div className="flex items-center mb-2">
              <select
                value={selectedOperater}
                onChange={(e) => setSelectedOperater(e.target.value)}
                className="border rounded p-1 mr-2 w-fit"
              >
                {operators?.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.symbol} {op.label}
                  </option>

                ))}
              </select>
              <IoAdd
                onClick={() => handleFilterChange(filters.length, "operator", selectedOperater)}
                className="cursor-pointer"
              />
            </div>
            {Array.isArray(filters) && filters?.map((filter, index) => (
              <div key={index} className="flex items-center mb-2 w-auto" style={{ paddingLeft: `${filter.operator === "OR" ? '20px' : ""}` }}>
                <select
                  value={filter.column}
                  onChange={(e) => handleFilterChange(index, "column", e.target.value)}
                  className="border rounded p-1 mr-2 w-[10rem]"
                >
                  {fieldsArray?.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>

                <select
                  value={filter.condition}
                  onChange={(e) => handleFilterChange(index, "condition", e.target.value)}
                  className="border rounded p-1 mr-2"
                >
                  {conditions.map((cond) => (
                    <option key={cond.value} value={cond.value}>
                      {cond.symbol} {cond.label}
                    </option>
                  ))}
                </select>
                {console.log("filter for input type", filter,)}
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                  className={`border rounded p-1 mr-2 ${getInputWidth(filter.condition)}`}
                  placeholder="Search..."
                />

                {index > 0 && (
                  <button
                    onClick={() => handleRemoveFilter(index)}
                    className="text-red-500"
                  >
                    X
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleAddFilter}
              className="bg-blue-500 text-white rounded p-1 mt-2"
            >
              Add Filter
            </button>

            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="border rounded p-1 mr-2"
              >
                Cancel
              </button>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



// import React, { useState, useMemo } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { IoMdCloseCircleOutline } from "react-icons/io";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   Card, Button, Select, MenuItem, TextField, FormControl, InputLabel, Typography, Box, Modal
// } from "@mui/material";
// import { setFilters, addFilter } from "../../redux/Slices/AdvancedFilterSlice";
// const operators = [
//   { label: "Equals", value: "Equals", symbol: "=" },
//   { label: "Does not equal", value: "Does not equal", symbol: "≠" },
//   { label: "Is greater than", value: "Is greater than", symbol: ">" },
//   { label: "Is greater than or equal to", value: "Is greater than or equal to", symbol: "≥" },
//   { label: "Is less than", value: "Is less than", symbol: "<" },
//   { label: "Is less than or equal to", value: "Is less than or equal to", symbol: "≤" },
//   { label: "Is between", value: "Is between", symbol: "↔" },
//   { label: "Is not between", value: "Is not between", symbol: "↮" },

//   { label: "Is blank", value: "Is blank", symbol: "○" },
//   { label: "Is not blank", value: "Is not blank", symbol: "●" },
//   { label: "Contains", value: "Contains", symbol: "⊆" },
//   { label: "Does not contain", value: "Does not contain", symbol: "⊈" },
//   { label: "Is any of", value: "Is any of", symbol: "***" },
//   { label: "Is none of", value: "Is none of", symbol: "***" },
// ];

// export const AdvanceFilter = ({ isOpen, onClose, fieldsArray, onApplyFilters, originalData, sourceData }) => {
//   const dispatch = useDispatch();
//   const [filteredData, setFilteredData] = useState(originalData);
//   const [querySummary, setQuerySummary] = useState("");

//   const [groups, setGroups] = useState([
//     {
//       operator: "AND",
//       conditions: [{ column: "", operator: "Contains", value: "" }],
//       subGroups: []
//     }
//   ]);
//   const handleAddFilter = (group) => {
//     group.conditions.push({ column: "", operator: "Equals", value: "" });
//     setGroups([...groups]);
//   };

//   const applyFilters = () => {
//     console.log("groups", groups);

//     const filterData = (group, data) => {
//       let groupQueryStr = "(";
//       let filtered = group.operator === "AND" ? [...data] : new Set();

//       group.conditions.forEach(({ column, operator, value }, index) => {
//         if (!column || !operator) return;

//         dispatch(addFilter({ column, condition: operator, value, operator: group.operator }));



//         let tempFiltered = [];

//         switch (operator) {
//           case "Equals":
//             tempFiltered = data.filter(item => item[column]?.toString().toLowerCase() === value.toLowerCase());
//             break;
//           case "Does not equal":
//             tempFiltered = data.filter(item => item[column]?.toString().toLowerCase() !== value.toLowerCase());
//             break;
//           case "Is greater than":
//             tempFiltered = data.filter(item => parseFloat(item[column]) > parseFloat(value));
//             break;
//           case "Is greater than or equal to":
//             tempFiltered = data.filter(item => parseFloat(item[column]) >= parseFloat(value));
//             break;
//           case "Is less than":
//             tempFiltered = data.filter(item => parseFloat(item[column]) < parseFloat(value));
//             break;
//           case "Is less than or equal to":
//             tempFiltered = data.filter(item => parseFloat(item[column]) <= parseFloat(value));
//             break;
//           case "Is between":
//             tempFiltered = data.filter(item => parseFloat(item[column]) >= parseFloat(value[0]) && parseFloat(item[column]) <= parseFloat(value[1]));
//             break;
//           case "Is not between":
//             tempFiltered = data.filter(item => parseFloat(item[column]) < parseFloat(value[0]) || parseFloat(item[column]) > parseFloat(value[1]));
//             break;
//           case "Contains":
//             tempFiltered = data.filter(item => item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
//             break;
//           case "Does not contain":
//             tempFiltered = data.filter(item => !item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
//             break;
//           case "Is blank":
//             tempFiltered = data.filter(item => !item[column] || item[column].toString().trim() === "");
//             break;
//           case "Is not blank":
//             tempFiltered = data.filter(item => item[column] && item[column].toString().trim() !== "");
//             break;
//           case "Is any of":
//             tempFiltered = data.filter(item => value.includes(item[column]?.toString().toLowerCase()));
//             break;
//           case "Is none of":
//             tempFiltered = data.filter(item => !value.includes(item[column]?.toString().toLowerCase()));
//             break;
//           default:
//             break;
//         }

//         if (group.operator === "AND") {
//           filtered = filtered.filter(item => tempFiltered.includes(item));
//         } else {
//           tempFiltered.forEach(item => filtered.add(item));
//         }

//         groupQueryStr += `${column} ${operator} '${Array.isArray(value) ? value.join(", ") : value}'`;
//         if (index < group.conditions.length - 1) {
//           groupQueryStr += ` ${group.operator} `;
//         }
//       });

//       group.subGroups.forEach((subGroup, subIndex) => {
//         const subFiltered = filterData(subGroup, data);
//         if (group.operator === "AND") {
//           filtered = filtered.filter(item => subFiltered.filtered.includes(item));
//         } else {
//           subFiltered.filtered.forEach(item => filtered.add(item));
//         }

//         if (subIndex > 0 || group.conditions.length > 0) {
//           groupQueryStr += ` ${group.operator} `;
//         }
//         groupQueryStr += subFiltered.query;
//       });

//       groupQueryStr += ")";
//       return { filtered: Array.from(filtered), query: groupQueryStr };
//     };

//     const { filtered, query } = filterData(
//       { operator: groups[0].operator, conditions: groups[0].conditions, subGroups: groups[0].subGroups },
//       // originalData
//       sourceData
//     );

//     console.log("Filtered Data:", filtered);
//     console.log("Generated Query:", query);
//     setFilteredData(filtered);
//     onApplyFilters(filtered)
//     setQuerySummary(query);
//   };


//   const handleFilterChange = (group, index, key, value) => {
//     group.conditions[index][key] = value;
//     setGroups([...groups]);
//   };

//   const handleAddGroup = (parentGroup) => {
//     const newGroup = { operator: "AND", conditions: [{ column: "", operator: "Equals", value: "" }], subGroups: [] };
//     parentGroup.subGroups.push(newGroup);
//     setGroups([...groups]);
//   };

//   const handleRemoveCondition = (group, index) => {
//     if (group.conditions.length > 1) {
//       group.conditions.splice(index, 1);
//       setGroups([...groups]);
//     }
//   };

//   const handleRemoveGroup = (parentGroup, subGroupIndex) => {
//     parentGroup.subGroups.splice(subGroupIndex, 1);
//     setGroups([...groups]);
//   };



//   const renderGroup = (group) => (
//     <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
//       <FormControl fullWidth sx={{ my: 1 }}>
//         <InputLabel>Group Operator</InputLabel>
//         <Select
//           value={group.operator}
//           onChange={(e) => {
//             group.operator = e.target.value;
//             setGroups([...groups]);
//           }}

//         >
//           <MenuItem value="AND">AND</MenuItem>
//           <MenuItem value="OR">OR</MenuItem>
//         </Select>
//       </FormControl>
//       {group.conditions.map((filter, index) => (
//         <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px", zIndex: "99999" }}>
//           <FormControl sx={{ minWidth: 120 }}>
//             <InputLabel>Column</InputLabel>
//             <Select value={filter.column} onChange={(e) => handleFilterChange(group, index, "column", e.target.value)}>

//               {fieldsArray.map((item, index) => (
//                 <MenuItem key={index} value={item}>{item}</MenuItem>

//               ))}
//             </Select>
//           </FormControl>
//           <FormControl sx={{ minWidth: 120 }}>
//             <InputLabel>Operator</InputLabel>
//             <Select value={filter.operator} onChange={(e) => handleFilterChange(group, index, "operator", e.target.value)}>

//               {operators.map((op, index) => (
//                 <MenuItem key={index} value={op.value}> {op.label} ({op.symbol})</MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//           <TextField
//             label="Value"
//             value={filter.value}
//             onChange={(e) => handleFilterChange(group, index, "value", e.target.value)}
//           />
//           {group.conditions.length > 1 && (
//             <Button
//               color="error"
//               onClick={() => handleRemoveCondition(group, index)}
//               sx={{ minWidth: "30px" }}
//             >
//               <IoMdCloseCircleOutline size={24} />
//             </Button>
//           )}
//         </div>
//       ))}
//       <Button onClick={() => handleAddFilter(group)} variant="contained" color="primary">Add Condition</Button>
//       <Button onClick={() => handleAddGroup(group)} variant="outlined" color="secondary" sx={{ ml: 1 }}>Add Group</Button>


//       {group.subGroups.map((subGroup, index) => (
//         <div key={index} style={{ marginLeft: "20px", marginTop: "10px" }}>
//           {renderGroup(subGroup)}
//           <Button
//             color="error"
//             onClick={() => handleRemoveGroup(group, index)}
//             sx={{ mt: 1 }}
//           >
//             Remove Group
//           </Button>

//         </div>
//       ))}
//     </div>
//   );




//   return (
//     <Modal open={isOpen} onClose={onClose}>
//       <AnimatePresence>
//         <motion.div
//           initial={{ opacity: 0, scale: 0.95, y: -10 }}
//           animate={{ opacity: 1, scale: 1, y: 0 }}
//           exit={{ opacity: 0, scale: 0.95, y: -10 }}
//           transition={{ duration: 0.3, ease: "easeInOut" }}
//           className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 z-10"
//         >
//           <Box className="relative w-[50vw] bg-white shadow-lg p-6 border rounded">
//             <Button onClick={onClose} className="absolute top-2 right-2">
//               Close
//             </Button>
//             <Card sx={{ p: 3, m: 3, maxWidth: "900px", overflow: "auto" }}>
//               {/* <Typography variant="h6">Original Data ({originalData.length} records)</Typography> */}
//               <Typography variant="h6">Original Data ({sourceData?.length} records)</Typography>
//               <Typography variant="body2">Filtered Data ({filteredData.length} records)</Typography>
//               <Typography variant="body1" sx={{ my: 2 }}><strong>Applied Query:</strong> {querySummary}</Typography>

//               {groups.map((group, index) => (
//                 <div key={index}>
//                   <Typography variant="h6">Filters</Typography>
//                   <div key={index}>{renderGroup(group)}</div>

//                 </div>
//               ))}

//               <Button onClick={applyFilters} variant="contained" color="secondary">Apply Filters</Button>
//             </Card>
//             <div className="flex justify-end mt-4">
//               <button
//                 onClick={onClose}
//                 className="border rounded p-1 mr-2"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={onClose}
//                 className="bg-green-500 text-white rounded p-1"
//               >
//                 OK
//               </button>
//             </div>
//           </Box>

//         </motion.div>
//       </AnimatePresence>
//     </Modal>
//   );
// };




