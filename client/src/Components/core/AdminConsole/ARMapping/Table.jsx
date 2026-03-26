import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import {
  Select,
  MenuItem,
  CircularProgress,
  Checkbox,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Autocomplete,
  InputLabel,
  FormControl,
} from "@mui/material";
import {
  getRequest,
  postDataRequest,
} from "../../../../Service/Console.service";
import { useLocation } from "react-router-dom";
import PageLayout from "../../../Common/PageLayout";
import toast from "react-hot-toast";
import { CiEdit } from "react-icons/ci";
import BackButton from "../../../Common/BackButton";
import SubmitBtn from "../../../Common/SubmitBtn";
import DataTable from "../../../Common/DataTable";
import { MdDelete } from "react-icons/md";
import { deleteRequest, patchRequest } from "../../../../Service/admin.save";
import { useSelector } from "react-redux";
import { useTheme } from "../../../../ThemeContext";

const dcDataTypes = [
  "BIGINT",
  "INT",
  "FLOAT",
  "BIT",
  "BOOLEAN",
  "BINARY",
  "VARBINARY",
  "DATETIME",
  "VARCHAR",
  "NVARCHAR",
  "VARCHAR_MAX",
  "NVARCHAR_MAX",
];

const dateFormats = [
  { id: 100, type: "mon dd yyyy hh:miAM (or PM)" },
  { id: 101, type: "mm/dd/yyyy" },
  { id: 102, type: "yyyy.mm.dd" },
  { id: 103, type: "dd/mm/yyyy" },
  { id: 104, type: "dd.mm.yyyy" },
  { id: 105, type: "dd-mm-yyyy" },
  { id: 106, type: "dd mon yyyy" },
  { id: 107, type: "Mon dd, yyyy" },
  { id: 108, type: "hh:mi:ss" },
  { id: 109, type: "mon dd yyyy hh:mi:ss:mmmAM (or PM)" },
  { id: 110, type: "mm-dd-yyyy" },
  { id: 111, type: "yyyy/mm/dd" },
  { id: 112, type: "yyyymmdd" },
  { id: 113, type: "dd mon yyyy hh:mi:ss:mmm(24h)" },
  { id: 114, type: "hh:mi:ss:mmm(24h)" },
  { id: 120, type: "yyyy-mm-dd hh:mi:ss(24h)" },
  { id: 121, type: "yyyy-mm-dd hh:mi:ss.mmm(24h)" },
  { id: 126, type: "yyyy-mm-ddThh:mi:ss.mmm (no spaces)" },
  { id: 130, type: "dd mon yyyy hh:mi:ss:mmmAM" },
  { id: 131, type: "dd/mm/yyyy hh:mi:ss:mmmAM" },
];

