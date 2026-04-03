import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { CiEdit } from "react-icons/ci";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import {
  getRequest,
  postDataRequest,
} from "../../../../Service/Console.service";
import PageLayout from "../../../Common/PageLayout";
import SelectField from "../.././../Common/Fileds/SelectField";
import InputField from "../.././../Common/Fileds/InputField";
import BackButton from "../../../Common/BackButton";
import SubmitBtn from "../../../Common/SubmitBtn";
import DataTable from "../../../Common/DataTable";
import { deleteRequest, patchRequest } from "../../../../Service/admin.save";
import { CustomDropdown } from "../../../Common/Fileds/CustomDropdown";

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

const ARTable = ({ routeName, job }) => {
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

  const { data } = job ? { data: job } : location.state || "";

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

  const handleChange = useCallback((index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => {
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
      }),
    );
  }, []);

  const handlePrimaryKeyChange = useCallback((index) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i === index) {
          return { ...row, isPrimaryKey: !row.isPrimaryKey };
        } else {
          return { ...row, isPrimaryKey: false };
        }
      }),
    );
  }, []);

  const handleSecondaryKeyChange = useCallback((index) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i === index) {
          return { ...row, isSecondaryKey: !row.isSecondaryKey };
        } else {
          return { ...row, isSecondaryKey: false };
        }
      }),
    );
  }, []);

  const handleMatchingKeyChange = useCallback((index) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i === index) {
          const newMatchingKeyValue = !row.isMatchingKey;
          return {
            ...row,
            isMatchingKey: newMatchingKeyValue,
            isIgnoreKey: newMatchingKeyValue ? false : row.isIgnoreKey,
          };
        }
        return row;
      }),
    );
  }, []);

  const handleIgnoreKeyChange = useCallback((index) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i === index) {
          const newIgnoreKeyValue = !row.isIgnoreKey;
          return {
            ...row,
            isIgnoreKey: newIgnoreKeyValue,
            isMatchingKey: newIgnoreKeyValue ? false : row.isMatchingKey,
          };
        }
        return row;
      }),
    );
  }, []);

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

  const handleOpenNewColumnDialog = useCallback(() => {
    setOpenNewColumnDialog(true);
  }, []);

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
  }, [data?.id, data?.filterId, data?.ACTableName, data?.jobName]);

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

  const handleDeleteColumn = useCallback(async (columnName) => {
    try {
      await deleteRequest(`/filter/delete/${columnName}/mappedColumns`);

      setMappedColumns((prev) => prev.filter((col) => col !== columnName));

      setRows((prevRows) =>
        prevRows.map((row) =>
          row.mappedColumn === columnName ? { ...row, mappedColumn: "" } : row,
        ),
      );
    } catch (error) {
      console.error("Failed to delete column:", error);
    }
  }, []);

  const handleOpenEditColumnDialog = useCallback((columnName) => {
    setEditColumnDialog({
      open: true,
      originalColumnName: columnName,
      columnName: columnName,
      error: false,
    });
  }, []);

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

  const column = useMemo(
    () =>
      rows.length
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
                      <SelectField
                        value={row.original.ignoreInDC}
                        onChange={(e) =>
                          handleChange(row.index, "ignoreInDC", e.target.value)
                        }
                        disabled={[
                          "numberID",
                          "Rule_Filter_reason",
                          "updatedTime",
                          "createdTime",
                          "import_status_update",
                        ].includes(row.original.acColumnName)}
                        className="h-10 text-xs w-full"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </SelectField>
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
                        <div className="flex w-full">
                          <SelectField
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
                            className="h-10 text-xs w-full mt-1"
                          >
                            {dcDataTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </SelectField>
                          {row.original.dcDatatype === "DATETIME" && (
                            <SelectField
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
                              className="h-10 text-xs w-full mt-1 ml-2"
                            >
                              <option value="">Select date format</option>
                              {dateFormats.map((format) => (
                                <option key={format.id} value={format.id}>
                                  {format.type}
                                </option>
                              ))}
                            </SelectField>
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
                        <div className="flex items-center">
                          {showInput[row.index] ? (
                            <>
                              <InputField
                                disabled={[
                                  "numberID",
                                  "Rule_Filter_reason",
                                  "updatedTime",
                                  "createdTime",
                                  "import_status_update",
                                ].includes(row.original.acColumnName)}
                                className="h-10 text-xs w-4/5"
                                value={row.original.mappedColumn}
                                onChange={(e) =>
                                  handleChange(
                                    row.index,
                                    "mappedColumn",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter column name"
                                autoFocus
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
                                  setShowInput((prev) => ({
                                    ...prev,
                                    [row.index]: false,
                                  }));
                                }}
                                className="cursor-pointer ml-1"
                              />
                            </>
                          ) : (
                            <>
                              <CustomDropdown
                                disabled={[
                                  "numberID",
                                  "Rule_Filter_reason",
                                  "updatedTime",
                                  "createdTime",
                                  "import_status_update",
                                ].includes(row.original.acColumnName)}
                                value={row.original.mappedColumn}
                                onChange={(newValue) => {
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
                                options={
                                  mappedColumns?.sort((a, b) =>
                                    a.localeCompare(b),
                                  ) || []
                                }
                                onEdit={handleOpenEditColumnDialog}
                                onDelete={handleDeleteColumn}
                                placeholder="Search and select column..."
                                className="w-72"
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
                                  setShowInput((prev) => ({
                                    ...prev,
                                    [row.index]: true,
                                  }))
                                }
                                className="ml-2 text-xs px-2 py-1 border border-border-theme rounded hover:bg-accent-dim disabled:opacity-50 text-text-primary"
                                title="Manual input"
                              >
                                Manual
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
                      <input
                        type="checkbox"
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
                        className="w-4 h-4 rounded"
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
                      <input
                        type="checkbox"
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
                        className="w-4 h-4 rounded"
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
                      <input
                        type="checkbox"
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
                        className="w-4 h-4 rounded"
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
                      <input
                        type="checkbox"
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
                        className="w-4 h-4 rounded"
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
                      <span className="text-sm">
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
        : [],
    [
      rows.length,
      showInput,
      mappedColumns,
      data?.triggerButton,
      handleChange,
      handlePrimaryKeyChange,
      handleSecondaryKeyChange,
      handleMatchingKeyChange,
      handleIgnoreKeyChange,
      handleOpenNewColumnDialog,
      handleOpenEditColumnDialog,
      handleDeleteColumn,
    ],
  );

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
    <PageLayout className="px-2">
      {/* ── Top toolbar: back · stats · save/execute ───────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 mb-2">
        {!job && <BackButton />}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-sub">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-accent-dim text-accent">
              {rows.length}
            </span>
          </div>
          {filteredTableData !== rows.length && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-sub">
                Filtered:
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-success-bg text-success">
                {filteredTableData}
              </span>
            </div>
          )}
          <SubmitBtn
            text="Save"
            className="!w-auto px-4 py-2"
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
            className="!w-auto px-4 py-2"
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

      {/* ── Bulk action bar ─────────────────────────────────────────── */}
      {selectedRows?.length > 0 && (
        <div className="flex flex-wrap gap-3 items-end p-3 mb-3 bg-surface border border-border-theme rounded-lg shadow-theme animate-slideIn">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              Selected:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-dim text-accent text-sm font-semibold">
              {selectedRows.length}
            </span>
          </div>

          <SelectField
            label="Set Ignore In DC"
            value={bulkIgnoreValue}
            onChange={(e) => setBulkIgnoreValue(e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">-- Select --</option>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </SelectField>

          <SelectField
            label="Set Data Type"
            value={bulkDcDatatype}
            onChange={(e) => {
              setBulkDcDatatype(e.target.value);
              if (e.target.value !== "DATETIME") setBulkDateFormat("");
            }}
            className="min-w-[150px]"
          >
            <option value="">-- Select --</option>
            {dcDataTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectField>

          {bulkDcDatatype === "DATETIME" && (
            <SelectField
              label="Set Date Format"
              value={bulkDateFormat}
              onChange={(e) => setBulkDateFormat(e.target.value)}
              className="min-w-[210px]"
            >
              <option value="">-- Select --</option>
              {dateFormats.map((fmt) => (
                <option key={fmt.id} value={fmt.id}>
                  {fmt.type}
                </option>
              ))}
            </SelectField>
          )}

          <button
            onClick={handleApplyToSelected}
            className="px-4 py-1.5 rounded bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-accent"
          >
            Apply to Selected
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length ? (
        <div className="mb-6">
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
            isDrawer
          />
        </div>
      ) : (
        <div className="flex justify-center items-center h-64 text-text-faint text-sm">
          No Data Found
        </div>
      )}

      {/* ── Edit Column Dialog ──────────────────────────────────────── */}
      {editColumnDialog.open && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-modal-overlay">
          <div className="bg-surface rounded-xl shadow-theme w-full max-w-sm mx-4 p-6 animate-slideIn">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Edit Column Name
            </h2>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-sub">
                Column Name
              </label>
              <input
                autoFocus
                type="text"
                value={editColumnDialog.columnName}
                onChange={(e) =>
                  setEditColumnDialog({
                    ...editColumnDialog,
                    columnName: e.target.value,
                    error: false, // Reset error when user starts typing
                  })
                }
                className={`w-full border rounded px-3 py-2 text-sm bg-input-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent ${
                  editColumnDialog.error
                    ? "border-error"
                    : "border-border-theme"
                }`}
              />
              {editColumnDialog.error && (
                <p className="text-xs text-error mt-0.5">
                  Column name cannot be empty
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={handleCloseEditColumnDialog}
                className="px-4 py-1.5 rounded border border-border-theme text-sm text-text-primary hover:bg-accent-dim transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateColumnFromDialog}
                disabled={!editColumnDialog.columnName.trim()}
                className="px-4 py-1.5 rounded bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create New Column Dialog ────────────────────────────────── */}
      {openNewColumnDialog && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-modal-overlay">
          <div className="bg-surface rounded-xl shadow-theme w-full max-w-sm mx-4 p-6 animate-slideIn">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Create New Column
            </h2>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-sub">
                Column Name
              </label>
              <input
                autoFocus
                id="name"
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="w-full border border-border-theme rounded px-3 py-2 text-sm bg-input-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={handleCloseNewColumnDialog}
                className="px-4 py-1.5 rounded border border-border-theme text-sm text-text-primary hover:bg-accent-dim transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewColumn}
                className="px-4 py-1.5 rounded bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default ARTable;
