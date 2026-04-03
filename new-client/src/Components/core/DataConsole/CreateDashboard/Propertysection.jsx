import React, { useCallback, useEffect, useState, useMemo } from "react";
import { GrFormPreviousLink } from "react-icons/gr";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Box,
  InputAdornment,
  ListSubheader,
} from "@mui/material";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { MdKeyboardArrowDown } from "react-icons/md";
import {
  resetDashboard,
  setDashboardData,
} from "../../../../redux/Slices/DashboardSlice";
import {
  getCommonRegisterRequest,
  getRequest,
} from "../../../../Service/Console.service";
import ChartComponent from "../../../ChartComponent";
import {
  postApplicationJsonRequest,
  getRequest as dataGetRequest,
  postDataRequest,
} from "../../../../Service/api.service";
import { postDataRequest as AdminPostDataRequest } from "../../../../Service/admin.save.js";
import SelectChart from "./SelectChart.jsx";
import DataTable from "../../../Common/DataTable.jsx";
import ChartTable from "./ChartTable.jsx";
import SelectField from "../../../Common/Fileds/SelectField.jsx";
import { ResizableBottomDrawer } from "../../../Common/sideDrawer/ResizableBottomDrawer.jsx";

const fieldLabelClass =
  "mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-text-sub";

const simpleSelectSx = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    backgroundColor: "var(--input-bg)",
    borderRadius: "10px",
    color: "var(--text-primary)",
    minHeight: "46px",
    "& fieldset": {
      borderColor: "var(--border)",
    },
    "&:hover fieldset": {
      borderColor: "var(--border)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--border)",
      borderWidth: 1,
    },
    "& .MuiSvgIcon-root": {
      color: "var(--text-sub)",
    },
  },
  "& .MuiSelect-select": {
    paddingTop: "10px",
    paddingBottom: "10px",
    minHeight: "22px !important",
    color: "var(--text-primary)",
    fontSize: "14px",
    paddingRight: "36px",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiSelect-icon": {
    color: "var(--text-sub)",
    right: "10px",
    fontSize: "18px",
  },
};

const stickySearchSx = {
  px: 1,
  py: 1,
  position: "sticky",
  top: 0,
  bgcolor: "var(--surface)",
  zIndex: 1,
  borderBottom: "1px solid var(--border)",
};

const searchInputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "var(--input-bg)",
    borderRadius: "10px",
    color: "var(--text-primary)",
    "& fieldset": {
      borderColor: "var(--border)",
    },
    "&:hover fieldset": {
      borderColor: "var(--border)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--border)",
    },
  },
  "& .MuiInputBase-input": {
    color: "var(--text-primary)",
  },
  "& .MuiInputBase-input::placeholder": {
    color: "var(--text-sub)",
    opacity: 1,
  },
  "& .MuiSvgIcon-root": {
    color: "var(--text-sub)",
  },
};

const checkboxSx = {
  color: "var(--text-sub)",
  "&.Mui-checked": {
    color: "var(--accent)",
  },
};

