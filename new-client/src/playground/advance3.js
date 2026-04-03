import React, { useState } from "react";
import {Card,Button,Select,MenuItem,TextField,FormControl,InputLabel,Typography,Table,TableBody,TableCell,
  TableContainer,TableHead,TableRow,Paper
} from "@mui/material";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { dummyData } from "../Data/filterData";

const operators = ["Contains", "Equals", "StartsWith", "EndsWith"];

const FilterComponent = () => {
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
  const handleAddFilter = (group) => {
    group.conditions.push({ column: "", operator: "Equals", value: "" });
    setGroups([...groups]);
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

        if (group.operator === "AND") {
            let filtered = [...data]; // Apply AND conditions sequentially

            group.conditions.forEach(({ column, operator, value }, index) => {
                if (!column || !operator || !value) return;

                if (operator === "Contains") {
                    filtered = filtered.filter((item) => item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
                } else if (operator === "Equals") {
                    filtered = filtered.filter((item) => item[column]?.toString().toLowerCase() === value.toLowerCase());
                } else if (operator === "StartsWith") {
                    filtered = filtered.filter((item) => item[column]?.toString().toLowerCase().startsWith(value.toLowerCase()));
                } else if (operator === "EndsWith") {
                    filtered = filtered.filter((item) => item[column]?.toString().toLowerCase().endsWith(value.toLowerCase()));
                }

                groupQueryStr += `${column} ${operator} '${value}'`;
                if (index < group.conditions.length - 1) {
                    groupQueryStr += ` ${group.operator} `;
                }
            });

            group.subGroups.forEach((subGroup, subIndex) => {
                const subFiltered = filterData(subGroup, data);
                filtered = filtered.filter((item) => subFiltered.filtered.includes(item));

                if (subIndex > 0 || group.conditions.length > 0) {
                    groupQueryStr += ` ${group.operator} `;
                }
                groupQueryStr += subFiltered.query;
            });

            groupQueryStr += ")";
            return { filtered, query: groupQueryStr };
        }

        // Handling OR: Collect all matches separately
        let filtered = new Set();

        group.conditions.forEach(({ column, operator, value }, index) => {
            if (!column || !operator || !value) return;

            let tempFiltered = [];

            if (operator === "Contains") {
                tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase().includes(value.toLowerCase()));
            } else if (operator === "Equals") {
                tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase() === value.toLowerCase());
            } else if (operator === "StartsWith") {
                tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase().startsWith(value.toLowerCase()));
            } else if (operator === "EndsWith") {
                tempFiltered = data.filter((item) => item[column]?.toString().toLowerCase().endsWith(value.toLowerCase()));
            }

            tempFiltered.forEach(item => filtered.add(item));

            groupQueryStr += `${column} ${operator} '${value}'`;
            if (index < group.conditions.length - 1) {
                groupQueryStr += ` ${group.operator} `;
            }
        });

        group.subGroups.forEach((subGroup, subIndex) => {
            const subFiltered = filterData(subGroup, data);
            subFiltered.filtered.forEach(item => filtered.add(item));

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


  const groupData = () => {
    if (!groupByColumn) return filteredData.map(item => ({ group: "Ungrouped", items: [item] }));

    const grouped = filteredData.reduce((acc, item) => {
      const key = item[groupByColumn] || "Others";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(grouped).map(([group, items]) => ({ group, items }));
  };


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
              {operators.map((op) => (
                <MenuItem key={op} value={op}>{op}</MenuItem>
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
                {columns.map((col) => (
                  <DraggableColumn key={col} column={col} />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {groupData().map(({ group, items }, index) => (
                <React.Fragment key={index}>
                  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                    <TableCell colSpan={4}><strong>{group}</strong></TableCell>
                  </TableRow>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.operatingSystem}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.manufacturer}</TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>

          </Table>
        </TableContainer>
      </Card>
    </DndProvider>
  );
};

export default FilterComponent;
