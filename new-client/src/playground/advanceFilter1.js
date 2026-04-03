import React, { useState } from "react";
import {
  Card,
  Button,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";

const dummyData = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  operatingSystem: i % 2 === 0 ? "Microsoft" : "Linux",
  status: i % 3 === 0 ? "Active" : "Inactive",
  manufacturer: i % 4 === 0 ? "Microsoft" : "Azure"
}));

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
    const filterData = (group, data) => {
      let filtered = [...data];
      let groupQueryStr = "(";
  
      group.conditions.forEach(({ column, operator, value }, index) => {
        if (!column || !operator || !value) return;
  
        if (operator === "Contains") {
          filtered = filtered.filter((item) => item[column].toLowerCase().includes(value.toLowerCase()));
        } else if (operator === "Equals") {
          filtered = filtered.filter((item) => item[column] === value);
        } else if (operator === "StartsWith") {
          filtered = filtered.filter((item) => item[column].toLowerCase().startsWith(value.toLowerCase()));
        } else if (operator === "EndsWith") {
          filtered = filtered.filter((item) => item[column].toLowerCase().endsWith(value.toLowerCase()));
        }
  
        groupQueryStr += `${column} ${operator} '${value}'`;
        if (index < group.conditions.length - 1) {
          groupQueryStr += ` ${group.operator} `;
        }
      });
  
      group.subGroups.forEach((subGroup, subIndex) => {
        const subFiltered = filterData(subGroup, data);
        filtered = group.operator === "AND"
          ? filtered.filter((item) => subFiltered.filtered.includes(item))
          : [...new Set([...filtered, ...subFiltered.filtered])]; 
  
        if (subIndex > 0 || group.conditions.length > 0) {
          groupQueryStr += ` ${group.operator} `;
        }
        groupQueryStr += subFiltered.query;
      });
  
      groupQueryStr += ")";
      return { filtered, query: groupQueryStr };
    };
  
    // Pass actual `groups` as subGroups, not empty `conditions`
    const { filtered, query } = filterData({ operator: "AND", conditions: groups[0].conditions, subGroups: groups[0].subGroups }, dummyData);
    
    setFilteredData(filtered);
    setQuerySummary(query);
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
    <Card sx={{ p: 3, m: 3, width: "900px" ,overflow:"auto"}}>
      <Typography variant="h6">Original Data ({dummyData.length} records)</Typography>
      <Typography variant="body2">Filtered Data ({filteredData.length} records)</Typography>
      <Typography variant="body1" sx={{ my: 2 }}><strong>Applied Query:</strong> {querySummary}</Typography>
      
      {groups.map((group, index) => (
        <div key={index}>{renderGroup(group)}</div>
      ))}

      <Button onClick={applyFilters} variant="contained" color="secondary">Apply Filters</Button>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Operating System</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Manufacturer</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.operatingSystem}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.manufacturer}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default FilterComponent;


