import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Button,
} from "@mui/material";
import { AiOutlineClose } from "react-icons/ai";
import { useSelector, useDispatch } from "react-redux";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { removeFilter } from "../../redux/Slices/AdvancedFilterSlice";

export const ViewFiltersModal = ({
  isFiltersModalOpen,
  CloseFiltersModal,
  onApplyFilters,
  sourceData,
}) => {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.advancedFilter.filters);

  const handleRemoveFilter = (index) => {
    dispatch(removeFilter(index));
    const updatedFilters = [...filters];
    updatedFilters.splice(index, 1);
    applyRemainingFilters(updatedFilters);
  };

  const applyRemainingFilters = (currentFilters) => {
    if (!currentFilters || currentFilters.length === 0) {
      onApplyFilters(sourceData);
      return;
    }
    let filteredData = [...sourceData];

    currentFilters.forEach((filter) => {
      const {
        column,
        condition,
        value,
        tableName,
        referenceTableName,
        referenceColumn,
      } = filter;

      switch (condition) {
        case "Equals":
          filteredData = filteredData.filter(
            (item) =>
              item[column]?.toString().toLowerCase() === value.toLowerCase()
          );
          break;
        case "Does not equal":
          filteredData = filteredData.filter(
            (item) =>
              item[column]?.toString().toLowerCase() !== value.toLowerCase()
          );
          break;
        case "Is greater than":
          filteredData = filteredData.filter(
            (item) => parseFloat(item[column]) > parseFloat(value)
          );
          break;
        case "Is greater than or equal to":
          filteredData = filteredData.filter(
            (item) => parseFloat(item[column]) >= parseFloat(value)
          );
          break;
        case "Is less than":
          filteredData = filteredData.filter(
            (item) => parseFloat(item[column]) < parseFloat(value)
          );
          break;
        case "Is less than or equal to":
          filteredData = filteredData.filter(
            (item) => parseFloat(item[column]) <= parseFloat(value)
          );
          break;
        case "Is between":
          filteredData = filteredData.filter(
            (item) =>
              parseFloat(item[column]) >= parseFloat(value[0]) &&
              parseFloat(item[column]) <= parseFloat(value[1])
          );
          break;
        case "Is not between":
          filteredData = filteredData.filter(
            (item) =>
              parseFloat(item[column]) < parseFloat(value[0]) ||
              parseFloat(item[column]) > parseFloat(value[1])
          );
          break;
        case "Contains":
          filteredData = filteredData.filter((item) =>
            item[column]?.toString().toLowerCase().includes(value.toLowerCase())
          );
          break;
        case "Does not contain":
          filteredData = filteredData.filter(
            (item) =>
              !item[column]
                ?.toString()
                .toLowerCase()
                .includes(value.toLowerCase())
          );
          break;
        case "Is blank":
          filteredData = filteredData.filter(
            (item) => !item[column] || item[column].toString().trim() === ""
          );
          break;
        case "Is not blank":
          filteredData = filteredData.filter(
            (item) => item[column] && item[column].toString().trim() !== ""
          );
          break;
        case "Is any of":
          filteredData = filteredData.filter((item) =>
            value.includes(item[column]?.toString().toLowerCase())
          );
          break;
        case "Is none of":
          filteredData = filteredData.filter(
            (item) => !value.includes(item[column]?.toString().toLowerCase())
          );
          break;
        case "Reference Equals":
          // For reference operators, we'll log the operation for now
          // In a real application, this would involve cross-table data fetching
          console.log(
            `Reference Equals filter applied: ${filter.table}.${column} equals ${filter.table2}.${filter.field2}`
          );
          // For demonstration, we'll keep the data unchanged
          // In production, implement actual cross-table comparison logic
          break;
        case "Reference Not Equals":
          // For reference operators, we'll log the operation for now
          // In a real application, this would involve cross-table data fetching
          console.log(
            `Reference Not Equals filter applied: ${filter.table}.${column} not equals ${filter.table2}.${filter.field2}`
          );
          // For demonstration, we'll keep the data unchanged
          // In production, implement actual cross-table comparison logic
          break;
        default:
          break;
      }
    });
    onApplyFilters(filteredData);
  };

  return (
    <Dialog
      open={!!isFiltersModalOpen}
      onClose={CloseFiltersModal}
      // fullWidth
      maxWidth="xl"
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Added Filters
        </Typography>
        <IconButton
          aria-label="close"
          onClick={CloseFiltersModal}
          sx={{ position: "absolute", right: 8, top: 8, color: "gray" }}
        >
          <AiOutlineClose />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Column</strong>
              </TableCell>
              <TableCell>
                <strong>Condition</strong>
              </TableCell>
              <TableCell>
                <strong>Value</strong>
              </TableCell>
              <TableCell>
                <strong>Reference Info</strong>
              </TableCell>
              <TableCell>
                <strong>Operator</strong>
              </TableCell>
              <TableCell>
                <strong>Action</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filters?.map((filter, index) => (
              <TableRow
                key={index}
                sx={{
                  backgroundColor: index % 2 === 0 ? "white" : "grey.100",
                }}
              >
                <TableCell>
                  {filter.table
                    ? `${filter.table} - ${filter.column}`
                    : filter.column}
                </TableCell>
                <TableCell>{filter.condition}</TableCell>
                <TableCell>
                  {["Reference Equals", "Reference Not Equals"].includes(
                    filter.condition
                  )
                    ? "-"
                    : Array.isArray(filter.value)
                    ? filter.value.join(", ")
                    : filter.value}
                </TableCell>
                <TableCell>
                  {["Reference Equals", "Reference Not Equals"].includes(
                    filter.condition
                  )
                    ? `${filter.table2} - ${filter.field2}`
                    : "-"}
                </TableCell>
                <TableCell>{filter.operator}</TableCell>
                <TableCell>
                  <Button
                    color="error"
                    onClick={() => handleRemoveFilter(index)}
                    sx={{ minWidth: "30px" }}
                  >
                    <IoMdCloseCircleOutline size={24} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};
