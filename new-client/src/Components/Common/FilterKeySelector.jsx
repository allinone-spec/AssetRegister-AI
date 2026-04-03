import React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import OutlinedInput from "@mui/material/OutlinedInput";

/**
 * A component for selecting matched and ignore keys with Material-UI dropdowns
 * @param {Object} props - Component props
 * @param {string[]} props.matchedKey - Array of currently selected matched keys
 * @param {Function} props.setMatchedKey - Function to update matched keys
 * @param {string[]} props.ignoreKey - Array of currently selected ignore keys
 * @param {Function} props.setIgnoreKey - Function to update ignore keys
 * @param {string[]} props.columnOptions - Array of available column options
 * @param {boolean} props.isVisible - Whether the component should be visible
 * @returns {JSX.Element} The rendered component
 */
const FilterKeySelector = ({
  matchedKey,
  setMatchedKey,
  ignoreKey,
  setIgnoreKey,
  columnOptions,
  isVisible = true,
  editJob,
}) => {
  if (!isVisible) return null;

  return (
    <div className={`${!editJob && "sm:grid-cols-2"} grid gap-6 mt-4`}>
      <div>
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="matching-keys-label">Matching Keys</InputLabel>
          <Select
            labelId="matching-keys-label"
            id="matching-keys"
            multiple
            value={matchedKey}
            onChange={(event) => {
              const selectedValues = event.target.value;
              // Ensure no overlap with ignoreKey
              setMatchedKey(
                selectedValues.filter((key) => !ignoreKey.includes(key)),
              );
            }}
            input={<OutlinedInput label="Matching Keys" />}
            renderValue={(selected) => selected.join(", ")}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 224,
                  width: 250,
                },
              },
            }}
          >
            {columnOptions.map((column) => (
              <MenuItem
                key={column}
                value={column}
                disabled={
                  ignoreKey.includes(column) ||
                  [
                    "numberID",
                    "Rule_Filter_reason",
                    "updatedTime",
                    "createdTime",
                  ].includes(column)
                }
              >
                <Checkbox checked={matchedKey.indexOf(column) > -1} />
                <ListItemText primary={column} />
              </MenuItem>
            ))}
          </Select>
          {/* <Box sx={{ mt: 1, fontSize: "0.75rem", color: "text.secondary" }}>
            <Typography variant="caption">
              Select matching keys for update mode
            </Typography>
          </Box> */}
        </FormControl>
      </div>

      <div>
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="ignore-keys-label">Ignore Keys</InputLabel>
          <Select
            labelId="ignore-keys-label"
            id="ignore-keys"
            multiple
            value={ignoreKey}
            onChange={(event) => {
              const selectedValues = event.target.value;
              // Ensure no overlap with matchedKey
              setIgnoreKey(
                selectedValues.filter((key) => !matchedKey.includes(key)),
              );
            }}
            input={<OutlinedInput label="Ignore Keys" />}
            renderValue={(selected) => selected.join(", ")}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 224,
                  width: 250,
                },
              },
            }}
          >
            {columnOptions.map((column) => (
              <MenuItem
                key={column}
                value={column}
                disabled={
                  matchedKey.includes(column) ||
                  [
                    "numberID",
                    "Rule_Filter_reason",
                    "updatedTime",
                    "createdTime",
                  ].includes(column)
                }
              >
                <Checkbox checked={ignoreKey.indexOf(column) > -1} />
                <ListItemText primary={column} />
              </MenuItem>
            ))}
          </Select>
          {/* <Box sx={{ mt: 1, fontSize: "0.75rem", color: "text.secondary" }}>
            <Typography variant="caption">
              Keys cannot be selected in both dropdowns
            </Typography>
          </Box> */}
        </FormControl>
      </div>
    </div>
  );
};

export default FilterKeySelector;