const PropertySection = ({
  gotoNext,
  textColor,
  lightbackground,
  isPreview,
  setIsPreview,
  objectId,
  objectValue,
  routeName,
  onSave,
  folderData,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = folderData ? { state: folderData } : useLocation();
  const { dashboardData } = useSelector((state) => state.dashboard);
  const isVennChart =
    dashboardData?.chartType === "Venn Chart" ||
    dashboardData?.chartType == "Matrix Chart";
  const isCardChart = dashboardData?.chartType === "Card Chart";
  const [selectedTableNames, setSelectedTableNames] = useState(
    dashboardData.tableName || [],
  );
  const [selectedViewNames, setSelectedViewNames] = useState([]);
  const [viewId, setViewId] = useState(null);

  const [allTableColumnData, setAllTableColumnData] = useState({});
  const [getNameData, setGetNameData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartVennMatrixData, setChartVennMatrixData] = useState([]);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // New state for Register functionality
  const [registerColumns, setRegisterColumns] = useState([]);
  const [selectedRegisterColumns, setSelectedRegisterColumns] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(false);

  const folders = JSON.parse(localStorage.getItem("myFolders"));

  const [tableLoading, setTableLoading] = useState(false);
  const [myFolders, setMyFolders] = useState([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folder, setFolder] = useState(dashboardData?.folder);
  const [isTableName, setIsTableName] = useState(false);
  const { tableType } = dashboardData;
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [columnSearchTerms, setColumnSearchTerms] = useState({});
  const [registerColumnSearchTerm, setRegisterColumnSearchTerm] = useState("");

  // Memoized filtered and sorted data for tables
  const filteredAndSortedTables = useMemo(() => {
    if (!getNameData.length) return [];

    const filtered = getNameData.filter((table) => {
      const searchName =
        tableType === "custom-saved-job"
          ? table.viewName?.toLowerCase() || ""
          : table.jobName?.toLowerCase() || "";
      return searchName.includes(tableSearchTerm.toLowerCase());
    });

    return filtered.sort((a, b) => {
      const nameA =
        tableType === "custom-saved-job"
          ? (a.viewName || "").toLowerCase()
          : (a.jobName || "").toLowerCase();
      const nameB =
        tableType === "custom-saved-job"
          ? (b.viewName || "").toLowerCase()
          : (b.jobName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [getNameData, tableSearchTerm, tableType]);

  // Memoized filtered and sorted register columns
  const filteredAndSortedRegisterColumns = useMemo(() => {
    if (!registerColumns.length) return [];

    const filtered = registerColumns.filter((column) =>
      column.toLowerCase().includes(registerColumnSearchTerm.toLowerCase()),
    );

    return filtered.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
  }, [registerColumns, registerColumnSearchTerm]);

  // Function to get filtered and sorted columns for a specific table
  const getFilteredAndSortedColumns = useCallback(
    (tableName) => {
      const columns = allTableColumnData[tableName] || [];
      const searchTerm = columnSearchTerms[tableName] || "";

      const filtered = columns.filter((column) =>
        column.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      return filtered.sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase()),
      );
    },
    [allTableColumnData, columnSearchTerms],
  );

  // Function to handle column search term changes
  const handleColumnSearchChange = (tableName, searchTerm) => {
    setColumnSearchTerms((prev) => ({
      ...prev,
      [tableName]: searchTerm,
    }));
  };

  // Custom MenuProps for search functionality
  const getMenuProps = (maxHeight = 300) => ({
    PaperProps: {
      style: {
        maxHeight: maxHeight,
        width: "auto",
      },
      sx: {
        bgcolor: "var(--surface)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      },
    },
    MenuListProps: {
      style: {
        paddingTop: 0,
      },
      sx: {
        bgcolor: "var(--surface)",
      },
    },
  });

  // New function to fetch register columns
  const fetchRegisterColumns = async () => {
    setRegisterLoading(true);
    try {
      const response = await getCommonRegisterRequest(
        `/AssetRegister/${objectId}/getColumnNames`,
      );
      if (response?.status === 200) {
        setRegisterColumns(response?.data || []);
      }
    } catch (error) {
      console.error("Error fetching register columns:", error);
      setRegisterColumns([]);
    } finally {
      setRegisterLoading(false);
    }
  };

  const fetchAllGetName = async () => {
    setTableLoading(true);
    try {
      const response =
        tableType === "custom-saved-job" && folder
          ? await dataGetRequest(`/view/${folder}/get`)
          : await getRequest(
              `/table/${
                tableType === "original-source"
                  ? "getAC"
                  : tableType === "by-ar-resource"
                    ? "getDC"
                    : "getAC"
              }/${objectId}/tableNames`,
            );
      if (response?.status === 200) {
        setGetNameData(
          tableType === "custom-saved-job" && objectId
            ? response?.data.filter((v) => v?.object?.objectId == objectId)
            : response?.data || [],
        );
        if (state?.tableName) setIsTableName(true);
        dispatch(setDashboardData({ field: "tableName", value: [] }));
      }
    } catch (error) {
      console.error("Error fetching table names:", error);
      setGetNameData([]);
    } finally {
      setTableLoading(false);
    }
  };

  const fetchAllTableColumns = async () => {
    if (!selectedTableNames?.length) return;
    try {
      const columnData = await Promise.all(
        selectedTableNames?.map(async (tableName) => {
          const response = await getRequest(`/table/${tableName}/getColumns`);
          if (response.status === 200) {
            return { [tableName]: response.data };
          }
          return {};
        }),
      );
      const mergedData = columnData.reduce(
        (acc, obj) => ({ ...acc, ...obj }),
        {},
      );
      setAllTableColumnData(mergedData);
    } catch (error) {
      console.error("Error fetching table columns:", error);
    }
  };

  const transformPreviewDataToChartData = (previewData) => {
    if (!previewData?.columnNamesWithValuesANDCounting) return [];

    const data = previewData.columnNamesWithValuesANDCounting;
    const transformedData = [];

    if (typeof data === "object" && !Array.isArray(data)) {
      Object.entries(data).forEach(([key, count]) => {
        try {
          const cleanKey = key.replace(/[{}]/g, "");

          if (tableType === "register" && cleanKey.startsWith("count=")) {
            const countValue = cleanKey.split("=")[1];
            const actualCount = parseInt(countValue) * count;
            transformedData.push({
              [cleanKey.split("=")[0]]: `${countValue}`,
              size: actualCount,
            });
          } else {
            const pairs = cleanKey.split(",").map((pair) => pair.trim());

            const dataPoint = { count };
            pairs.forEach((pair) => {
              const [fieldName, value] = pair.split("=").map((s) => s.trim());
              if (fieldName && value !== undefined) {
                dataPoint[fieldName] = value;
              }
            });
            transformedData.push(dataPoint);
          }
        } catch (error) {
          console.error("Error parsing key:", key, error);
        }
      });
    }

    return transformedData;
  };

  const renderFolderOptions = (folders, level = 0) => {
    return folders.map(({ id, folderName, childFolders }) => (
      <React.Fragment key={id}>
        <option value={id}>{"— ".repeat(level) + folderName}</option>
        {childFolders &&
          childFolders.length > 0 &&
          renderFolderOptions(childFolders, level + 1)}
      </React.Fragment>
    ));
  };

  const handleTableSelection = (event) => {
    const value = isVennChart ? event.target.value : [event.target.value];
    if (tableType === "custom-saved-job") {
      setSelectedTableNames([value[0].tableName]);
      setSelectedViewNames([value[0].viewName]);
      setViewId(value[0].id);
      dispatch(
        setDashboardData({ field: "tableName", value: [value[0].tableName] }),
      );
    } else {
      setSelectedTableNames(value);
      dispatch(setDashboardData({ field: "tableName", value }));
    }
  };

  const handleTableTypeChange = (e) => {
    const { value } = e.target;
    dispatch(setDashboardData({ field: "tableType", value }));

    // Reset relevant states when changing table type
    if (value === "register") {
      setSelectedTableNames([]);
      setSelectedViewNames([]);
      setSelectedRegisterColumns([]);
      dispatch(setDashboardData({ field: "tableName", value: [] }));
      dispatch(setDashboardData({ field: "columnNames", value: {} }));
    }
  };

  const handleChange = (e) => {
    const { value } = e.target;
    setFolder(value);
    dispatch(setDashboardData({ field: "folder", value }));
  };

  const handleColumnSelection = (tableName, newValue, event) => {
    const selectedColumns = isCardChart ? [event.target.value] : newValue;

    dispatch(
      setDashboardData({
        field: "columnNames",
        value: {
          ...dashboardData.columnNames,
          [tableName]: selectedColumns,
        },
      }),
    );
  };

  // New function to handle register column selection
  const handleRegisterColumnSelection = (event) => {
    const value = event.target.value;
    setSelectedRegisterColumns(value);

    // Store register columns in the same format as other table types
    dispatch(
      setDashboardData({
        field: "columnNames",
        value: {
          register: value,
        },
      }),
    );
  };

  useEffect(() => {
    if (
      dashboardData?.chartType === "Card Chart" &&
      dashboardData.tableName &&
      dashboardData.tableName.length > 0
    ) {
      dispatch(
        setDashboardData({
          field: "tableName",
          value: [],
        }),
      );
      setSelectedTableNames([]);

      dispatch(
        setDashboardData({
          field: "columnNames",
          value: {},
        }),
      );
    }
  }, [dashboardData?.chartType]);

  const fetchFolders = async () => {
    setFolderLoading(true);
    try {
      const user = localStorage.getItem("user-id");
      if (tableType) {
        const sourceType =
          tableType === "custom-saved-job" ? "Report" : "DashBoard";
        const response = await dataGetRequest(
          `/folder/${user}/user/${sourceType}`,
        );
        setMyFolders(
          response?.data || JSON.parse(localStorage.getItem("myFolders")),
        );
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      setMyFolders(JSON.parse(localStorage.getItem("myFolders")));
    } finally {
      setFolderLoading(false);
    }
  };

  const findFolderNameById = (folders, targetId) => {
    for (const folder of folders) {
      if (folder.id == targetId) {
        return folder.folderName;
      }
      if (folder.childFolders.length > 0) {
        const foundName = findFolderNameById(folder.childFolders, targetId);
        if (foundName) return foundName;
      }
    }
    return null;
  };

  const handleAddFormData = async () => {
    const FolderName = findFolderNameById(folders, dashboardData.folderId);
    try {
      setLoading(true);
      const data = {
        ...dashboardData,
        objectId: dashboardData?.objectId || objectId,
        viewId: state?.viewId || viewId,
      };
      if (dashboardData.tableType === "original-source")
        data.sourceType = "Original Source";
      else if (dashboardData.tableType === "by-ar-resource")
        data.sourceType = "AR Source";
      else if (dashboardData.tableType === "register")
        data.sourceType = "Register";
      else data.sourceType = "Custom Views";

      const response = await postApplicationJsonRequest(
        "/dashboard/upload",
        data,
      );
      if (response?.status === 200) {
        dispatch(resetDashboard());
        if (onSave) {
          onSave();
        } else {
          navigate(`/data-console/dash-folder/${dashboardData?.folderId}`, {
            state: {
              folderName: FolderName,
            },
          });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error uploading data:", error);
      toast.error(error.response?.data.message);
      setLoading(false);
    }
  };

  const fetchPreviewData = async () => {
    try {
      setLoading(true);
      const payload = Object.entries(dashboardData.columnNames).map(
        ([key, val]) => ({
          tableName: key,
          columnNames: val,
        }),
      );
      if (dashboardData?.chartType === "Venn Chart") {
        AdminPostDataRequest("/table/get/VennChart/data", {
          tableData: payload,
        })
          .then(({ data }) => {
            setChartVennMatrixData(
              data.map((v) => ({ label: v.label, size: v.size })),
            );
          })
          .catch((error) => {
            console.error("Error fetching Venn chart data:", error);
          });
      } else if (dashboardData?.chartType == "Matrix Chart") {
        AdminPostDataRequest("/table/get/MatrixChart/data", {
          tableData: payload,
        }).then(({ data }) =>
          setChartVennMatrixData(
            data.map((v) => ({ label: `${v.x} , ${v.y}`, size: v.v })),
          ),
        );
      }
      if (tableType === "register") {
        if (selectedRegisterColumns.length === 0) {
          console.warn("No register columns selected");
          setPreviewData(null);
          return;
        }

        const columnNamesSeperatedCommas = selectedRegisterColumns.join(",");
        const response = await getCommonRegisterRequest(
          `/AssetRegister/${objectId}/getAggregateData/${columnNamesSeperatedCommas}/columnName`,
        );

        if (response.status === 200) {
          setPreviewData({
            columnNamesWithValuesANDCounting: response.data,
          });
        } else {
          console.error("Unexpected API response:", response);
          setPreviewData(null);
        }
        return;
      }
      // Handle other table types (existing logic)
      if (
        Array.isArray(dashboardData?.tableName) &&
        dashboardData?.tableName.length > 1
      ) {
        const tableData = dashboardData.tableName
          .map((selectedTableName) => {
            const selectedColumns =
              dashboardData?.columnNames?.[selectedTableName] || [];

            if (!selectedTableName || selectedColumns.length === 0) {
              console.log(
                "No table name or columns selected for:",
                selectedTableName,
              );
              return null;
            }

            return {
              tableName: selectedTableName,
              columnNames: selectedColumns,
            };
          })
          .filter(Boolean);

        if (tableData.length === 0) {
          console.warn("No valid table data found");
          setPreviewData(null);
          return;
        }

        const requestBody = {
          tableData,
          ...(tableType === "custom-saved-job" &&
            viewId && {
              tableViewData: [
                {
                  viewId: viewId,
                  columnNames: tableData.map((t) => t.columnNames).flat(),
                },
              ],
            }),
        };
        const response = await postDataRequest(
          state?.viewId || viewId
            ? "/dashboard/getAggregateDataView"
            : "/dashboard/getAggregateData",
          requestBody,
        );

        if (response.status === 200) {
          const transformedData = {};
          const responseData = response?.data || [];

          responseData.forEach((item, index) => {
            const tableName = tableData[index]?.tableName || `Table_${index}`;
            transformedData[tableName] = isVennChart ? item?.data : item;
          });

          setPreviewData({
            columnNamesWithValuesANDCounting: transformedData,
          });
        } else {
          console.error("Unexpected API response:", response);
          setPreviewData(null);
        }
      } else {
        const selectedTableName = Array.isArray(dashboardData?.tableName)
          ? dashboardData.tableName[0]
          : dashboardData?.tableName;

        const selectedColumns =
          dashboardData?.columnNames?.[selectedTableName] || [];

        if (!selectedTableName || selectedColumns.length === 0) {
          console.warn("No table name or columns selected");
          setPreviewData(null);
          return;
        }

        const tableData = [
          {
            tableName: selectedTableName,
            columnNames: selectedColumns,
          },
        ];

        const requestBody = {
          tableData,
          ...(state?.viewId && {
            tableViewData: [
              { viewId: state.viewId, columnNames: selectedColumns },
            ],
          }),
          ...(tableType === "custom-saved-job" &&
            viewId && {
              tableViewData: [{ viewId: viewId, columnNames: selectedColumns }],
            }),
        };
        const response = await postDataRequest(
          state?.viewId || viewId
            ? "/dashboard/getAggregateDataView"
            : "/dashboard/getAggregateData",
          requestBody,
        );

        if (response.status === 200) {
          const transformedData = {};
          const responseData = response?.data || [];

          responseData.forEach((item, index) => {
            const tableName = tableData[index]?.tableName || `Table_${index}`;
            transformedData[tableName] = item?.data ? item?.data : item;
          });

          setPreviewData({
            columnNamesWithValuesANDCounting: transformedData,
          });
        } else {
          console.error("Unexpected API response:", response);
          setPreviewData(null);
        }
      }
    } catch (error) {
      console.error("Error fetching preview data:", error);
      toast.error("Failed to fetch preview data");
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [dashboardData, state]);

  useEffect(() => {
    if (tableType === "register") {
      fetchRegisterColumns();
    } else if (tableType) {
      fetchAllGetName();
    }
  }, [folder, tableType]);

  useEffect(() => {
    if (state?.tableType) {
      handleTableTypeChange({ target: { value: state?.tableType } });
    }

    if (state?.tableName) {
      if (state?.tableType === "custom-saved-job") {
        setSelectedTableNames([state?.tableName]);
        setSelectedViewNames([state?.viewName]);
        dispatch(
          setDashboardData({ field: "tableName", value: [state?.tableName] }),
        );
      } else {
        setSelectedTableNames([state?.tableName]);
        dispatch(
          setDashboardData({ field: "tableName", value: [state?.tableName] }),
        );
      }
    }
    if (state?.folderId) {
      dataGetRequest(`/view/${state?.folderId}/get`).then((response) => {
        setGetNameData(response?.data || []);
        dispatch(setDashboardData({ field: "tableName", value: [] }));
        if (response?.status === 200) {
          setGetNameData(response?.data || []);
        }
        setFolder(state?.folderId);
      });
    }
    return () => {
      dispatch(setDashboardData({ field: "tableType", value: "" }));
      dispatch(setDashboardData({ field: "tableName", value: [] }));
    };
  }, [state, isTableName]);

  useEffect(() => {
    if (tableType !== "register") {
      fetchAllTableColumns();
    }
  }, [selectedTableNames, dispatch, tableType]);

  useEffect(() => {
    if (previewData) {
      const transformedChartData = transformPreviewDataToChartData(previewData);
      setChartData(transformedChartData);
    }
  }, [previewData]);

  const processData = (data) => {
    const result = [];

    const extractValues = (obj, prefix = "") => {
      const extracted = {};

      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === "object" && !Array.isArray(value)) {
          const nested = extractValues(value, fullKey);
          Object.assign(extracted, nested);
        } else {
          const cleanKey =
            fullKey
              .split(".")
              .pop()
              .replace(/[{}]/g, "")
              .replace(/.*=/, "")
              .replace(/([A-Z])/g, " $1")
              .trim() || "Value";

          extracted[cleanKey] = value;
        }
      });

      return extracted;
    };

    data.forEach((item) => {
      // If item has a 'count' object mapping complex keys to counts
      if (item.count && typeof item.count === "object") {
        Object.entries(item.count).forEach(([key, value]) => {
          try {
            // strip surrounding braces
            const inner = String(key).replace(/^\{|\}$/g, "");
            // Parse multiple key-value pairs separated by commas
            const pairs = inner.split(",").map((pair) => pair.trim());
            const parsedObject = { count: value }; // Start with count

            pairs.forEach((pair) => {
              const equalIndex = pair.indexOf("=");
              if (equalIndex !== -1) {
                const fieldName = pair.substring(0, equalIndex).trim();
                const fieldValue = pair.substring(equalIndex + 1).trim();
                parsedObject[fieldName] = fieldValue;
              }
            });

            result.push(parsedObject);
          } catch (err) {
            // fallback: push raw
            result.push({
              Value: String(key).replace(/[{}]/g, ""),
              Count: value,
            });
          }
        });
      } else {
        result.push(extractValues(item));
      }
    });

    return result;
  };

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedSlice(null);
  }, []);

  const handleRowClick = useCallback(
    (item) => {
      setShowModal(true);
      if ("Venn Chart" === dashboardData?.chartType) {
        const result = item.label.split("∩").map((tableName) => ({
          tableName: tableName?.trim(),
          columnNames: dashboardData?.columnNames[tableName?.trim()] || [],
        }));
        setSelectedSlice(result);
      } else if ("Matrix Chart" === dashboardData?.chartType) {
        const tableNames = [
          ...new Set(
            item.label.split(",").map((tableName) => tableName?.trim()),
          ),
        ];
        const result = tableNames.map((tableName) => ({
          tableName: tableName?.trim(),
          columnNames: dashboardData?.columnNames[tableName?.trim()] || [],
        }));
        setSelectedSlice(result);
      } else setSelectedSlice(item);
    },
    [dashboardData],
  );

  const rawProcessedData = isVennChart
    ? chartVennMatrixData
    : processData(chartData);

  const processedData = rawProcessedData.map((row) => {
    const countColumns = {};
    const otherColumns = {};

    Object.entries(row).forEach(([key, value]) => {
      if (key.toLowerCase() === "count" || key.toLowerCase() === "size") {
        countColumns[key] = value;
      } else {
        otherColumns[key] = value;
      }
    });

    return { ...otherColumns, ...countColumns };
  });

  const headers = processedData.length > 0 ? Object.keys(processedData[0]) : [];
  const column = headers.map((key, index) => ({
    accessorKey: key,
    header: key,
    enableLinkHandler:
      index === headers.length - 1 ? (val) => handleRowClick(val) : "",
  }));

  const saveCommonHandler = () => {
    return (
      <div className="mx-auto flex w-full items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setIsPreview(false)}
          className="flex items-center gap-2 text-sm font-medium text-text-sub transition hover:text-text-primary"
        >
          <GrFormPreviousLink className="w-5" />
          <span>Back</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleAddFormData()}
          className={`rounded-md px-5 py-2 text-sm font-semibold transition bg-accent mt-2 ${
            loading
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:brightness-95"
          }`}
          style={{ backgroundColor: lightbackground, color: textColor }}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    );
  };

  if (showModal && selectedSlice) {
    return (
      <div className="flex flex-col w-full px-2 py-4 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <button
            onClick={handleCloseModal}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-sub hover:text-accent hover:bg-accent/5 rounded-lg border border-border-theme transition"
          >
            ← Back
          </button>
          <span className="text-xs font-bold text-text-sub uppercase tracking-wide">
            Detail View
          </span>
        </div>
        <ChartTable
          selectedTableName={
            tableType === "register"
              ? `AssetRegister_${objectValue}`
              : selectedTableNames?.length && selectedTableNames[0]
          }
          selectedSlice={selectedSlice}
          isVennMatrix={["Venn Chart", "Matrix Chart"].includes(
            dashboardData?.chartType,
          )}
          viewId={state?.viewId || viewId}
        />
      </div>
    );
  }
  return (
    <>
      {!isPreview ? (
        <div
          className="flex h-full flex-col justify-between bg-[var(--surface)] text-text-primary overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div
            style={{ fontFamily: "Poppins, sans-serif" }}
            className="mx-auto flex w-full max-w-[540px] flex-col gap-6 px-4 py-8"
          >
            {!state?.tableType && (
              <SelectField
                label="Select Table Type"
                name="tableType"
                className="w-full"
                value={dashboardData?.tableType || ""}
                onChange={(e) => handleTableTypeChange(e)}
              >
                <option value="">Select Table Type</option>
                <option value="original-source">Original Source</option>
                <option value="by-ar-resource">By AR Source</option>
                <option value="custom-saved-job">Custom Saved View</option>
                <option value="register">Register</option>
              </SelectField>
            )}

            <div>
              <p className={fieldLabelClass}>Select Chart</p>
              <SelectChart />
            </div>

            {/* Show folder selection only for custom-saved-job */}
            {tableType === "custom-saved-job" && (
              <SelectField
                label="Select Folder"
                name="folder"
                className="w-full"
                value={folder}
                onChange={handleChange}
              >
                <option value="">Select Folder</option>
                {myFolders?.length > 0 ? (
                  renderFolderOptions(myFolders)
                ) : (
                  <option>No Data Found</option>
                )}
              </SelectField>
            )}

            {/* Show table selection only for non-register types */}
            {!state?.tableName && tableType !== "register" && (
              <div>
                <p className={fieldLabelClass}>
                  {tableType === "custom-saved-job"
                    ? "Select View"
                    : "Select Tables"}
                </p>
                <FormControl sx={simpleSelectSx}>
                  <Select
                    multiple={isVennChart}
                    IconComponent={MdKeyboardArrowDown}
                    displayEmpty
                    value={
                      tableType === "custom-saved-job"
                        ? selectedViewNames
                        : dashboardData.tableName || selectedTableNames
                    }
                    onChange={handleTableSelection}
                    input={<OutlinedInput notched={false} />}
                    renderValue={(selected) => selected.join(", ")}
                    MenuProps={getMenuProps()}
                  >
                    {tableType !== "custom-saved-job" && (
                      <Box sx={stickySearchSx}>
                        <ListSubheader
                          sx={{ px: 0, py: 0, bgcolor: "transparent" }}
                        >
                          <TextField
                            size="small"
                            placeholder="Search tables..."
                            value={tableSearchTerm}
                            onChange={(e) => setTableSearchTerm(e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                            sx={searchInputSx}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            fullWidth
                          />
                        </ListSubheader>
                      </Box>
                    )}

                    {!tableLoading ? (
                      filteredAndSortedTables.length > 0 ? (
                        filteredAndSortedTables.map((table, index) => (
                          <MenuItem
                            key={index}
                            value={
                              tableType === "custom-saved-job"
                                ? table
                                : table.jobTableName
                            }
                            sx={{ color: "var(--text-primary)" }}
                          >
                            <Checkbox
                              sx={checkboxSx}
                              checked={
                                tableType === "custom-saved-job"
                                  ? selectedViewNames?.includes(table.viewName)
                                  : selectedTableNames?.includes(
                                      table.jobTableName,
                                    )
                              }
                            />
                            {tableType === "custom-saved-job"
                              ? table.viewName
                              : table.jobName}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          {tableSearchTerm
                            ? "No matching tables found"
                            : "No Tables Found"}
                        </MenuItem>
                      )
                    ) : (
                      <MenuItem disabled>Loading...</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </div>
            )}

            {/* Register column selection */}
            {tableType === "register" && (
              <div>
                <p className={fieldLabelClass}>Select Register Columns</p>
                <FormControl sx={simpleSelectSx}>
                  <Select
                    multiple
                    IconComponent={MdKeyboardArrowDown}
                    value={selectedRegisterColumns}
                    onChange={handleRegisterColumnSelection}
                    input={<OutlinedInput notched={false} />}
                    renderValue={(selected) => selected.join(", ")}
                    MenuProps={getMenuProps()}
                  >
                    {/* Search input for register columns */}
                    <Box sx={stickySearchSx}>
                      <ListSubheader
                        sx={{ px: 0, py: 0, bgcolor: "transparent" }}
                      >
                        <TextField
                          size="small"
                          placeholder="Search columns..."
                          value={registerColumnSearchTerm}
                          onChange={(e) =>
                            setRegisterColumnSearchTerm(e.target.value)
                          }
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                          sx={searchInputSx}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          fullWidth
                        />
                      </ListSubheader>
                    </Box>

                    {!registerLoading ? (
                      filteredAndSortedRegisterColumns.length > 0 ? (
                        filteredAndSortedRegisterColumns.map(
                          (column, index) => (
                            <MenuItem
                              key={index}
                              value={column}
                              sx={{ color: "var(--text-primary)" }}
                            >
                              <Checkbox
                                sx={checkboxSx}
                                checked={selectedRegisterColumns.includes(
                                  column,
                                )}
                              />
                              <ListItemText primary={column} />
                            </MenuItem>
                          ),
                        )
                      ) : (
                        <MenuItem disabled>
                          {registerColumnSearchTerm
                            ? "No matching columns found"
                            : "No Columns Found"}
                        </MenuItem>
                      )
                    ) : (
                      <MenuItem disabled>Loading...</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </div>
            )}

            {/* Regular table column selection */}
            <div>
              {selectedTableNames?.map((tableName) => {
                const filteredColumns = getFilteredAndSortedColumns(tableName);
                return (
                  <div key={tableName} className="mt-6">
                    <p
                      className={fieldLabelClass}
                    >{`Select Columns for ${tableName}`}</p>
                    <FormControl sx={simpleSelectSx}>
                      <Select
                        multiple={!isCardChart}
                        IconComponent={MdKeyboardArrowDown}
                        value={
                          isCardChart
                            ? dashboardData?.columnNames[tableName]?.[0] || ""
                            : dashboardData?.columnNames[tableName] || []
                        }
                        onChange={(event) => {
                          let newValue = event.target.value;
                          handleColumnSelection(tableName, newValue, event);
                        }}
                        input={<OutlinedInput notched={false} />}
                        renderValue={(selected) => {
                          if (isCardChart) {
                            return Array.isArray(selected)
                              ? selected[0] || ""
                              : selected || "";
                          } else {
                            return Array.isArray(selected)
                              ? selected.join(", ")
                              : String(selected || "");
                          }
                        }}
                        MenuProps={getMenuProps()}
                      >
                        <Box sx={stickySearchSx}>
                          <ListSubheader
                            sx={{ px: 0, py: 0, bgcolor: "transparent" }}
                          >
                            <TextField
                              size="small"
                              placeholder="Search columns..."
                              value={columnSearchTerms[tableName] || ""}
                              onChange={(e) =>
                                handleColumnSearchChange(
                                  tableName,
                                  e.target.value,
                                )
                              }
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Search fontSize="small" />
                                  </InputAdornment>
                                ),
                              }}
                              sx={searchInputSx}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              fullWidth
                            />
                          </ListSubheader>
                        </Box>

                        {filteredColumns.length > 0 ? (
                          filteredColumns.map((column, index) => (
                            <MenuItem
                              key={index}
                              value={column}
                              sx={{ color: "var(--text-primary)" }}
                            >
                              <Checkbox
                                sx={checkboxSx}
                                checked={
                                  isCardChart
                                    ? dashboardData?.columnNames[
                                        tableName
                                      ]?.[0] === column
                                    : (
                                        dashboardData?.columnNames[tableName] ||
                                        []
                                      ).includes(column)
                                }
                              />
                              <ListItemText primary={column} />
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>
                            {columnSearchTerms[tableName]
                              ? "No matching columns found"
                              : "No Columns Found"}
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rest of the component remains the same */}
          <section className="mx-auto flex w-full max-w-[540px] items-center justify-between px-4 pb-8 pt-4">
            <button
              type="button"
              onClick={() => gotoNext(0)}
              className="flex items-center gap-2 text-sm font-medium text-text-sub transition hover:text-text-primary"
            >
              <GrFormPreviousLink className="w-5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!dashboardData?.tableType) {
                  toast.error("Select table type");
                } else if (!dashboardData.chartType) {
                  toast.error("Select Any Chart Type");
                } else if (tableType === "register") {
                  if (selectedRegisterColumns.length === 0) {
                    toast.error("Select register columns");
                  } else {
                    fetchPreviewData();
                    setIsPreview(true);
                  }
                } else {
                  if (!dashboardData?.tableName?.length) {
                    toast.error("Select table name");
                  } else if (
                    !Object.values(dashboardData?.columnNames).flat(1).length
                  ) {
                    toast.error("Select columns");
                  } else {
                    fetchPreviewData();
                    setIsPreview(true);
                  }
                }
              }}
              className={`text-white rounded-md px-6 py-2 text-sm font-semibold transition bg-accent ${
                loading
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:brightness-95"
              }`}
            >
              {loading ? "Preparing..." : "Preview"}
            </button>
          </section>
        </div>
      ) : (
        <section className="flex flex-col justify-between">
          <main>
            {dashboardData?.chartType !== "Pivot" && (
              <section className="h-[65vh] w-[100%] flex items-center justify-center">
                <ChartComponent
                  setSelectedParentSlice={setSelectedSlice}
                  setShowParentModal={setShowModal}
                  isHideDrawer={false}
                  description={dashboardData?.description}
                  routeName={routeName}
                  viewId={state?.viewId || viewId}
                  ChartselectedTableName={
                    tableType === "register"
                      ? [`AssetRegister_${objectValue}`]
                      : selectedTableNames || dashboardData.tableName || []
                  }
                  ChartselectedColumns={dashboardData?.columnNames || {}}
                  chartType={dashboardData?.chartType}
                  chartData={previewData || {}}
                  objectId={objectId}
                  isCountColum={Object.entries(
                    previewData?.columnNamesWithValuesANDCounting || [],
                  ).find((v) => v[0].startsWith("{count="))}
                  count={
                    previewData
                      ? Object.keys(
                          Object.values(
                            previewData?.columnNamesWithValuesANDCounting,
                          )[0],
                        ).length
                      : 0
                  }
                />
              </section>
            )}
            {dashboardData?.chartType !== "Pivot" && saveCommonHandler()}
            {chartData?.length > 0 ? (
              <section className="w-full p-4">
                <h2 className="text-lg font-semibold mb-2">Application Data</h2>
                <DataTable
                  columns={column}
                  data={processedData}
                  enableRowSelection={false}
                  enableRowOrdering={false}
                  enableColumnOrdering={false}
                  enableColumnVisibility={false}
                  enableToSearch={false}
                  enableFilter={false}
                  enableEditing={true}
                  isDownload
                  className="relative"
                />
              </section>
            ) : (
              <p className="text-gray-500 text-center">No data available</p>
            )}
            <div className="mb-4">
              {dashboardData?.chartType === "Pivot" && saveCommonHandler()}
            </div>
          </main>
        </section>
      )}
      {showModal && selectedSlice && isHideDrawer && (
        <ResizableBottomDrawer
          open={showModal && selectedSlice}
          onClose={handleCloseModal}
          defaultHeight={700}
          minHeight={150}
          maxHeight={900}
        >
          <ChartTable
            selectedTableName={
              tableType === "register"
                ? `AssetRegister_${objectValue}`
                : selectedTableNames?.length && selectedTableNames[0]
            }
            selectedSlice={selectedSlice}
            isVennMatrix={["Venn Chart", "Matrix Chart"].includes(
              dashboardData?.chartType,
            )}
            viewId={state?.viewId || viewId}
          />
        </ResizableBottomDrawer>
      )}
    </>
  );
};

export default PropertySection;