const ARTable = ({ routeName }) => {
  const dispatch = useDispatch();
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isExecuteLoading, setIsExecuteLoading] = useState(false);
  const location = useLocation();
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [storedFilterId, setStoredFilterId] = useState(() => {
    return localStorage.getItem("arMapping_storedFilterId") || null;
  });

  const [mappedColumns, setMappedColumns] = useState([]);
  const [DataLoading, setDataLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkIgnoreValue, setBulkIgnoreValue] = useState("");
  const [bulkDcDatatype, setBulkDcDatatype] = useState("");
  const [bulkDateFormat, setBulkDateFormat] = useState("");

  const [newColumnName, setNewColumnName] = useState("");
  const [openNewColumnDialog, setOpenNewColumnDialog] = useState(false);
  const [showInput, setShowInput] = useState({});
  const [editingColumn, setEditingColumn] = useState({});
  const [editColumnDialog, setEditColumnDialog] = useState({
    open: false,
    originalColumnName: "",
    columnName: "",
    error: false,
  });
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );

  const { data } = location.state || "";

  const getFiles = async () => {
    setDataLoading(true);
    setIsLoading(true);
    try {
      const currentFilterId = data?.filterId || storedFilterId;
      const [columnsResponse, mappingResponse] = await Promise.all([
        getRequest(`/table/${data?.ACTableName}/getColumns`),
        currentFilterId
          ? getRequest(`/filter/${currentFilterId}/get`)
          : Promise.resolve(null),
      ]);

      if (columnsResponse.status === 200) {
        const columns = columnsResponse?.data || [];

        let processedMappingData = {
          filterId: null,
          tableName: "",
          jobName: "",
          renameColumns: [],
          deleteColumns: [],
          changeDataTypeColumns: [],
          primaryKey: "",
          secondaryKey: "",
          matchedKey: "",
          ignoreKey: "",
        };

        if (mappingResponse) {
          processedMappingData = {
            ...mappingResponse.data,
            deleteColumns: JSON.parse(mappingResponse.data.deleteColumns),
            renameColumns: JSON.parse(mappingResponse.data.renameColumns),
            changeDataTypeColumns: JSON.parse(
              mappingResponse.data.changeDataTypeColumns,
            ),
          };
        }

        // Parse matchedKey and ignoreKey into arrays
        const matchedKeyArray = processedMappingData.matchedKey
          ? processedMappingData.matchedKey.split(",").map((k) => k.trim())
          : [];
        const ignoreKeyArray = processedMappingData.ignoreKey
          ? processedMappingData.ignoreKey.split(",").map((k) => k.trim())
          : [];

        // Process everything together
        const initialRows = columns.map((col) => {
          const row = {
            acColumnName: col,
            checkBoxDisable: ![
              "numberID",
              "Rule_Filter_reason",
              "updatedTime",
              "createdTime",
              "import_status_update",
            ].includes(col),
            ignoreInDC: "No",
            dcDatatype: "",
            mappedColumn: "",
            isPrimaryKey: false,
            isSecondaryKey: false,
            isMatchingKey: false,
            isIgnoreKey: false,
          };

          // Apply mapping logic immediately if we have mapping data
          if (processedMappingData.filterId || currentFilterId) {
            const columnName = row.acColumnName;

            // Handle deleted/ignored columns
            if (processedMappingData.deleteColumns.includes(columnName)) {
              row.ignoreInDC = "Yes";
            }

            // Handle primary key
            if (columnName === processedMappingData.primaryKey) {
              row.isPrimaryKey = true;
            }

            // Handle secondary key
            if (columnName === processedMappingData.secondaryKey) {
              row.isSecondaryKey = true;
            }

            // Handle matching key
            if (matchedKeyArray.includes(columnName)) {
              row.isMatchingKey = true;
            }

            // Handle ignore key
            if (ignoreKeyArray.includes(columnName)) {
              row.isIgnoreKey = true;
            }

            // Handle data type changes
            const dataTypeChange =
              processedMappingData.changeDataTypeColumns.find(
                (item) => item.columnName === columnName,
              );

            if (dataTypeChange) {
              row.dcDatatype = dataTypeChange.newDataType;
              if (
                dataTypeChange.newDataType === "DATETIME" &&
                dataTypeChange.formattedDateCode
              ) {
                row.formattedDateCode = dataTypeChange.formattedDateCode;
              }
            }

            // Handle renamed columns
            const renamedColumn = processedMappingData.renameColumns.find(
              (item) => item.oldName === columnName,
            );
            if (renamedColumn) {
              row.mappedColumn = renamedColumn.newName;
            }
          }

          return row;
        });

        setRows(initialRows);
      }
    } catch (error) {
      console.error("error", error);
    } finally {
      setDataLoading(false);
      setIsLoading(false);
    }
  };

  const getsMappedFilters = async () => {
    setDataLoading(true);
    try {
      const response = await getRequest(`/filter/mappedColumns`);
      if (response.status === 200) {
        setMappedColumns(response?.data || []);
      }
    } catch (error) {
      console.error("error", error);
      setMappedColumns([]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleChange = (index, field, value) => {
    const updatedRows = rows.map((row, i) => {
      if (i === index) {
        if (field === "ignoreInDC" && value === "Yes") {
          return {
            ...row,
            ignoreInDC: value,
            dcDatatype: "",
            mappedColumn: "",
          };
        }
        return { ...row, [field]: value };
      }
      return row;
    });
    setRows(updatedRows);
  };

  const handlePrimaryKeyChange = async (index) => {
    const updatedRows = rows.map((row, i) => {
      if (i === index) {
        return { ...row, isPrimaryKey: !row.isPrimaryKey };
      } else {
        return { ...row, isPrimaryKey: false };
      }
    });
    setRows(updatedRows);
  };

  const handleSecondaryKeyChange = async (index) => {
    const updatedRows = rows.map((row, i) => {
      if (i === index) {
        return { ...row, isSecondaryKey: !row.isSecondaryKey };
      } else {
        return { ...row, isSecondaryKey: false };
      }
    });
    setRows(updatedRows);
  };

  const handleMatchingKeyChange = (index) => {
    const updatedRows = rows.map((row, i) => {
      if (i === index) {
        const newMatchingKeyValue = !row.isMatchingKey;
        // If checking matching key, uncheck ignore key for the same row
        return {
          ...row,
          isMatchingKey: newMatchingKeyValue,
          isIgnoreKey: newMatchingKeyValue ? false : row.isIgnoreKey,
        };
      }
      return row;
    });
    setRows(updatedRows);
  };

  const handleIgnoreKeyChange = (index) => {
    const updatedRows = rows.map((row, i) => {
      if (i === index) {
        const newIgnoreKeyValue = !row.isIgnoreKey;
        // If checking ignore key, uncheck matching key for the same row
        return {
          ...row,
          isIgnoreKey: newIgnoreKeyValue,
          isMatchingKey: newIgnoreKeyValue ? false : row.isMatchingKey,
        };
      }
      return row;
    });
    setRows(updatedRows);
  };

  const handleSaveTable = async (isExecute) => {
    if (isExecute) setIsExecuteLoading(true);
    else setIsSaveLoading(true);
    try {
      const primaryKeys = rows.filter((row) => row.isPrimaryKey);
      if (primaryKeys.length > 1) {
        toast.error(
          "Multiple primary keys selected. Only one primary key is allowed.",
        );
        return;
      }
      // Validate at least one matching key is selected
      const matchingKeys = rows.filter((row) => row.isMatchingKey);
      if (matchingKeys.length === 0 && data?.triggerButton === "update") {
        toast.error("At least one Matching Key must be selected.");
        return;
      }

      // Prepare matchedKey and ignoreKey as comma-separated strings
      const matchedKeyString = rows
        .filter((row) => row.isMatchingKey)
        .map((row) => row.acColumnName)
        .join(",");

      const ignoreKeyString = rows
        .filter((row) => row.isIgnoreKey)
        .map((row) => row.acColumnName)
        .join(",");

      const payload = {
        tableName: data?.ACTableName,
        JobId: data?.id,
        dataTypeChanges: rows
          .filter((row) => row.dcDatatype && row.ignoreInDC === "No")
          .map((row) => ({
            columnName: row.acColumnName,
            newDataType: row.dcDatatype,
            formattedDateCode: row.formattedDateCode,
          })),
        ignoreColumns: rows
          .filter((row) => row.ignoreInDC === "Yes")
          .map((row) => row.acColumnName),
        renameColumns: rows
          .filter((row) => row.mappedColumn)
          .map((row) => ({
            oldName: row.acColumnName,
            newName: row.mappedColumn,
          })),
        primaryKey: rows.find((row) => row.isPrimaryKey)?.acColumnName || "",
        jobName: data?.jobName,
        secondaryKey:
          rows.find((row) => row.isSecondaryKey)?.acColumnName || "",
        matchedKey: matchedKeyString,
        ignoreKey: ignoreKeyString,
      };

      const response = await postDataRequest(
        isExecute ? "/filter/execute" : "/filter/save",
        payload,
      );
      if (response?.status === 200) {
        if (response.data?.filterId) {
          setStoredFilterId(response.data?.filterId);
        }
        toast.success("Successfully Updated Table");
      }
    } catch (error) {
      console.error("Error updating table:", error);
      toast.error(error.response?.data.error || "Failed to Update Table data");
    } finally {
      if (isExecute) setIsExecuteLoading(false);
      else setIsSaveLoading(false);
    }
  };

  const handleOpenNewColumnDialog = (index) => {
    setOpenNewColumnDialog(true);
  };

  const handleCloseNewColumnDialog = () => {
    setOpenNewColumnDialog(false);
    setNewColumnName("");
  };

  const handleCreateNewColumn = async () => {
    try {
      const response = await postDataRequest(
        `/filter/add/mappedColumns?columnName=${newColumnName}`,
      );
      if (response?.status === 201 || response?.status === 200) {
        toast.success("New column created successfully");
        getsMappedFilters();
        handleCloseNewColumnDialog();
      }
    } catch (error) {
      console.error("Error creating new column:", error);
      toast.error(error.response?.data.error || "Failed to create new column");
    }
  };

  useEffect(() => {
    getsMappedFilters();
  }, []);

  // Update localStorage when storedFilterId changes
  useEffect(() => {
    if (storedFilterId) {
      localStorage.setItem("arMapping_storedFilterId", storedFilterId);
    } else {
      localStorage.removeItem("arMapping_storedFilterId");
    }
  }, [storedFilterId]);

  // Clear localStorage when component unmounts (leaving the page)
  useEffect(() => {
    return () => {
      localStorage.removeItem("arMapping_storedFilterId");
    };
  }, []);

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        data?.heading
          ? `${data?.heading} / ${data?.jobName}`
          : data?.ACTableName,
      ),
    );
    getFiles();
  }, [location, dispatch, data?.jobType]);

  const handleUpdateColumn = async (oldColumnName, newColumnName) => {
    if (oldColumnName === newColumnName || !newColumnName.trim()) {
      const updatedEditingColumn = { ...editingColumn };
      delete updatedEditingColumn[oldColumnName];
      setEditingColumn(updatedEditingColumn);
      return;
    }

    try {
      await patchRequest(
        `/filter/update/${oldColumnName}/mappedColumns/${newColumnName}`,
      );

      const updatedColumns = mappedColumns.map((col) =>
        col === oldColumnName ? newColumnName : col,
      );
      setMappedColumns(updatedColumns);

      setRows((prevRows) =>
        prevRows.map((row) =>
          row.mappedColumn === oldColumnName
            ? { ...row, mappedColumn: newColumnName }
            : row,
        ),
      );
    } catch (error) {
      console.error("Failed to update column:", error);
    } finally {
      const updatedEditingColumn = { ...editingColumn };
      delete updatedEditingColumn[oldColumnName];
      setEditingColumn(updatedEditingColumn);
    }
  };

  const handleDeleteColumn = async (columnName) => {
    try {
      await deleteRequest(`/filter/delete/${columnName}/mappedColumns`);

      const updatedColumns = mappedColumns.filter((col) => col !== columnName);
      setMappedColumns(updatedColumns);

      setRows((prevRows) =>
        prevRows.map((row) =>
          row.mappedColumn === columnName ? { ...row, mappedColumn: "" } : row,
        ),
      );
    } catch (error) {
      console.error("Failed to delete column:", error);
    }
  };

  const handleOpenEditColumnDialog = (columnName) => {
    setEditColumnDialog({
      open: true,
      originalColumnName: columnName,
      columnName: columnName,
      error: false,
    });
  };

  const handleCloseEditColumnDialog = () => {
    setEditColumnDialog({
      open: false,
      originalColumnName: "",
      columnName: "",
      error: false,
    });
  };

  const handleUpdateColumnFromDialog = async () => {
    const { originalColumnName, columnName } = editColumnDialog;

    if (!columnName.trim()) {
      setEditColumnDialog({
        ...editColumnDialog,
        error: true,
      });
      return;
    }

    if (originalColumnName === columnName.trim()) {
      handleCloseEditColumnDialog();
      return;
    }

    try {
      await handleUpdateColumn(originalColumnName, columnName.trim());
      const updatedColumns = mappedColumns.map((col) =>
        col === originalColumnName ? columnName.trim() : col,
      );
      setMappedColumns(updatedColumns);

      setRows((prevRows) =>
        prevRows.map((row) =>
          row.mappedColumn === originalColumnName
            ? { ...row, mappedColumn: columnName.trim() }
            : row,
        ),
      );
      handleCloseEditColumnDialog();
    } catch (error) {
      console.error("Failed to update column:", error);
    }
  };

  const column = rows.length
    ? Object.keys(...rows)
        .map((key) => {
          // Skip rendering the checkBoxDisable column in the table
          if (key === "checkBoxDisable") {
            return null; // This column won't be rendered in the table
          }
          if (key === "ignoreInDC")
            return {
              accessorKey: key,
              header: "Ignore",
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  <Select
                    value={row.original.ignoreInDC}
                    disabled={[
                      "numberID",
                      "Rule_Filter_reason",
                      "updatedTime",
                      "createdTime",
                      "import_status_update",
                    ].includes(row.original.acColumnName)}
                    onChange={(e) =>
                      handleChange(row.index, "ignoreInDC", e.target.value)
                    }
                    sx={{
                      height: "2.5rem",
                      fontSize: "12px",
                      width: "100%",
                    }}
                  >
                    <MenuItem value="No">No</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                  </Select>
                );
              },
            };
          if (key === "dcDatatype")
            return {
              accessorKey: key,
              header: "DataType",
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  row.original.ignoreInDC === "No" && (
                    <div style={{ display: "flex", width: "100%" }}>
                      <Select
                        value={row.original.dcDatatype}
                        disabled={[
                          "numberID",
                          "Rule_Filter_reason",
                          "updatedTime",
                          "createdTime",
                          "import_status_update",
                        ].includes(row.original.acColumnName)}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          handleChange(row.index, "dcDatatype", newValue);
                        }}
                        sx={{
                          height: "2.5rem",
                          fontSize: "12px",
                          width: "100%",
                          marginTop: "5px",
                        }}
                      >
                        {dcDataTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                      {row.original.dcDatatype === "DATETIME" && (
                        <Select
                          disabled={[
                            "numberID",
                            "Rule_Filter_reason",
                            "updatedTime",
                            "createdTime",
                            "import_status_update",
                          ].includes(row.original.acColumnName)}
                          value={
                            dateFormats.find(
                              (v) => v.id == row.original.formattedDateCode,
                            )?.type || ""
                          }
                          onChange={(e) =>
                            handleChange(
                              row.index,
                              "formattedDateCode",
                              e.target.value,
                            )
                          }
                          sx={{
                            height: "2.5rem",
                            fontSize: "12px",
                            width: "100%",
                            marginTop: "5px",
                            marginLeft: "10px",
                          }}
                          displayEmpty
                          renderValue={(selected) => {
                            return selected ? selected : "Select date format";
                          }}
                        >
                          {dateFormats.map((format) => (
                            <MenuItem key={format.id} value={format.id}>
                              {format.type}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </div>
                  )
                );
              },
            };
          if (key === "mappedColumn")
            return {
              accessorKey: key,
              header: "Mapped Column Name",
              field: "",
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  row.original.ignoreInDC === "No" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {showInput[row.index] ? (
                        <>
                          <TextField
                            disabled={[
                              "numberID",
                              "Rule_Filter_reason",
                              "updatedTime",
                              "createdTime",
                              "import_status_update",
                            ].includes(row.original.acColumnName)}
                            variant="standard"
                            sx={{
                              height: "2.5rem",
                              fontSize: "12px",
                              width: "80%",
                            }}
                            value={row.original.mappedColumn}
                            onChange={(e) =>
                              handleChange(
                                row.index,
                                "mappedColumn",
                                e.target.value,
                              )
                            }
                            placeholder="Enter column name"
                          />
                          <CiEdit
                            disabled={[
                              "numberID",
                              "Rule_Filter_reason",
                              "updatedTime",
                              "createdTime",
                              "import_status_update",
                            ].includes(row.original.acColumnName)}
                            onClick={() => {
                              setShowInput({
                                ...showInput,
                                [row.index]: false,
                              });
                            }}
                            style={{
                              cursor: "pointer",
                              marginLeft: "5px",
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <Autocomplete
                            disabled={[
                              "numberID",
                              "Rule_Filter_reason",
                              "updatedTime",
                              "createdTime",
                              "import_status_update",
                            ].includes(row.original.acColumnName)}
                            value={row.original.mappedColumn}
                            onChange={(event, newValue) => {
                              if (newValue === "CREATE_NEW") {
                                handleOpenNewColumnDialog(row.index);
                              } else {
                                handleChange(
                                  row.index,
                                  "mappedColumn",
                                  newValue,
                                );
                              }
                            }}
                            options={[
                              "CREATE_NEW",
                              ...(mappedColumns?.sort((a, b) =>
                                a.localeCompare(b),
                              ) || []),
                            ]}
                            getOptionLabel={(option) => {
                              if (option === "CREATE_NEW") return "Create New";
                              return option;
                            }}
                            style={{ width: 300 }}
                            renderOption={(props, option) => {
                              if (option === "CREATE_NEW") {
                                return (
                                  <li
                                    {...props}
                                    style={{
                                      fontWeight: "bold",
                                      borderBottom: "1px solid #e0e0e0",
                                    }}
                                  >
                                    Create New
                                  </li>
                                );
                              }

                              return (
                                <li
                                  {...props}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 16px",
                                  }}
                                >
                                  <span>{option}</span>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "4px",
                                      marginLeft: "8px",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                  >
                                    <CiEdit
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleOpenEditColumnDialog(option);
                                      }}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: "16px",
                                      }}
                                    />
                                    <MdDelete
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleDeleteColumn(option);
                                      }}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        color: "#d32f2f",
                                      }}
                                    />
                                  </div>
                                </li>
                              );
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Search and select column..."
                                variant="outlined"
                                sx={{
                                  height: "2.5rem",
                                  fontSize: "12px",
                                  width: "100%",
                                  "& .MuiOutlinedInput-root": {
                                    height: "2.5rem",
                                    fontSize: "12px",
                                  },
                                }}
                              />
                            )}
                            sx={{
                              width: "80%",
                              marginTop: "5px",
                            }}
                            ListboxProps={{
                              style: {
                                maxHeight: 300,
                              },
                            }}
                            filterOptions={(options, { inputValue }) => {
                              const filtered = options.filter((option) => {
                                if (option === "CREATE_NEW") return true;
                                return option
                                  .toLowerCase()
                                  .includes(inputValue.toLowerCase());
                              });
                              return filtered;
                            }}
                          />
                          <button
                            disabled={[
                              "numberID",
                              "Rule_Filter_reason",
                              "updatedTime",
                              "createdTime",
                              "import_status_update",
                            ].includes(row.original.acColumnName)}
                            onClick={() =>
                              setShowInput({
                                ...showInput,
                                [row.index]: true,
                              })
                            }
                          >
                            <CiEdit
                              color={
                                [
                                  "numberID",
                                  "Rule_Filter_reason",
                                  "updatedTime",
                                  "createdTime",
                                  "import_status_update",
                                ].includes(row.original.acColumnName) &&
                                "rgb(163 156 156)"
                              }
                              style={{
                                marginLeft: "5px",
                              }}
                            />
                          </button>
                        </>
                      )}
                    </div>
                  )
                );
              },
            };
          if (key === "isPrimaryKey")
            return {
              accessorKey: key,
              header: "Primary Key",
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  <Checkbox
                    disabled={
                      row.original?.ignoreInDC?.toLowerCase() === "yes" ||
                      [
                        "numberID",
                        "Rule_Filter_reason",
                        "updatedTime",
                        "createdTime",
                        "import_status_update",
                      ].includes(row.original.acColumnName)
                    }
                    checked={row.original?.isPrimaryKey}
                    onChange={() => {
                      handlePrimaryKeyChange(row.index);
                    }}
                    sx={{ padding: "0px", height: "2.5rem" }}
                  />
                );
              },
            };
          if (key === "isSecondaryKey")
            return {
              accessorKey: key,
              header: "Secondary Key",
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  <Checkbox
                    disabled={
                      row.original?.ignoreInDC?.toLowerCase() === "yes" ||
                      [
                        "numberID",
                        "Rule_Filter_reason",
                        "updatedTime",
                        "createdTime",
                        "import_status_update",
                      ].includes(row.original.acColumnName)
                    }
                    checked={row.original?.isSecondaryKey}
                    onChange={() => handleSecondaryKeyChange(row.index)}
                    sx={{ padding: "0px", height: "2.5rem" }}
                  />
                );
              },
            };
          if (key === "isMatchingKey")
            return {
              accessorKey: key,
              header: "Matching Key",
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  <Checkbox
                    disabled={
                      data?.triggerButton === "replace" ||
                      row.original?.ignoreInDC?.toLowerCase() === "yes" ||
                      [
                        "numberID",
                        "Rule_Filter_reason",
                        "updatedTime",
                        "createdTime",
                        "import_status_update",
                      ].includes(row.original.acColumnName)
                    }
                    checked={row.original?.isMatchingKey}
                    onChange={() => handleMatchingKeyChange(row.index)}
                    sx={{ padding: "0px", height: "2.5rem" }}
                  />
                );
              },
            };
          if (key === "isIgnoreKey")
            return {
              accessorKey: key,
              header: "Ignore Key",
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  <Checkbox
                    disabled={
                      data?.triggerButton === "replace" ||
                      row.original?.ignoreInDC?.toLowerCase() === "yes" ||
                      [
                        "numberID",
                        "Rule_Filter_reason",
                        "updatedTime",
                        "createdTime",
                        "import_status_update",
                      ].includes(row.original.acColumnName)
                    }
                    checked={row.original?.isIgnoreKey}
                    onChange={() => handleIgnoreKeyChange(row.index)}
                    sx={{ padding: "0px", height: "2.5rem" }}
                  />
                );
              },
            };
          if (key === "formattedDateCode")
            return {
              accessorKey: key,
              header: key,
              enableGrouping: true,
              cell: ({ row }) => {
                return (
                  <span style={{ fontSize: "smaller" }}>
                    {dateFormats.find(
                      (v) => v.id == row.original.formattedDateCode,
                    )?.type || ""}
                  </span>
                );
              },
            };
          return {
            accessorKey: key,
            header: key === "acColumnName" ? "Column Name" : key,
            enableGrouping: true,
          };
        })
        .filter(Boolean) // Filter out any null columns (like checkBoxDisable)
    : [];

  const handleApplyToSelected = () => {
    if (!selectedRows?.length) {
      toast.error("No rows selected");
      return;
    }

    // extract names from various shapes DataTable may provide
    const selectedNamesAll = selectedRows.map((s) => s.acColumnName);

    setRows((prev) =>
      prev.map((r) => {
        if (!selectedNamesAll.includes(r.acColumnName)) return r;
        const updated = { ...r };
        if (bulkIgnoreValue) {
          updated.ignoreInDC = bulkIgnoreValue;
          if (bulkIgnoreValue === "Yes") {
            updated.dcDatatype = "";
            delete updated.formattedDateCode;
          }
        }

        if (bulkDcDatatype && updated.ignoreInDC !== "Yes") {
          updated.dcDatatype = bulkDcDatatype;
          // if DATETIME, also apply formatted date code if provided
          if (bulkDcDatatype === "DATETIME") {
            if (bulkDateFormat) {
              updated.formattedDateCode = bulkDateFormat;
            }
          } else {
            delete updated.formattedDateCode;
          }
        }

        return updated;
      }),
    );
    setBulkIgnoreValue("");
    setBulkDcDatatype("");
    setBulkDateFormat("");
    setSelectedRows([]);
  };

  return (
    <PageLayout>
      {selectedRows?.length > 0 && (
        <div className="flex gap-3 items-center p-3 absolute top-32 left-6 bg-white rounded shadow">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Selected:</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-sm">
              {selectedRows.length}
            </span>
          </div>
          <FormControl>
            <InputLabel size="small">Set Ignore In DC</InputLabel>
            <Select
              value={bulkIgnoreValue}
              label="Set Ignore In DC"
              onChange={(e) => setBulkIgnoreValue(e.target.value)}
              size="small"
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="No">No</MenuItem>
              <MenuItem value="Yes">Yes</MenuItem>
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel size="small">Set Data Type</InputLabel>
            <Select
              value={bulkDcDatatype}
              label="Set Data Type"
              onChange={(e) => {
                setBulkDcDatatype(e.target.value);
                if (e.target.value !== "DATETIME") setBulkDateFormat("");
              }}
              size="small"
              sx={{ minWidth: 160 }}
            >
              {dcDataTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {bulkDcDatatype === "DATETIME" && (
            <FormControl>
              <InputLabel size="small">Set Date Format</InputLabel>
              <Select
                value={bulkDateFormat}
                onChange={(e) => setBulkDateFormat(e.target.value)}
                size="small"
                label="Set Date Format"
                sx={{ minWidth: 220 }}
              >
                {dateFormats.map((fmt) => (
                  <MenuItem key={fmt.id} value={fmt.id}>
                    {fmt.type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button variant="contained" onClick={handleApplyToSelected}>
            Apply to Selected
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 py-7">
        <div className="flex gap-3 sm:gap-6 justify-between absolute right-7">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {rows.length}
            </span>
          </div>
          {filteredTableData !== rows.length && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                Filtered:
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                {filteredTableData}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mb-20">
        <div className="p-3 absolute top-20">
          <BackButton />
        </div>
        <div className="flex gap-3 justify-end absolute right-8 top-32">
          <SubmitBtn
            text="Save"
            className="!w-auto p-2"
            isLoading={isSaveLoading}
            disabled={
              isSaveLoading ||
              (permissionList?.includes(routeName) &&
                !permissionDetails[routeName]?.hasWriteOnly)
            }
            onClick={() => handleSaveTable()}
            type="submit"
          />
          <SubmitBtn
            text="Execute"
            className="!w-auto p-2"
            isLoading={isExecuteLoading}
            disabled={
              isExecuteLoading ||
              (permissionList?.includes(routeName) &&
                !permissionDetails[routeName]?.hasWriteOnly)
            }
            onClick={() => handleSaveTable(true)}
            type="submit"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : rows.length ? (
        <div>
          <DataTable
            data={rows}
            columns={column}
            enableRowOrdering={false}
            enableRowSelection={true}
            setSelectedRows={setSelectedRows}
            deleteId="checkBoxDisable"
            selectedRows={selectedRows}
            enableFiltering={false}
            enableAction={false}
            enableGrouping={true}
            enableCreateDashboard={false}
            enableCreateView={false}
            onDataChange={() => {}}
            routeName={routeName}
            setFilteredData={setFilteredTableData}
            jobName={data?.jobName}
            tableName={data?.ACTableName}
            ARMappingTable
          />
        </div>
      ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )}
      <Dialog
        open={editColumnDialog.open}
        onClose={handleCloseEditColumnDialog}
      >
        <DialogTitle>Edit Column Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Column Name"
            type="text"
            fullWidth
            variant="standard"
            value={editColumnDialog.columnName}
            onChange={(e) =>
              setEditColumnDialog({
                ...editColumnDialog,
                columnName: e.target.value,
              })
            }
            error={editColumnDialog.error}
            helperText={
              editColumnDialog.error ? "Column name cannot be empty" : ""
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseEditColumnDialog}
            variant="outlined"
            color="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateColumnFromDialog}
            variant="contained"
            color="primary"
            disabled={!editColumnDialog.columnName.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openNewColumnDialog} onClose={handleCloseNewColumnDialog}>
        <DialogTitle>Create New Column</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Column Name"
            type="text"
            fullWidth
            variant="standard"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewColumnDialog}>Cancel</Button>
          <Button onClick={handleCreateNewColumn}>Create</Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default ARTable;
