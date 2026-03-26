import React, { useState } from "react";
import {
  Card, Button, Select, MenuItem, TextField, FormControl, InputLabel, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Collapse,
} from "@mui/material";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { dummyData } from "../Data/filterData";

// const operators = ["Contains", "Equals", "StartsWith", "EndsWith"];


const operators = [
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
const FilterComponent = () => {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groups, setGroups] = useState([
    {
      operator: "AND",
      conditions: [{ column: "operatingSystem", operator: "Contains", value: "Microsoft" }],
      subGroups: []
    }
  ]);
  const [filteredData, setFilteredData] = useState(dummyData);
  const [querySummary, setQuerySummary] = useState("");
  const [groupedBy, setGroupedBy] = useState([]);
  const [groupByColumn, setGroupByColumn] = useState("");
  const [isGroupingByDrag, setisGroupingByDrag] = useState(false);
  const handleAddFilter = (group) => {
    group.conditions.push({ column: "", operator: "Equals", value: "" });
    setGroups([...groups]);
  };

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const handleFilterChange = (group, index, key, value) => {
    group.conditions[index][key] = value;
    setGroups([...groups]);
  };

  const handleAddGroup = (parentGroup) => {
    const newGroup = { operator: "AND", conditions: [{ column: "", operator: "Equals", value: "" }], subGroups: [] };
    parentGroup.subGroups.push(newGroup);
    setGroups([...groups]);
  };


  const applyFilters = () => {
    console.log("groups", groups);
  
    const filterData = (group, data) => {
      let groupQueryStr = "(";
      let filtered = group.operator === "AND" ? [...data] : new Set();
  
      group.conditions.forEach(({ column, operator, value }, index) => {
        if (!column || !operator) return;
  
        let tempFiltered = [];
  
        switch (operator) {
          case "Equals":
            tempFiltered = data.filter(item => item[column]?.toString().toLowerCase() === value.toLowerCase());
            break;
          case "Does not equal":
            tempFiltered = data.filter(item => item[column]?.toString().toLowerCase() !== value.toLowerCase());
            break;
          case "Is greater than":
            tempFiltered = data.filter(item => parseFloat(item[column]) > parseFloat(value));
            break;
          case "Is greater than or equal to":
            tempFiltered = data.filter(item => parseFloat(item[column]) >= parseFloat(value));
            break;
          case "Is less than":
            tempFiltered = data.filter(item => parseFloat(item[column]) < parseFloat(value));
            break;
          case "Is less than or equal to":
            tempFiltered = data.filter(item => parseFloat(item[column]) <= parseFloat(value));
            break;
          case "Is between":
            tempFiltered = data.filter(item => parseFloat(item[column]) >= parseFloat(value[0]) && parseFloat(item[column]) <= parseFloat(value[1]));
            break;
          case "Is not between":
            tempFiltered = data.filter(item => parseFloat(item[column]) < parseFloat(value[0]) || parseFloat(item[column]) > parseFloat(value[1]));
            break;
          case "Contains":
            tempFiltered = data.filter(item => item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
            break;
          case "Does not contain":
            tempFiltered = data.filter(item => !item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
            break;
          case "Is blank":
            tempFiltered = data.filter(item => !item[column] || item[column].toString().trim() === "");
            break;
          case "Is not blank":
            tempFiltered = data.filter(item => item[column] && item[column].toString().trim() !== "");
            break;
          case "Is any of":
            tempFiltered = data.filter(item => value.includes(item[column]?.toString().toLowerCase()));
            break;
          case "Is none of":
            tempFiltered = data.filter(item => !value.includes(item[column]?.toString().toLowerCase()));
            break;
          default:
            break;
        }
  
        if (group.operator === "AND") {
          filtered = filtered.filter(item => tempFiltered.includes(item));
        } else {
          tempFiltered.forEach(item => filtered.add(item));
        }
  
        groupQueryStr += `${column} ${operator} '${Array.isArray(value) ? value.join(", ") : value}'`;
        if (index < group.conditions.length - 1) {
          groupQueryStr += ` ${group.operator} `;
        }
      });
  
      group.subGroups.forEach((subGroup, subIndex) => {
        const subFiltered = filterData(subGroup, data);
        if (group.operator === "AND") {
          filtered = filtered.filter(item => subFiltered.filtered.includes(item));
        } else {
          subFiltered.filtered.forEach(item => filtered.add(item));
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
      { operator: groups[0].operator, conditions: groups[0].conditions, subGroups: groups[0].subGroups },
      dummyData
    );
  
    console.log("Filtered Data:", filtered);
    console.log("Generated Query:", query);
    setFilteredData(filtered);
    setQuerySummary(query);
  };
  

  // const applyFilters = () => {
  //   console.log("groups", groups);

  //   const filterData = (group, data) => {
  //     let groupQueryStr = "(";

  //     if (group.operator === "AND") {
  //       let filtered = [...data]; // Apply AND conditions sequentially

  //       group.conditions.forEach(({ column, operator, value }, index) => {
  //         if (!column || !operator || !value) return;

  //         if (operator === "Contains") {
  //           filtered = filtered.filter((item) => item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
  //         } else if (operator === "Equals") {
  //           filtered = filtered.filter((item) => item[column]?.toString().toLowerCase() === value.toLowerCase());
  //         } else if (operator === "StartsWith") {
  //           filtered = filtered.filter((item) => item[column]?.toString().toLowerCase().startsWith(value.toLowerCase()));
  //         } else if (operator === "EndsWith") {
  //           filtered = filtered.filter((item) => item[column]?.toString().toLowerCase().endsWith(value.toLowerCase()));
  //         }

  //         groupQueryStr += `${column} ${operator} '${value}'`;
  //         if (index < group.conditions.length - 1) {
  //           groupQueryStr += ` ${group.operator} `;
  //         }
  //       });

  //       group.subGroups.forEach((subGroup, subIndex) => {
  //         const subFiltered = filterData(subGroup, data);
  //         filtered = filtered.filter((item) => subFiltered.filtered.includes(item));

  //         if (subIndex > 0 || group.conditions.length > 0) {
  //           groupQueryStr += ` ${group.operator} `;
  //         }
  //         groupQueryStr += subFiltered.query;
  //       });

  //       groupQueryStr += ")";
  //       return { filtered, query: groupQueryStr };
  //     }

  //     // Handling OR: Collect all matches separately
  //     let filtered = new Set();

  //     group.conditions.forEach(({ column, operator, value }, index) => {
  //       if (!column || !operator || !value) return;

  //       let tempFiltered = [];

  //       if (operator === "Contains") {
  //         tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
  //       } else if (operator === "Equals") {
  //         tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase() === value.toLowerCase());
  //       } else if (operator === "StartsWith") {
  //         tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase().startsWith(value.toLowerCase()));
  //       } else if (operator === "EndsWith") {
  //         tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase().endsWith(value.toLowerCase()));
  //       }

  //       tempFiltered.forEach(item => filtered.add(item));

  //       groupQueryStr += `${column} ${operator} '${value}'`;
  //       if (index < group.conditions.length - 1) {
  //         groupQueryStr += ` ${group.operator} `;
  //       }
  //     });

  //     group.subGroups.forEach((subGroup, subIndex) => {
  //       const subFiltered = filterData(subGroup, data);
  //       subFiltered.filtered.forEach(item => filtered.add(item));

  //       if (subIndex > 0 || group.conditions.length > 0) {
  //         groupQueryStr += ` ${group.operator} `;
  //       }
  //       groupQueryStr += subFiltered.query;
  //     });

  //     groupQueryStr += ")";
  //     return { filtered: Array.from(filtered), query: groupQueryStr };
  //   };

  //   const { filtered, query } = filterData(
  //     { operator: groups[0].operator, conditions: groups[0].conditions, subGroups: groups[0].subGroups },
  //     dummyData
  //   );

  //   console.log("Filtered Data:", filtered);
  //   console.log("Generated Query:", query);
  //   setFilteredData(filtered);
  //   setQuerySummary(query);
  // };

  const columns = ["id", "operatingSystem", "status", "manufacturer"];

  const DraggableColumn = ({ column }) => {
    const [, ref] = useDrag({
      type: "COLUMN",
      item: { column }
    });

    return (
      <TableCell ref={ref} style={{ cursor: "grab", fontWeight: "bold" }}>
        {column}
      </TableCell>
    );
  };

  const groupData = (data, groupKeys, originalData) => {
    if (groupKeys.length === 0) return data;
  
    const grouped = data.reduce((acc, item) => {
      const key = item[groupKeys[0]] || "Others"; 
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  
    return Object.entries(grouped).map(([group, items]) => ({
      groupKey: groupKeys[0], // Column name for clarity
      groupValue: group, // Grouped value
      totalCount: items.length, // Total count in the group
      items: groupKeys.length > 1 ? groupData(items, groupKeys.slice(1), originalData) : items,
      isLastLevel: groupKeys.length === 1, // Identify last level for direct listing
    }));
  };
  
  const groupedData = groupData(filteredData, groupedBy, filteredData); 
  
  const renderGroupedRows = (groups, level = 0) => {
    return groups.map((groupData, index) => {
      const { groupKey, groupValue, totalCount, items, isLastLevel } = groupData;
      const groupDisplay = `${groupKey}. ${groupValue} (${totalCount})`;
      const groupKeyId = `${groupKey}-${groupValue}-${level}`;
  
      return (
        <React.Fragment key={index}>
          {/* Group Header Row */}
          <TableRow style={{ background: level === 0 ? "#f0f0f0" : "#e0e0e0" }}>
            <TableCell colSpan={columns.length}>
              <Button onClick={() => toggleGroup(groupKeyId)}>
                {expandedGroups[groupKeyId] ? "▼" : "▶"} {groupDisplay}
              </Button>
            </TableCell>
          </TableRow>
  
          <TableRow>
            <TableCell colSpan={columns.length}>
              <Collapse in={expandedGroups[groupKeyId]}>
                {isLastLevel ? ( // If last level, render table directly
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {columns.map((col, i) => (
                          <TableCell key={i}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          {columns.map((col, i) => (
                            <TableCell key={i}>{item[col]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Table size="small">
                    <TableBody>{renderGroupedRows(items, level + 1)}</TableBody>
                  </Table>
                )}
              </Collapse>
            </TableCell>
          </TableRow>
        </React.Fragment>
      );
    });
  };
  

  const renderGroup = (group) => (
    <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
      <FormControl fullWidth sx={{ my: 1 }}>
        <InputLabel>Group Operator</InputLabel>
        <Select
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
      {group.conditions.map((filter, index) => (
        <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Column</InputLabel>
            <Select value={filter.column} onChange={(e) => handleFilterChange(group, index, "column", e.target.value)}>
              <MenuItem value="operatingSystem">Operating System</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="manufacturer">Manufacturer</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Operator</InputLabel>
            <Select value={filter.operator} onChange={(e) => handleFilterChange(group, index, "operator", e.target.value)}>

              {operators.map((op, index) => (
                <MenuItem key={index} value={op.value}> {op.label} ({op.symbol})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Value"
            value={filter.value}
            onChange={(e) => handleFilterChange(group, index, "value", e.target.value)}
          />
        </div>
      ))}
      <Button onClick={() => handleAddFilter(group)} variant="contained" color="primary">Add Condition</Button>
      <Button onClick={() => handleAddGroup(group)} variant="outlined" color="secondary" sx={{ ml: 1 }}>Add Group</Button>

      {group.subGroups.map((subGroup, index) => (
        <div key={index} style={{ marginLeft: "20px", marginTop: "10px" }}>
          {renderGroup(subGroup)}
        </div>
      ))}
    </div>
  );

 


  const DropArea = () => {
    const [, ref] = useDrop({
      accept: "COLUMN",
      drop: (item) => {
        if (!groupedBy.includes(item.column)) {
          setGroupedBy([...groupedBy, item.column]);
        }
      }
    });

    return (
      <div ref={ref} style={{ minHeight: "40px", padding: "10px", border: "2px dashed #aaa", marginBottom: "10px" }}>
        {groupedBy.length > 0 ? (
          groupedBy.map((col, i) => (
            <Button key={i} variant="outlined" size="small" onClick={() => removeGroup(col)} sx={{ mr: 1 }}>
              {col} ×
            </Button>
          ))
        ) : (
          <Typography variant="body2">Drag columns here to group</Typography>
        )}
      </div>
    );
  };

  const removeGroup = (col) => {
    setGroupedBy(groupedBy.filter((c) => c !== col));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Card sx={{ p: 3, m: 3, width: "900px", overflow: "auto" }}>
        <Typography variant="h6">Original Data ({dummyData.length} records)</Typography>
        <Typography variant="body2">Filtered Data ({filteredData.length} records)</Typography>
        <Typography variant="body1" sx={{ my: 2 }}><strong>Applied Query:</strong> {querySummary}</Typography>

        {groups.map((group, index) => (
          <div key={index}>
            <Typography variant="h6">Filters</Typography>
            <div key={index}>{renderGroup(group)}</div>

          </div>
        ))}

        <Button onClick={applyFilters} variant="contained" color="secondary">Apply Filters</Button>

        <Typography variant="h6" sx={{ mt: 2 }}>Drag & Drop Grouping</Typography>
        <DropArea />

        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((col, index) => (
                  <DraggableColumn key={index} column={col} />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(filteredData && !groupedBy.length > 0) && filteredData.map((item, index) => (
                <React.Fragment key={index}>
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.operatingSystem}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.manufacturer}</TableCell>
                  </TableRow>
                  {/* ))} */}
                </React.Fragment>
              ))}
            </TableBody>
            {
                groupedBy.length > 0 &&
                <TableBody>{renderGroupedRows(groupedData)}</TableBody>
              }

          </Table>
        </TableContainer>
      </Card>
    </DndProvider>
  );
};

export default FilterComponent;
