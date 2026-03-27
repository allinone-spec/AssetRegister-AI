import { useState, useMemo, useEffect, useRef, memo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Edit,
  Save,
  X,
  SortAsc,
  SortDesc,
  Group,
  Filter,
  ChevronLeft,
  Search,
  Clock,
  Sparkles,
  MessageSquareText,
} from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { FaEdit, FaObjectGroup } from "react-icons/fa";
import {
  CircularProgress,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
} from "@mui/material";
import { FaTrash } from "react-icons/fa6";
import { useSelector, useDispatch } from "react-redux";
import { HiMiniViewColumns } from "react-icons/hi2";
import { IoFilter, IoNavigate } from "react-icons/io5";
import { FiDownload, FiSave, FiZap } from "react-icons/fi";
import {
  MdCancel,
  MdOutlineAttachEmail,
  MdOutlineDashboardCustomize,
} from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AdvanceFilter } from "./AdvanceFilter";
import { ChangeTrackingFilter } from "./ChangeTrackingFilter";
import { ViewFiltersModal } from "./ViewFiltersModal";
import { EmailModal } from "./EmailModal";
import MultiSelectCell from "./MultiSelectCell";
import { TbCopyPlus } from "react-icons/tb";
import {
  addColumFilter,
  removeFilterByColumn,
  setFilters,
} from "../../redux/Slices/AdvancedFilterSlice";
import {
  setSelectedObject,
  setSelectedObjectName,
  clearSelectedObject,
} from "../../redux/Slices/ObjectSelection";
import { SaveFilterModal } from "../Common/SaveFilterModal";
import { getCommonRegisterRequest } from "../../Service/Console.service";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  isEqual,
  options,
} from "../../Utility/utilityFunction";
import { getRequest } from "../../Service/admin.save";
import { getRequest as getRequestData } from "../../Service/api.service";
import {
  analyzeDataset,
  chatWithData,
  clearChatSession,
  clearChatThread,
  submitInsightFeedback,
  invalidateAnalysisCache,
  fetchAiModels,
} from "../../Service/ai.service";
import {
  loadHiddenInsightIds,
  persistHiddenInsightIds,
  clearHiddenInsightIds,
} from "../../Utils/aiSessionInsightPrefs";
import { commentImpliesHideInsight } from "../../Utils/aiInsightFeedback";
import AiInsightContent from "./AiInsightContent";
import AiChatAssistantMessage from "./AiChatAssistantMessage";
import { normalizeKpiTitle } from "../../Utils/aiChatKpiExtract";
import { resolveAiModelSelection } from "../../Utils/resolveAiModelSelection";
import { consumeGlobalChatInsightNavForRoute } from "../../Utils/globalChatInsightNav";
import toast from "react-hot-toast";

const buildChatMessageId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const aiInsightChatStateKey = (userId, pageId, category) =>
  `ai-insight-chat-v1:${String(userId || "anonymous")}:${String(pageId || "")}:${String(category || "")}`;

/** Admin list pages: AI filters use object picker; "All object" (empty selection) → objectId null. */
const ADMIN_AI_OBJECT_SCOPE_PATHS = new Set([
  "/admin-console/import-status",
  "/admin-console/saved-jobs",
  "/admin-console/ar-mapping",
  "/admin-console/ar-rules",
  "/admin-console/overview/import-status",
  "/admin-console/overview/saved-jobs",
  "/admin-console/overview/ar-mapping",
  "/admin-console/overview/ar-rules",
]);

// Column Options Dropdown Component
const ColumnOptionsDropdown = ({
  isOpen,
  onClose,
  column,
  position,
  onSortAsc,
  onSortDesc,
  onGroupBy,
  onFilter,
  currentSort,
  isGrouped,
  isFilterActive = false,
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const options = [
    {
      label: "Sort A to Z",
      icon: <SortAsc size={16} />,
      onClick: onSortAsc,
      active: currentSort === "asc",
    },
    {
      label: "Sort Z to A",
      icon: <SortDesc size={16} />,
      onClick: onSortDesc,
      active: currentSort === "desc",
    },
    {
      label: isGrouped ? "Ungroup" : "Group by Column",
      icon: <Group size={16} />,
      onClick: onGroupBy,
      active: isGrouped,
    },
    {
      label: "Filter",
      icon: <Filter size={16} />,
      onClick: onFilter,
      active: isFilterActive,
    },
  ];

  return (
    <div
      ref={dropdownRef}
      className="absolute bg-white border rounded-lg shadow-lg py-2 z-50 min-w-48"
      style={{
        top: position.top,
        left: window.innerWidth <= 767 ? "100px" : position.left,
      }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => {
            option.onClick();
            onClose();
          }}
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 text-sm ${
            option.active ? "bg-blue-50 text-blue-600" : "text-gray-700"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
};

const ColumnFilterDropdown = ({
  isOpen,
  onClose,
  column,
  position,
  data,
  onApplyFilter,
  columnFilters,
  jobName,
  tableDataSource,
  pathname,
  setSaveFilters,
  viewId,
}) => {
  // Get advanced filters from Redux store
  const advancedFilters = useSelector((state) => state.advancedFilter.filters);
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const currentAdvancedFilter = advancedFilters.find(
    (filter) => filter.column === column?.id,
  );
  const [filterValue, setFilterValue] = useState("");
  const [columnValues, setColumnValues] = useState([]);
  const [selectedValues, setSelectedValues] = useState(new Set());
  const [filterType, setFilterType] = useState("contains");
  const [selectOperator, setSelectOperator] = useState(null); // 'Is any of' or 'Is none of'
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const localColumnValue = () =>
      setColumnValues(
        [
          ...new Set(
            data.map((row) => String(row[column?.id])).filter(Boolean),
          ),
        ] || [],
      );

    if (filterType === "select" && setSaveFilters)
      switch (pathname) {
        case "/data-console/register/detailed":
          getCommonRegisterRequest(
            `/AssetRegister/${column?.id}/columnValues/${selectedObject}/tableName/getUniqueColumnValues`,
          )
            .then((res) =>
              setColumnValues([...new Set(res.data.filter((v) => v))] || []),
            )
            .catch(() => localColumnValue());
          break;
        case pathname.includes("/data-console/reports/original-source/jobs")
          ? pathname
          : false:
        case pathname.includes("/data-console/reports/by-ar-resource/jobs")
          ? pathname
          : false:
          getRequest(
            `/table/${column?.id}/columnValues/${tableDataSource}/datasource/${jobName}/getUniqueColumnValues`,
          )
            .then((res) =>
              setColumnValues([...new Set(res.data.filter((v) => v))] || []),
            )
            .catch(() => localColumnValue());
          break;
        case "/admin-console/import-status":
          getRequest(
            `/jobSchedule/${column?.id}/columnValues/getUniqueColumnValues`,
          )
            .then((res) =>
              setColumnValues([...new Set(res.data.filter((v) => v))] || []),
            )
            .catch(() => localColumnValue());
          break;
        case "/admin-console/saved-jobs":
        case "/admin-console/ar-mapping":
        case "/admin-console/ar-rules":
          getRequest(`/Status/${column?.id}/columnValues/getUniqueColumnValues`)
            .then((res) =>
              setColumnValues([...new Set(res.data.filter((v) => v))] || []),
            )
            .catch(() => localColumnValue());
          break;
        case pathname.includes("/data-console/reports/folder-list-filter")
          ? pathname
          : false:
          getRequestData(
            `/view/${column?.id}/columnValues/getUniqueColumnValues`,
          )
            .then((res) =>
              setColumnValues([...new Set(res.data.filter((v) => v))] || []),
            )
            .catch(() => localColumnValue());
          break;
        default:
          break;
      }
  }, [filterType, pathname]);

  useEffect(() => {
    if (isOpen && column) {
      const existingFilter = columnFilters[column.id];
      if (existingFilter) {
        const uniqueValues = [
          ...new Set(data.map((row) => String(row[column.id])).filter(Boolean)),
        ];
        const matchingValues = uniqueValues.filter((val) =>
          existingFilter(val.toLowerCase()),
        );
        if (
          matchingValues.length > 0 &&
          matchingValues.length < uniqueValues.length
        ) {
          setSelectedValues(
            new Set(matchingValues.map((v) => String(v).toLowerCase())),
          );
        }
      } else {
        setFilterValue("");
        setSelectedValues(new Set());
        setFilterType("contains");
        setSelectOperator(null);
      }
    }
  }, [isOpen, column, data, columnFilters]);

  useEffect(() => {
    if (currentAdvancedFilter) {
      if (currentAdvancedFilter.value) {
        const cond = currentAdvancedFilter.condition;
        if (cond === "Is any of" || cond === "Is none of") {
          const parts = String(currentAdvancedFilter.value || "")
            .split(/\s*,\s*/)
            .map((v) => v.trim().toLowerCase())
            .filter(Boolean);
          setSelectedValues(new Set(parts));
          setFilterType("select");
          setSelectOperator(cond);
          setFilterValue(String(currentAdvancedFilter.value));
        } else {
          setSelectedValues(new Set());
          setSelectOperator(null);
          setFilterType(currentAdvancedFilter?.condition || "contains");
          setFilterValue(currentAdvancedFilter.value || "");
        }
      }
    } else {
      setSelectedValues(new Set());
      setFilterValue("");
      setFilterType("contains");
      setSelectOperator(null);
    }
  }, [currentAdvancedFilter]);

  if (!isOpen) return null;

  const uniqueValues = [
    ...new Set(data.map((row) => String(row[column.id])).filter(Boolean)),
  ].sort();

  const handleApply = () => {
    let appliedFilterType = filterType;
    let appliedFilterValue = "";

    if (filterType === "select" && selectedValues.size > 0) {
      const filterFn = (value) => {
        const v =
          typeof value === "number" ? value : String(value || "").toLowerCase();
        const has = selectedValues.has(v);
        return selectOperator === "Is none of" ? !has : has;
      };
      appliedFilterType = selectOperator || "Is any of";
      appliedFilterValue = Array.from(selectedValues).join(",");
      onApplyFilter(column.id, filterFn, appliedFilterType, appliedFilterValue);
    } else if (filterValue && String(filterValue).trim()) {
      let filterFn;
      appliedFilterValue = filterValue;

      switch (filterType) {
        case "contains":
          appliedFilterType = "Contains";
          filterFn = (value = "") =>
            String(value).toLowerCase().includes(filterValue.toLowerCase());
          break;
        case "equals":
          appliedFilterType = "Equals";
          filterFn = (value) =>
            String(value).toLowerCase() === filterValue.toLowerCase();
          break;
        case "startsWith":
          appliedFilterType = "Starts with";
          filterFn = (value) =>
            String(value).toLowerCase().startsWith(filterValue.toLowerCase());
          break;
        case "endsWith":
          appliedFilterType = "Ends with";
          filterFn = (value) =>
            String(value).toLowerCase().endsWith(filterValue.toLowerCase());
          break;
      }
      onApplyFilter(column.id, filterFn, appliedFilterType, appliedFilterValue);
    } else if (filterType === "select" && selectedValues.size === 0) {
      onApplyFilter(column.id, null, null, null);
    }
    onClose();
  };

  const handleClear = () => {
    setFilterValue("");
    setSelectedValues(new Set());
    setFilterType("contains");
    setSelectOperator(null);
    onApplyFilter(column.id, null, null, null);
    onClose();
  };

  const toggleValue = (value) => {
    const v = typeof value === "number" ? value : String(value).toLowerCase();
    const newSelected = new Set(selectedValues);
    if (newSelected.has(v)) newSelected.delete(v);
    else newSelected.add(v);
    setSelectedValues(newSelected);
  };

  const selectAll = () =>
    setSelectedValues(
      new Set(uniqueValues.map((v) => String(v).toLowerCase())),
    );
  const deselectAll = () => setSelectedValues(new Set());

  return (
    <div
      ref={dropdownRef}
      className={`absolute bg-white border rounded-lg shadow-lg py-3 px-4 z-50 min-w-80 max-h-96 overflow-y-auto`}
      style={{
        top: position.top,
        left: window.innerWidth <= 767 ? "auto" : position.left,
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold">
          Filter:{" "}
          {typeof column.header === "string" ? column.header : column.id}
        </h4>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Filter Type:</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFilterValue("");
              setSelectedValues(new Set());
              setSelectOperator(null);
            }}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
            <option value="select">Select Values</option>
          </select>
        </div>

        {filterType === "select" ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-medium">
                Select Values ({selectedValues.size} selected):
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto border rounded p-2">
              {[setSaveFilters ? columnValues : uniqueValues]
                .flat(1)
                ?.slice(0, 1000)
                .map((value) => {
                  const key =
                    typeof value === "number"
                      ? value
                      : String(value).toLowerCase();
                  return (
                    <div
                      key={String(value)}
                      className="flex items-center gap-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.has(key)}
                        onChange={() => toggleValue(value)}
                        className="rounded"
                      />
                      <span className="text-xs truncate">{String(value)}</span>
                    </div>
                  );
                })}
              {[setSaveFilters ? { ...columnValues } : { ...uniqueValues }]
                .length > 1000 && (
                <div className="text-xs text-gray-500 pt-1">
                  Showing first 1000 values...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium mb-1">
              Filter Value:
            </label>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Enter filter value..."
              className="w-full border rounded px-2 py-1 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border rounded"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            disabled={filterType === "select" ? false : !filterValue.trim()}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// Add draggable header component
const DraggableTableHeader = ({
  header,
  onHeaderClick,
  enableColumnResizing,
  backgroundColor,
  layoutTextColor,
  sorting,
  enableFilter,
  enableColumnOrdering,
}) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useSortable({
      id: header.column.id,
    });

  const style = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition: "width transform 0.2s ease-in-out",
    whiteSpace: "nowrap",
    width: header.column.getSize(),
    // zIndex: isDragging ? 1 : 0,
    background: backgroundColor,
    color: layoutTextColor,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-4 py-5 text-left text-xs font-medium uppercase tracking-wider relative"
      colSpan={header.colSpan}
      onClick={(e) => {
        if (enableFilter) {
          e.stopPropagation();
          onHeaderClick(e, header.column);
        }
      }}
    >
      <div className="flex items-center gap-2">
        {header.isPlaceholder ? null : (
          <>
            <div
              className={`flex items-center gap-1 ${
                header.column.getCanSort() && enableFilter
                  ? "cursor-pointer select-none"
                  : ""
              }`}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {
                {
                  asc: <ChevronUp size={16} />,
                  desc: <ChevronDown size={16} />,
                }[
                  sorting?.length
                    ? header.column.columnDef.header === sorting[0]?.id
                      ? sorting[0]?.desc
                        ? "desc"
                        : "asc"
                      : null
                    : null
                ]
              }
            </div>
            {!["action", "select", "sno"].includes(header.id) &&
              enableColumnOrdering && (
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab hover:cursor-grabbing p-1 rounded"
                >
                  <GripVertical size={14} />
                </button>
              )}
          </>
        )}
      </div>

      {/* {enableColumnResizing && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className="absolute right-0 top-0 h-full w-1 bg-gray-300 cursor-col-resize hover:bg-blue-500 opacity-0 hover:opacity-100"
        />
      )} */}
    </th>
  );
};
// Sortable Row Component
const SortableRow = ({ row, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: row.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: "width transform 0.2s ease-in-out",
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    whiteSpace: "nowrap",
    // zIndex: isDragging ? 1 : 0,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b bg-white hover:bg-gray-50 ${
        isDragging ? "bg-blue-50" : ""
      }`}
    >
      <td className="px-1 py-2 text-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-gray-200"
        >
          <GripVertical size={16} />
        </div>
      </td>
      {children}
    </tr>
  );
};

// Editable Cell Component
const EditableCell = ({
  getValue,
  row,
  column,
  table,
  handleUpdatePriority,
}) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  const onBlur = () => {
    table.options.meta?.updateData(row.index, column.id, value);
    // setIsEditing(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      onBlur();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          style={{ width: 100 }}
          className="border rounded px-2 py-1 text-sm w-full"
          autoFocus
        />
        <button
          onClick={() => {
            handleUpdatePriority &&
              handleUpdatePriority({
                jobNameWithPriority: [{ [row.original.jobName]: value }],
              });
            setIsEditing(false);
          }}
          className="text-green-600 hover:text-green-800"
        >
          <Save size={14} />
        </button>
        <button
          onClick={() => {
            setValue(initialValue);
            setIsEditing(false);
          }}
          className="text-red-600 hover:text-red-800"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between group cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      <span>{value}</span>
      <Edit
        size={14}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
      />
    </div>
  );
};

const RegularCell = ({ getValue }) => {
  const value = getValue();
  return typeof value === "string" || typeof value === "number" ? (
    <span style={{ fontSize: "smaller" }}>{value}</span>
  ) : (
    <span style={{ fontSize: "smaller" }} />
  );
};

const LinkCell = ({ getValue, linkHandler, row, hideCell }) => {
  const value = getValue();
  return (
    <span
      className="cursor-pointer text-[16px]"
      style={{ fontSize: "smaller", color: "blue" }}
      onClick={() => linkHandler(row)}
    >
      {hideCell ? hideCell : value}
    </span>
  );
};

const getUnifiedGroupCount = (row) => {
  // Always count the actual data rows, not including group headers
  if (row.subRows.length > 0) {
    let count = 0;

    const countDataRows = (rows) => {
      rows.forEach((r) => {
        if (r.subRows && r.subRows.length > 0) {
          countDataRows(r.subRows);
        } else {
          count++;
        }
      });
    };

    countDataRows(row.subRows);
    return count;
  }

  return 0;
};

// Main DataTable Component
const DataTable = ({
  data,
  columns,
  enableRowSelection = true,
  enableSerialNumber = true,
  enableColumnVisibility = true,
  enableSorting = true,
  enablePagination = true,
  enableAction = true,
  editActionHandler,
  deleteActionHandler,
  enableGrouping = false,
  enableRowOrdering = true,
  enableColumnResizing = true,
  enableEditing = false,
  enableToSearch = true,
  enableFilter = true,
  enableColumnOrdering = true,
  enableCreateDashboard = true,
  enableCreateView = true,
  enableCreateEmail = true,
  enableAdvanceFilter = true,
  enableGroupByFilter = true,
  enableDownload = true,
  onDataChange,
  deleteId = true,
  setSelectedRows,
  pageSize = 10,
  className = "",
  path = "",
  handleARRulesNavigation,
  routeName,
  handleUpdatePriority,
  setFilteredData,
  ARMappingTable = false,
  dashboardData = {},
  totalRecords = 0,
  onPaginationChange,
  pagination,
  tableId = null,
  viewId = null,
  jobName,
  setSaveFilters,
  saveFilters,
  isLoading,
  isSelectedObject,
  tableName,
  fetchAllSourceData,
  isAppliedFilter = true,
  disabledCheckBox = false,
  selectedRows,
  cancelActionHandle,
  isDownload = false,
  availableTables = [],
}) => {
  const [tableData, setTableData] = useState(data);
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [grouping, setGrouping] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [columnSizing, setColumnSizing] = useState({});
  const [isColumnChange, setIsColumnChange] = useState(0);
  const [columnFilters, setColumnFilters] = useState({});
  const [isAdvanceFilterModalOpen, setIsAdvanceFilterModalOpen] =
    useState(false);
  const [viewAddedFilter, setViewAddedFilter] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveFilter, setSaveFilter] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const columnDropdownRef = useRef(null);
  const [isGroupByDropdownOpen, setIsGroupByDropdownOpen] = useState(false);
  const groupByDropdownRef = useRef(null);
  const downloadDropdownRef = useRef(null);
  const dropdownContainer = useRef();
  const [manualPagination, setManualPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const { filters: myData, activeColumns } = useSelector(
    (state) => state.advancedFilter,
  );
  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );
  const { folderData } = useSelector((state) => state.folderData);
  const user = useSelector((state) => state.auth?.user);
  const selectedObject = useSelector((state) => state.selectedObject.value);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  // Dropdown states
  const [dropdownState, setDropdownState] = useState({
    isOpen: false,
    column: null,
    position: { top: 0, left: 0 },
  });

  const [filterDropdownState, setFilterDropdownState] = useState({
    isOpen: false,
    column: null,
    position: { top: 0, left: 0 },
  });

  const [isChangeTrackingFilterOpen, setIsChangeTrackingFilterOpen] =
    useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiStage, setAiStage] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [aiRequestDebug, setAiRequestDebug] = useState(null);
  const [aiResponseDebug, setAiResponseDebug] = useState(null);
  const [hiddenInsightIds, setHiddenInsightIds] = useState([]);
  const [aiModels, setAiModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [aiFocusColumns, setAiFocusColumns] = useState([]);
  const [queuedKpiRequests, setQueuedKpiRequests] = useState([]);
  const [kpiTitleActions, setKpiTitleActions] = useState({});
  const aiStageTimerRef = useRef(null);
  const aiOpenFlowBusyRef = useRef(false);
  const aiColumnCandidates = useMemo(
    () =>
      (columns || [])
        .map((c) => c.accessorKey ?? c.id ?? c.header)
        .filter(Boolean)
        .map(String),
    [columns]
  );
  const { bgColor, textWhiteColor } = useTheme();
  const { layoutTextColor, backgroundColor } = bgColor;
  const isGrouped = !saveFilters?.grouping?.length;
  const isAiSupportedPage =
    pathname === "/data-console/overview" ||
    pathname === "/data-console/reports/original-source" ||
    pathname.startsWith("/data-console/reports/original-source/jobs/") ||
    pathname === "/data-console/reports/by-ar-resource" ||
    pathname.startsWith("/data-console/reports/by-ar-resource/jobs/") ||
    pathname === "/data-console/register/detailed" ||
    pathname === "/data-console/security/users" ||
    pathname === "/data-console/security/groups" ||
    pathname === "/data-console/security/roles" ||
    pathname === "/data-console/security/permission" ||
    pathname === "/data-console/security/permissions" ||
    pathname === "/admin-console/overview" ||
    pathname === "/admin-console/import-status" ||
    pathname === "/admin-console/saved-jobs" ||
    pathname === "/admin-console/ar-mapping" ||
    pathname === "/admin-console/ar-rules" ||
    pathname === "/admin-console/overview/import-status" ||
    pathname === "/admin-console/overview/saved-jobs" ||
    pathname === "/admin-console/overview/ar-mapping" ||
    pathname === "/admin-console/overview/ar-rules";

  /** Align with AiInsightContent DRILL_GRID_CAP so job/register drill can load full grids beyond one UI page. */
  const AI_INSIGHT_DRILL_MAX = 50000;
  const aiInsightDrillDown = useMemo(() => {
    if (!isAiSupportedPage || !Array.isArray(tableData) || tableData.length === 0) return null;
    const total = tableData.length;
    const rows = total > AI_INSIGHT_DRILL_MAX ? tableData.slice(0, AI_INSIGHT_DRILL_MAX) : tableData;
    const loadAllRows =
      typeof fetchAllSourceData === "function"
        ? async () => {
            try {
              const all = await fetchAllSourceData();
              if (!Array.isArray(all) || !all.length) return [];
              return all.length > AI_INSIGHT_DRILL_MAX ? all.slice(0, AI_INSIGHT_DRILL_MAX) : all;
            } catch {
              return [];
            }
          }
        : undefined;
    return {
      rows,
      loadAllRows,
      caption: jobName
        ? `Report grid — ${jobName}${dashboardData?.dataSource ? ` (${dashboardData.dataSource})` : ""}`
        : "Report / register grid (this page)",
      truncated: total > AI_INSIGHT_DRILL_MAX,
      totalRowCount: total,
    };
  }, [isAiSupportedPage, tableData, jobName, dashboardData?.dataSource, fetchAllSourceData]);
  const showAnalyzeButton =
    isAiSupportedPage &&
    pathname !== "/data-console/reports/original-source" &&
    pathname !== "/data-console/reports/by-ar-resource" &&
    pathname !== "/data-console/reports/by-ar-resources";
  // DnD Sensors
  const sensors = useSensors(
    // useSensor(PointerSensor),
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {
      // coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (aiLoading) {
      setAiStage(1);
      if (aiStageTimerRef.current) {
        clearInterval(aiStageTimerRef.current);
      }
      aiStageTimerRef.current = setInterval(() => {
        setAiStage((prev) => (prev >= 4 ? 4 : prev + 1));
      }, 2000);
    } else {
      if (aiStageTimerRef.current) {
        clearInterval(aiStageTimerRef.current);
        aiStageTimerRef.current = null;
      }
      setAiStage(0);
    }

    return () => {
      if (aiStageTimerRef.current) {
        clearInterval(aiStageTimerRef.current);
        aiStageTimerRef.current = null;
      }
    };
  }, [aiLoading]);

  useEffect(() => {
    if (aiDialogOpen && isAiSupportedPage) {
      fetchAiModels()
        .then((res) => {
          const list = res?.models || [];
          setAiModels(list);
          setSelectedModelId((prev) => resolveAiModelSelection(prev, list, res?.defaultChatModelId || ""));
        })
        .catch(() => setAiModels([]));
    }
  }, [aiDialogOpen, isAiSupportedPage]);

  useEffect(() => {
    if (data && !isEqual(data, tableData)) setTableData(data);

    return () => {
      if (!setSaveFilters && !isSelectedObject) dispatch(setFilters([]));
    };
  }, [data]);

  useEffect(() => {
    let isFilter = false;
    if (saveFilters?.filterKey && isFilter) return;
    setSorting(
      saveFilters?.sortColumns?.map((v) => ({
        id: v.columnName,
        desc: v.direction === "DESC",
      })) || [],
    );
    setIsFocused(!!saveFilters?.searchText);
    setFiltering(saveFilters?.searchText || "");
    setSearchValue(saveFilters?.searchText || "");
    isFilter = true;
  }, [saveFilters?.filterKey]);

  useEffect(() => {
    if (!setSaveFilters) return;
    if (!saveFilters?.orderColumnHeaders?.length) return;
    let isFilter = false;
    if (saveFilters?.filterKey && isFilter && !columns?.length) return;
    const filterColumnVisibility = Object.fromEntries(
      columns.map((v) => [
        v.header,
        saveFilters?.orderColumnHeaders?.includes(v.header) || false,
      ]),
    );

    setColumnVisibility(filterColumnVisibility);

    isFilter = true;
  }, [saveFilters?.filterKey, columns]);

  // Outside click detection for download dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        downloadDropdownRef.current &&
        !downloadDropdownRef.current.contains(event.target)
      ) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  const updateData = (rowIndex, columnId, value) => {
    const newData = [...tableData];
    newData[rowIndex][columnId] = value;
    setTableData(newData);
    onDataChange?.(newData);
  };

  const handleColumnHeaderClick = (event, column) => {
    if (column.id === "select" || column.id === "action" || column.id === "sno")
      return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = dropdownContainer.current.getBoundingClientRect();

    // Get the scroll position of the container
    const scrollLeft = dropdownContainer.current.scrollLeft || 0;
    const scrollTop = dropdownContainer.current.scrollTop + 10 || 0;

    setDropdownState({
      isOpen: true,
      column: column,
      position: {
        top: rect.bottom - containerRect.top + scrollTop,
        left:
          column.id === table.getAllLeafColumns().at(-1).id
            ? rect.left - containerRect.left + scrollLeft - 90
            : rect.left - containerRect.left + scrollLeft,
      },
    });
  };

  // Column actions
  const handleSortAsc = () => {
    setSorting([{ id: dropdownState.column.id, desc: false }]);
    setSaveFilters &&
      setSaveFilters((pre) => ({
        ...pre,
        sortColumns: [
          { columnName: dropdownState.column.id, direction: "ASC" },
        ],
      }));
    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (onPaginationChange)
      onPaginationChange(manualPagination.pageSize, 0, false);
  };

  const handleSortDesc = () => {
    setSorting([{ id: dropdownState.column.id, desc: true }]);
    setSaveFilters &&
      setSaveFilters((pre) => ({
        ...pre,
        sortColumns: [
          { columnName: dropdownState.column.id, direction: "DESC" },
        ],
      }));
    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (onPaginationChange)
      onPaginationChange(manualPagination.pageSize, 0, false);
  };

  const handleGroupBy = () => {
    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (onPaginationChange)
      onPaginationChange(manualPagination.pageSize, 0, false);

    const columnId = dropdownState.column.id;
    const newGrouping = grouping.includes(columnId)
      ? grouping.filter((id) => id !== columnId)
      : [...grouping, columnId];
    setGrouping(newGrouping);

    if (setSaveFilters) {
      setFiltering("");
      setSearchValue("");
      setIsFocused(false);
      setSorting([]);
      setColumnFilters({});
      dispatch(setFilters([]));
      setSaveFilters((pre) => ({
        ...pre,
        grouping: newGrouping,
        searchText: "",
        sortColumns: [],
        filterExpression: {
          logic: "AND",
          conditions: [],
        },
      }));
    }
  };

  const handleGroupByFromDropdown = (column) => {
    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (onPaginationChange)
      onPaginationChange(manualPagination.pageSize, 0, false);

    const newGrouping = grouping.includes(column)
      ? grouping.filter((id) => id !== column)
      : [...grouping, column];
    setGrouping(newGrouping);

    if (setSaveFilters) {
      setFiltering("");
      setSearchValue("");
      setIsFocused(false);
      setSorting([]);
      setColumnFilters({});
      dispatch(setFilters([]));
      setSaveFilters((pre) => ({
        ...pre,
        grouping: newGrouping,
        searchText: "",
        sortColumns: [],
        filterExpression: {
          logic: "AND",
          conditions: [],
        },
      }));
    }
  };

  useEffect(() => {
    const hasGrouping = grouping.length > 0;
    const hadGrouping = saveFilters?.grouping?.length > 0;

    // If we just cleared grouping (had grouping before, now don't)
    if (hadGrouping && !hasGrouping && setSaveFilters) {
      setColumnFilters({});
      setTableData(data);
    }
  }, [grouping.length, saveFilters?.grouping?.length]);

  const handleFilter = () => {
    setFilterDropdownState({
      isOpen: true,
      column: dropdownState.column,
      position: {
        top: dropdownState.position.top, // Offset a bit more for the filter dropdown
        left:
          dropdownState.column.id === table.getAllLeafColumns().at(-1).id
            ? dropdownState.position.left - 140
            : dropdownState.position.left,
      },
    });
    // Close the column options dropdown
    setDropdownState({
      isOpen: false,
      column: null,
      position: { top: 0, left: 0 },
    });
  };

  const handleApplyColumnFilter = (
    columnId,
    filterFn,
    filterType,
    filterValue,
  ) => {
    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (filterFn) {
      setColumnFilters((prev) => ({
        ...prev,
        [columnId]: filterFn,
      }));
      // Add to Redux store for advanced filter
      dispatch(
        addColumFilter({
          column: columnId,
          field: columnId,
          condition: filterType || "Contains",
          value: filterValue || "",
          operator: "AND",
        }),
      );
    } else {
      setColumnFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters[columnId];
        return newFilters;
      });
      // Remove from Redux store
      dispatch(removeFilterByColumn(columnId));
    }
    if (onPaginationChange) {
      onPaginationChange(manualPagination.pageSize, 0, false);
    }
  };

  // Also add useEffect to sync Redux changes back to local state
  useEffect(() => {
    // small helpers for reuse
    const toLower = (v) =>
      v === null || v === undefined ? null : String(v).toLowerCase();
    const isBlank = (v) =>
      v === null || v === undefined || String(v).trim() === "";

    const buildConditionFn = (filter) => {
      const fvRaw =
        filter.values && Array.isArray(filter.values)
          ? filter.values
          : filter.value;

      return (cell) => {
        const valStr = toLower(cell);

        switch (filter.condition) {
          case "Contains":
            return (
              valStr !== null &&
              valStr.includes(String(fvRaw || "").toLowerCase())
            );
          case "Equals":
            return (
              valStr !== null && valStr === String(fvRaw || "").toLowerCase()
            );
          case "Starts with":
            return (
              valStr !== null &&
              valStr.startsWith(String(fvRaw || "").toLowerCase())
            );
          case "Ends with":
            return (
              valStr !== null &&
              valStr.endsWith(String(fvRaw || "").toLowerCase())
            );
          case "Does not equal":
            return valStr === null
              ? true
              : valStr !== String(fvRaw || "").toLowerCase();
          case "Is greater than":
            return parseFloat(cell) > parseFloat(fvRaw);
          case "Is greater than or equal to":
            return parseFloat(cell) >= parseFloat(fvRaw);
          case "Is less than":
            return parseFloat(cell) < parseFloat(fvRaw);
          case "Is less than or equal to":
            return parseFloat(cell) <= parseFloat(fvRaw);
          case "Is between":
            return (
              parseFloat(cell) >= parseFloat(fvRaw[0]) &&
              parseFloat(cell) <= parseFloat(fvRaw[1])
            );
          case "Is not between":
            return (
              parseFloat(cell) < parseFloat(fvRaw[0]) ||
              parseFloat(cell) > parseFloat(fvRaw[1])
            );
          case "Does not contain":
            return valStr === null
              ? true
              : !valStr.includes(String(fvRaw || "").toLowerCase());
          case "Is blank":
            return isBlank(cell);
          case "Is not blank":
            return !isBlank(cell);
          case "Is any of": {
            const list = Array.isArray(fvRaw)
              ? fvRaw.map((v) => String(v).toLowerCase())
              : String(fvRaw || "")
                  .split(",")
                  .map((s) => s.trim().toLowerCase());
            return valStr !== null && list.includes(valStr);
          }
          case "Is none of": {
            const list = Array.isArray(fvRaw)
              ? fvRaw.map((v) => String(v).toLowerCase())
              : String(fvRaw || "")
                  .split(",")
                  .map((s) => s.trim().toLowerCase());
            return valStr === null ? true : !list.includes(valStr);
          }
          default:
            return true;
        }
      };
    };

    // Group filters by column and create composite (AND) functions
    const grouped = {};
    (myData || []).forEach((f) => {
      grouped[f.column] = grouped[f.column] || [];
      grouped[f.column].push(buildConditionFn(f));
    });

    const advancedColumnFns = {};
    Object.entries(grouped).forEach(([col, fns]) => {
      advancedColumnFns[col] = (val) => fns.every((fn) => fn(val));
    });
    // Merge advanced filter functions into existing columnFilters without removing local filters
    setColumnFilters(advancedColumnFns);

    setSaveFilters &&
      setSaveFilters((pre) => ({
        ...pre,
        filterExpression: {
          logic: myData[0]?.operator || "AND",
          conditions: myData
            .filter((v) => v.column && v.condition)
            .map((v) => ({
              field: v.column,
              operator: v.condition,
              value: v.value,
              table: v?.table || "",
              table2: v?.table2 || "",
              field2: v?.field2 || "",
            })),
        },
      }));
  }, [myData]);
  // Enhanced columns with features
  const enhancedColumns = useMemo(() => {
    let cols = [...columns];

    if (enableSerialNumber && !grouping.length) {
      cols.unshift({
        id: "sno",
        header: () => <div className="whitespace-nowrap">S NO.</div>,
        cell: ({ cell }) => {
          return (
            <div>
              {pagination
                ? pagination.pageIndex * pagination.pageSize +
                  cell.row.index +
                  1
                : cell.row.index + 1}
            </div>
          );
        },
        enableSorting: false,
        enableGrouping: false,
        size: 50,
      });
    }

    // Add selection column if enabled
    if (enableRowSelection && !grouping.length) {
      cols.unshift({
        id: "select",
        header: ({ table }) => {
          // Get all rows across all pages that are not disabled (enabled checkboxes only)
          const allRows = table.getPrePaginationRowModel
            ? table.getPrePaginationRowModel().rows
            : table.getRowModel().rows;

          const enabledRows = allRows.filter((row) =>
            deleteId === true ? true : row.original[deleteId],
          );

          // Check if all enabled rows are selected
          const allEnabledSelected =
            enabledRows.length > 0 &&
            enabledRows.every((row) => row.getIsSelected());

          // Check if some enabled rows are selected
          const someEnabledSelected = enabledRows.some((row) =>
            row.getIsSelected(),
          );

          return (
            <input
              type="checkbox"
              checked={allEnabledSelected}
              disabled={disabledCheckBox}
              ref={(el) => {
                if (el)
                  el.indeterminate = someEnabledSelected && !allEnabledSelected;
              }}
              onChange={(e) => {
                if (e.target.checked) {
                  // Select only enabled rows
                  enabledRows.forEach((row) => {
                    if (!row.getIsSelected()) {
                      row.toggleSelected(true);
                    }
                  });
                } else {
                  // Deselect only enabled rows
                  enabledRows.forEach((row) => {
                    if (row.getIsSelected()) {
                      row.toggleSelected(false);
                    }
                  });
                }
              }}
              className="w-5 h-5 rounded"
            />
          );
        },
        cell: ({ row }) => {
          return (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              disabled={
                disabledCheckBox
                  ? disabledCheckBox
                  : deleteId == true
                    ? false
                    : !row.original[deleteId]
              }
              onChange={row.getToggleSelectedHandler()}
              className="w-5 h-5 rounded"
            />
          );
        },
        enableSorting: false,
        enableGrouping: false,
        size: 50,
      });
    }

    if (
      enableAction &&
      permissionList.includes(routeName) &&
      permissionDetails[routeName]?.hasWriteOnly
    ) {
      cols.push({
        id: "action",
        header: () => <span>Action</span>,
        cell: ({ row }) => {
          return (
            <div style={{ display: "flex" }}>
              {path && (
                <>
                  {permissionList?.includes("A R Mapping") &&
                    permissionDetails["A R Mapping"]?.hasWriteOnly && (
                      <Link
                        to={`${path}/${row.original.ACTableName}`}
                        state={{
                          data: { heading: "AR Mapping", ...row.original },
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <IoNavigate />
                        <span>AR Mapping</span>
                      </Link>
                    )}
                  {permissionList?.includes("A R Rules") &&
                    permissionDetails["A R Rules"]?.hasWriteOnly && (
                      <p
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                        onClick={() =>
                          handleARRulesNavigation &&
                          handleARRulesNavigation(row.original, true)
                        }
                      >
                        <IoNavigate />
                        <span> AR Rule</span>
                      </p>
                    )}
                  <div className="relative group">
                    <IconButton className="relative">
                      <TbCopyPlus
                        style={{ color: backgroundColor }}
                        onClick={() =>
                          editActionHandler &&
                          editActionHandler(row.original, true)
                        }
                      />
                      <div
                        style={{ backgroundColor }}
                        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 mb-2 text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50"
                      >
                        Copy and New
                      </div>
                    </IconButton>
                  </div>
                </>
              )}
              {editActionHandler && (
                <IconButton>
                  <FaEdit
                    style={{ color: backgroundColor }}
                    onClick={() =>
                      editActionHandler && editActionHandler(row.original)
                    }
                  />
                </IconButton>
              )}
              {cancelActionHandle &&
                row.original.status.toLowerCase() === "running" && (
                  <IconButton>
                    <MdCancel
                      style={{ color: backgroundColor }}
                      onClick={() =>
                        cancelActionHandle && cancelActionHandle(row.original)
                      }
                    />
                  </IconButton>
                )}
              {row.original[deleteId] || deleteId == true ? (
                <IconButton
                  disabled={disabledCheckBox}
                  style={{
                    marginLeft: cancelActionHandle
                      ? row.original.status.toLowerCase() === "running"
                        ? 0
                        : 43
                      : 0,
                  }}
                >
                  <FaTrash
                    style={{ color: backgroundColor }}
                    onClick={() =>
                      deleteActionHandler && deleteActionHandler(row.original)
                    }
                  />
                </IconButton>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
        enableGrouping: false,
        size: 50,
      });
    }

    if (enableEditing) {
      cols = cols.map((col) => ({
        ...col,
        cell:
          col.cell ||
          (({ getValue, row, column, table }) => {
            if (column.columnDef.enableTextFiled) {
              return (
                <EditableCell
                  getValue={getValue}
                  row={row}
                  column={column}
                  table={table}
                  handleUpdatePriority={handleUpdatePriority}
                />
              );
            } else if (column.columnDef.enableMultiSelect) {
              return (
                <MultiSelectCell
                  getValue={getValue}
                  row={row}
                  column={column}
                  table={table}
                  options={column.columnDef?.multiSelectOptions || []}
                  disabled={column.columnDef?.disabled}
                  handleDropdownChange={column.columnDef?.handleDropdownChange}
                />
              );
            } else if (column.columnDef?.enableLinkHandler) {
              return (
                <LinkCell
                  getValue={getValue}
                  row={row.original}
                  linkHandler={column.columnDef?.enableLinkHandler}
                  hideCell={column.columnDef?.hideCell}
                />
              );
            } else {
              return <RegularCell getValue={getValue} />;
            }
          }),
      }));
    }

    return cols;
  }, [columns, enableRowSelection, enableEditing, grouping.length]);

  // Filter data based on column filters
  const filteredData = useMemo(() => {
    if (Object.keys(columnFilters).length === 0) return data;

    return data.filter((row) => {
      return Object.entries(columnFilters).every(([columnId, filterFn]) => {
        return filterFn(row[columnId]);
      });
    });
  }, [ARMappingTable ? data : data?.length, columnFilters]);

  // Create a function to check if a column filter is active
  const isColumnFilterActive = (columnId) => {
    // Check local column filters
    const hasLocalFilter = Object.hasOwnProperty.call(columnFilters, columnId);

    // Check Redux active columns (convert Set to Array for includes check)
    const hasReduxFilter =
      activeColumns && Array.from(activeColumns).includes(columnId);

    return hasLocalFilter || hasReduxFilter;
  };

  useEffect(() => {
    if (isAppliedFilter)
      if (!setSaveFilters && isGrouped) setTableData(filteredData);
      else if (setSaveFilters && saveFilters?.grouping?.length > 0)
        setTableData(filteredData);
  }, [filteredData, saveFilters?.grouping?.length]);

  useEffect(() => {
    if (pagination?.pageSize)
      setManualPagination((pre) => ({ ...pre, pageSize: pagination.pageSize }));
  }, [pagination?.pageSize]);
  // Table instance
  const table = useReactTable({
    data: tableData,
    columns: enhancedColumns,
    getRowId: (row) =>
      String(row.id || row.ruleId || row.filterId || Math.random()),
    state: {
      rowSelection,
      columnVisibility,
      columnOrder: setSaveFilters && isGrouped ? undefined : columnOrder,
      sorting: setSaveFilters && isGrouped ? undefined : sorting,
      globalFilter: setSaveFilters && isGrouped ? undefined : searchValue,
      grouping,
      expanded,
      columnSizing,
      pagination: manualPagination,
    },
    enableRowSelection,
    enableColumnResizing,
    enableSorting,
    enableGrouping,
    manualPagination: false,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange:
      setSaveFilters && isGrouped ? undefined : setColumnOrder,
    onSortingChange: setSaveFilters && isGrouped ? undefined : setSorting,
    onGlobalFilterChange:
      setSaveFilters && isGrouped ? undefined : setFiltering,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel:
      setSaveFilters && isGrouped ? undefined : getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    columnResizeMode: "onChange",
    meta: {
      updateData,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  useEffect(() => {
    setFilteredData &&
      (grouping.length || !setSaveFilters) &&
      setFilteredData(table.getFilteredRowModel().rows.length);
  }, [table.getFilteredRowModel().rows.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        columnDropdownRef.current &&
        !columnDropdownRef.current.contains(event.target)
      ) {
        setIsColumnDropdownOpen(false);
      }
      if (
        groupByDropdownRef.current &&
        !groupByDropdownRef.current.contains(event.target)
      ) {
        setIsGroupByDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  // Initialize column order when columns change
  useEffect(() => {
    if (enhancedColumns.length > 0) {
      setColumnOrder(enhancedColumns.map((col) => col.accessorKey || col.id));
    }
  }, [enhancedColumns.length]);

  useEffect(() => {
    if (isColumnChange && setSaveFilters)
      setSaveFilters((pre) => ({
        ...pre,
        orderColumnHeaders: table
          .getHeaderGroups()[0]
          .headers.map((v) => v.id)
          .filter((v) => !["select", "sno", "action"].includes(v)),
      }));
  }, [isColumnChange]);

  // Handle row and column drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    // Check if we're dragging a column (column IDs are strings matching column definitions)
    const isColumnDrag = enhancedColumns.some(
      (col) => (col.accessorKey || col.id) === active.id,
    );

    if (isColumnDrag) {
      // Handle column reordering
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id);
        const newIndex = columnOrder.indexOf(over.id);
        const falseKeys = Object.keys(columnVisibility).filter(
          (key) => columnVisibility[key] === false,
        );

        const filterColumnOrder = arrayMove(
          columnOrder,
          oldIndex,
          newIndex,
        ).filter((v) => !["select", "sno", "action", ...falseKeys].includes(v));

        setSaveFilters &&
          setSaveFilters((pre) => ({
            ...pre,
            orderColumnHeaders: falseKeys.length
              ? filterColumnOrder
              : arrayMove(columnOrder, oldIndex, newIndex).filter(
                  (v) => !["select", "sno", "action"].includes(v),
                ),
          }));
        return arrayMove(columnOrder, oldIndex, newIndex);
      });
    } else {
      // Handle row reordering
      const oldIndex = tableData.findIndex(
        (row, index) => index.toString() === active.id,
      );
      const newIndex = tableData.findIndex(
        (row, index) => index.toString() === over.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newData = arrayMove(tableData, oldIndex, newIndex);
        const priorityUpdate = newData.map((v, i) => ({ [v.jobName]: i + 1 }));
        const tableUpdate = newData.map((v, i) => ({ ...v, priority: i + 1 }));
        handleUpdatePriority({ jobNameWithPriority: priorityUpdate });
        setTableData(tableUpdate);
        onDataChange?.(newData);
      }
    }
  };

  useEffect(() => {
    if (enableRowSelection && setSelectedRows) {
      setSelectedRows(
        table.getSelectedRowModel().rows.map(({ original }) => original),
      );
    }
  }, [table.getSelectedRowModel().rows]);

  // Sync external selection -> internal table selection
  // When parent clears selection (selectedRows becomes []), uncheck all table rows.
  useEffect(() => {
    try {
      if (!enableRowSelection) return;
      if (!Array.isArray(selectedRows)) return;

      // If parent cleared selection, clear table selection too
      if (selectedRows.length === 0) {
        [
          table.getRowModel().rows.length
            ? table.getRowModel().rows
            : Object.values(table.getRowModel().rowsById),
        ]
          .flat(1)
          .forEach((row) => {
            if (row.getIsSelected()) {
              row.toggleSelected(false);
            }
          });
        return;
      }
    } catch (err) {
      // swallow sync errors to avoid breaking table
      // console.error('Selection sync error', err);
    }
  }, [selectedRows]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (
      setSaveFilters &&
      (!filtering.length || !saveFilters?.searchText?.length)
    ) {
      setIsFocused(false);
    } else if (!filtering?.length) setIsFocused(false);
  };

  // Get current sort for a column
  const getCurrentSort = (columnId) => {
    const sort = sorting.find((s) => s.id === columnId);
    return sort ? (sort.desc ? "desc" : "asc") : null;
  };

  const handleOpenAdvanceFilterModal = () => {
    setIsAdvanceFilterModalOpen(true);
  };

  const handleCloseAdvanceFilterModal = () => {
    setIsAdvanceFilterModalOpen(false);
  };

  const handleApplyAdvanceFilters = (appliedFilters) => {
    setTableData(appliedFilters);
    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (onPaginationChange)
      onPaginationChange(manualPagination.pageSize, 0, false);

    // setAdvanceFilters(appliedFilters);
  };

  const openShowAddedFilterModal = () => {
    setViewAddedFilter(true);
  };

  const openEmailModal = () => {
    setIsEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setIsEmailModalOpen(null);
  };

  const handleOpenChangeTrackingFilter = () => {
    setIsChangeTrackingFilterOpen(true);
  };

  const handleCloseChangeTrackingFilter = () => {
    setIsChangeTrackingFilterOpen(false);
  };

  const handleApplyChangeTrackingFilter = async (filterConfig) => {
    setSaveFilters &&
      setSaveFilters((pre) => ({
        ...pre,
        xDaysFilter: {
          columnNames: filterConfig.selectedColumns.join(","),
          xDays: filterConfig.days,
        },
        xFilter: true,
      }));
    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (onPaginationChange)
      onPaginationChange(manualPagination.pageSize, 0, false);
  };

  const handleRemoveChangeTrackingFilter = () => {
    setSaveFilters &&
      setSaveFilters((pre) => ({
        ...pre,
        xDaysFilter: null,
        xFilter: false,
      }));

    setManualPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
    if (onPaginationChange)
      onPaginationChange(manualPagination.pageSize, 0, false);
  };

  const handleIconClick = () => {
    setIsModalOpen((pre) => !pre);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openFilterSaveModal = () => {
    if (Object.keys(dashboardData).length) setSaveFilter(true);
  };

  const closeFilterSaveModal = () => {
    setSaveFilter(false);
  };

  const filterDataByColumnVisibility = (data) => {
    if (Object.keys(columnVisibility).length > 0) {
      return data.map((item) => {
        return Object.keys(item)
          .filter(
            (key) =>
              columnVisibility[key] === true ||
              columnVisibility[key] === undefined,
          )
          .reduce((filteredItem, key) => {
            filteredItem[key] = item[key];
            return filteredItem;
          }, {});
      });
    }
    return data;
  };

  const handleOpenAiDialog = async () => {
    if (!isAiSupportedPage || aiOpenFlowBusyRef.current) {
      return;
    }
    aiOpenFlowBusyRef.current = true;
    try {
      const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      const category = dashboardData?.tableType || "generic";
      const basePayload = {
        orgId: user?.orgId || "default-org",
        userId: user?.id || "anonymous",
        pageId,
        category,
        filters: buildAiFilters(),
      };
      setAiError("");
      setChatHistory([]);
      setChatInput("");
      const persistedHidden = loadHiddenInsightIds(user?.id, pageId, category);
      setHiddenInsightIds(persistedHidden);
      setQueuedKpiRequests([]);
      setKpiTitleActions({});
      setAiDialogOpen(true);
      try {
        await clearChatThread(basePayload);
      } catch (error) {
        console.error("Failed to reset AI chat thread on Analyze click:", error);
      }
      await handleRunAnalysis();
    } finally {
      aiOpenFlowBusyRef.current = false;
    }
  };

  const buildAiFilters = () => {
    const dashOid = dashboardData?.objectId;
    const hasDashOid =
      dashOid !== undefined &&
      dashOid !== null &&
      String(dashOid).trim() !== "";
    let objectId;
    if (hasDashOid) {
      objectId = dashOid;
    } else if (ADMIN_AI_OBJECT_SCOPE_PATHS.has(pathname)) {
      const r = selectedObject;
      objectId = r && String(r).trim() !== "" ? r : null;
    } else {
      objectId = dashOid ?? null;
    }
    return {
      tableId,
      viewId,
      jobName: jobName || null,
      /** Register/detailed: dashboardData.objectId; admin lists: Redux object picker; all-object → null. */
      objectId,
      advancedFilters: myData || [],
      dashboardData,
      saveFilters: saveFilters || null,
      tableName: tableName || null,
    };
  };

  const getAiErrorMessage = (error, fallbackMessage) => {
    const errBody = error?.response?.data;
    const detail = errBody?.detail;
    const rawMessage =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((x) => (typeof x === "string" ? x : x?.msg || "")).filter(Boolean).join("; ") ||
            fallbackMessage
          : errBody?.message || error?.message || fallbackMessage;

    const status = error?.response?.status;
    const rateLike =
      status === 429 ||
      /\btoo many requests\b/i.test(rawMessage) ||
      /\brate[\s_-]?limit\b/i.test(rawMessage) ||
      /RateLimitReached/i.test(rawMessage);

    if (rateLike) {
      return "AI is temporarily busy due to rate limits. Please wait about 1 minute and try again.";
    }

    return rawMessage;
  };

  const aiStageMessages = [
    "Reading data from backend APIs...",
    "Pre-processing and cleaning data...",
    "Analyzing data with AI model...",
    "Summarizing insights...",
  ];

  const currentAiStageMessage =
    aiStageMessages[
      Math.max(0, Math.min(aiStage - 1, aiStageMessages.length - 1))
    ] || "Analyzing data...";

  const setKpiAction = (title, action) => {
    const normalized = normalizeKpiTitle(title);
    if (!normalized) return;
    setKpiTitleActions((prev) => ({
      ...prev,
      [normalized]: {
        action,
        title: String(title || normalized),
        at: Date.now(),
      },
    }));
  };

  const buildKpiActionMap = (titles = []) => {
    const out = {};
    (titles || []).forEach((title) => {
      const normalized = normalizeKpiTitle(title);
      if (!normalized) return;
      out[normalized] = {
        action: "add",
        title: String(title || normalized),
        at: Date.now(),
      };
    });
    return out;
  };

  const applyKpiActionOverrides = (result, actionMapOverride = null) => {
    if (!result || !Array.isArray(result.kpis)) return result;
    const actionMap = actionMapOverride || kpiTitleActions || {};
    const nextKpis = (result.kpis || []).filter((kpi) => {
      const key = normalizeKpiTitle(kpi?.title);
      const action = actionMap[key]?.action;
      return action !== "remove";
    });

    Object.values(actionMap).forEach((meta) => {
      if (meta?.action !== "add") return;
      const title = String(meta?.title || "").trim();
      if (!title) return;
      const exists = nextKpis.some((k) => normalizeKpiTitle(k?.title) === normalizeKpiTitle(title));
      if (!exists) {
        nextKpis.push({
          title,
          value: "Requested",
          description: "Added from chat action. Refresh after new data updates for computed value.",
        });
      }
    });
    return { ...result, kpis: nextKpis };
  };

  const composeRefreshPrompt = (basePrompt) => {
    const base = (typeof basePrompt === "string" ? basePrompt : "").trim();
    if (!queuedKpiRequests.length) return base || undefined;
    const kpiBlock =
      "Add/keep these KPI requests in next insights:\n" +
      queuedKpiRequests.map((k, i) => `${i + 1}. ${k}`).join("\n");
    return [base, kpiBlock].filter(Boolean).join("\n\n");
  };

  const handleToggleKpiLine = (kpiTitle, checked) => {
    const title = String(kpiTitle || "").trim();
    if (!title) return;
    if (checked) {
      setQueuedKpiRequests((prev) => {
        if (prev.some((x) => normalizeKpiTitle(x) === normalizeKpiTitle(title))) return prev;
        return [...prev, title];
      });
      setKpiAction(title, "add");
      return;
    }
    setQueuedKpiRequests((prev) => prev.filter((x) => normalizeKpiTitle(x) !== normalizeKpiTitle(title)));
    setKpiAction(title, "remove");
  };

  const handleInsightFeedback = async (insightId, insightType, feedbackType, comment) => {
    if (!isAiSupportedPage) return;
    const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const category = dashboardData?.tableType || "generic";

    const basePayloadForFeedback = {
      orgId: user?.orgId || "default-org",
      userId: user?.id || "anonymous",
      pageId,
      category,
      filters: buildAiFilters(),
    };
    try {
      await submitInsightFeedback({
        ...basePayloadForFeedback,
        kpiId: insightId,
        insightType,
        feedbackType,
        useful: feedbackType === "helpful",
        comment: comment || undefined,
      });
      const hideForSession =
        feedbackType === "irrelevant" ||
        (feedbackType === "not_helpful" && commentImpliesHideInsight(comment));
      if (hideForSession) {
        setHiddenInsightIds((prev) => {
          const next = prev.includes(insightId) ? prev : [...prev, insightId];
          persistHiddenInsightIds(user?.id, pageId, category, next);
          return next;
        });
        toast.success(
          feedbackType === "not_helpful"
            ? "Understood — hiding this for your session. It stays hidden after refresh until you clear insight memory."
            : "Hidden for this session. It will stay hidden until you clear insight memory.",
        );
      } else if (feedbackType === "not_helpful") {
        toast.success(
          "Saved for this session. Use Refresh insights to regenerate with your changes.",
        );
      } else if (feedbackType === "helpful") {
        toast.success("Thanks — we will emphasize deeper follow-ons in this area on the next refresh.");
      }
      if (insightType === "kpi") {
        const match = /^kpi-(\d+)$/.exec(String(insightId || ""));
        const idx = match ? Number(match[1]) : -1;
        const kpiTitle = idx >= 0 ? aiResult?.kpis?.[idx]?.title : null;
        if (kpiTitle) {
          if (feedbackType === "irrelevant" || (feedbackType === "not_helpful" && commentImpliesHideInsight(comment))) {
            setKpiAction(kpiTitle, "remove");
          } else if (feedbackType === "helpful") {
            setKpiAction(kpiTitle, "add");
          }
        }
      }
    } catch (err) {
      console.error("Insight feedback error:", err);
    }
  };

  const handleChatMessageFeedback = async (message, feedbackType) => {
    if (!isAiSupportedPage || !message?.messageId || !feedbackType) return;
    const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const category = dashboardData?.tableType || "generic";
    const payload = {
      orgId: user?.orgId || "default-org",
      userId: user?.id || "anonymous",
      pageId,
      category,
      filters: buildAiFilters(),
      kpiId: message.messageId,
      insightType: "chat_answer",
      feedbackType,
      useful: feedbackType === "helpful",
      comment: undefined,
    };
    try {
      await submitInsightFeedback(payload);
      setChatHistory((prev) =>
        prev.map((item) =>
          item?.messageId === message.messageId ? { ...item, feedbackType } : item
        )
      );
    } catch (err) {
      console.error("Chat answer feedback error:", err);
      toast.error("Could not save chat feedback. Please retry.");
    }
  };

  const handleAddChatAnswerToInsights = async (message) => {
    if (!message?.messageId || message?.addedToInsights) return;
    const raw = String(message?.content || "").trim();
    if (!raw) return;
    const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const category = dashboardData?.tableType || "generic";
    try {
      await submitInsightFeedback({
        orgId: user?.orgId || "default-org",
        userId: user?.id || "anonymous",
        pageId,
        category,
        filters: buildAiFilters(),
        kpiId: message.messageId,
        insightType: "chat_answer",
        feedbackType: "helpful",
        useful: true,
        comment: "Added to insight from chat answer",
      });
    } catch (err) {
      console.error("Add-to-insight feedback error:", err);
      toast.error("Could not persist Add to insight for next analysis.");
      return;
    }
    const titleLine = raw
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean);
    const title = (titleLine || "Chat insight").slice(0, 100);
    setAiResult((prev) => {
      const safePrev = prev && typeof prev === "object" ? prev : {};
      const current = Array.isArray(safePrev.totalInsights) ? safePrev.totalInsights : [];
      if (current.some((x) => String(x?.chatMessageId || "") === message.messageId)) return safePrev;
      return {
        ...safePrev,
        totalInsights: [
          ...current,
          {
            title,
            text: raw.slice(0, 1800),
            severity: "medium",
            chatMessageId: message.messageId,
            source: "chat",
          },
        ],
      };
    });
    setChatHistory((prev) =>
      prev.map((item) =>
        item?.messageId === message.messageId ? { ...item, addedToInsights: true } : item
      )
    );
    toast.success("Added this answer to insight cards.");
  };

  useEffect(() => {
    if (!isAiSupportedPage || !aiDialogOpen) return;
    const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const category = dashboardData?.tableType || "generic";
    const key = aiInsightChatStateKey(user?.id, pageId, category);
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.chatHistory)) return;
      setChatHistory(
        parsed.chatHistory
          .slice(-40)
          .map((m) => ({
            messageId: m?.messageId || buildChatMessageId(),
            role: m?.role === "assistant" ? "assistant" : "user",
            content: String(m?.content || ""),
            insight: m?.insight || null,
            charts: Array.isArray(m?.charts) ? m.charts : [],
            kpisSnapshot: Array.isArray(m?.kpisSnapshot) ? m.kpisSnapshot : [],
            feedbackType: String(m?.feedbackType || ""),
            addedToInsights: Boolean(m?.addedToInsights),
          }))
      );
    } catch {
      // Ignore invalid persisted state.
    }
  }, [aiDialogOpen, isAiSupportedPage, pathname, dashboardData?.tableType, user?.id]);

  useEffect(() => {
    if (!isAiSupportedPage) return;
    const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const category = dashboardData?.tableType || "generic";
    const key = aiInsightChatStateKey(user?.id, pageId, category);
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          chatHistory: chatHistory.slice(-40),
        })
      );
    } catch {
      // Ignore storage quota errors.
    }
  }, [chatHistory, isAiSupportedPage, pathname, dashboardData?.tableType, user?.id]);

  const handleRunAnalysis = async (optionalCustomPrompt, opts) => {
    if (!isAiSupportedPage) {
      setAiError("AI analysis is only available on supported report and register pages.");
      return;
    }
    const overrideModelId = opts?.modelId;
    const effectiveModelId =
      overrideModelId !== undefined && overrideModelId !== null && String(overrideModelId).trim() !== ""
        ? String(overrideModelId).trim()
        : selectedModelId;
    try {
      setAiLoading(true);
      setAiError("");

      const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;

      const payload = {
        orgId: user?.orgId || "default-org",
        userId: user?.id || "anonymous",
        pageId,
        category: dashboardData?.tableType || "generic",
        filters: buildAiFilters(),
        modelId: effectiveModelId || undefined,
        customPrompt: (typeof optionalCustomPrompt === "string" ? optionalCustomPrompt : null)?.trim() || undefined,
        focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
      };

      setAiRequestDebug(payload);
      const result = await analyzeDataset(payload);
      setAiResult(applyKpiActionOverrides(result, opts?.kpiActionMap || null));
      setAiResponseDebug(result);
    } catch (error) {
      console.error("AI analysis error:", error);
      const errBody = error?.response?.data;
      const errorMessage = getAiErrorMessage(
        error,
        "Failed to analyze data with AI. Please try again.",
      );
      setAiResult(null);
      setAiResponseDebug(
        errBody || {
          message: errorMessage,
        },
      );
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunAnalysisRef = useRef(handleRunAnalysis);
  handleRunAnalysisRef.current = handleRunAnalysis;
  const aiResultRef = useRef(aiResult);
  aiResultRef.current = aiResult;

  useEffect(() => {
    if (!isAiSupportedPage) return;
    const pending = consumeGlobalChatInsightNavForRoute(pathname);
    if (!pending) return;

    if (pending.objectId != null && String(pending.objectId).trim() !== "") {
      dispatch(setSelectedObject(String(pending.objectId)));
      if (pending.objectName) dispatch(setSelectedObjectName(String(pending.objectName)));
    } else {
      dispatch(clearSelectedObject());
      dispatch(setSelectedObjectName(""));
    }

    const addedFromGlobal = Array.isArray(pending.addedInsights) ? pending.addedInsights.filter((x) => x && x.text) : [];
    const applyAddedInsights = (base) => {
      if (!addedFromGlobal.length) return base;
      const safeBase = base && typeof base === "object" ? base : {};
      const current = Array.isArray(safeBase.totalInsights) ? safeBase.totalInsights : [];
      const appended = addedFromGlobal.map((item) => ({
        title: String(item.title || "Chat insight").slice(0, 100),
        text: String(item.text || "").slice(0, 1800),
        severity: String(item.severity || "medium"),
        source: "chat",
      }));
      return { ...safeBase, totalInsights: [...current, ...appended] };
    };
    const titles = Array.isArray(pending.kpis) ? pending.kpis.filter(Boolean) : [];
    const actionMap = buildKpiActionMap(titles);
    const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const category = dashboardData?.tableType || "generic";

    const timerId = window.setTimeout(() => {
      const persistedHidden = loadHiddenInsightIds(user?.id, pageId, category);
      setHiddenInsightIds(persistedHidden);
      setQueuedKpiRequests(titles);
      setKpiTitleActions(actionMap);
      setAiDialogOpen(true);
      if (aiResultRef.current) {
        setAiResult((prev) => applyAddedInsights(applyKpiActionOverrides(prev, actionMap)));
        return;
      }
      void handleRunAnalysisRef.current(undefined, { kpiActionMap: actionMap }).then(() => {
        if (addedFromGlobal.length) {
          setAiResult((prev) => applyAddedInsights(prev));
        }
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [pathname, isAiSupportedPage, dispatch, user?.id, dashboardData?.tableType]);

  const userWantsInsightsRefresh = (text) => {
    const t = (text || "").toLowerCase();
    return /\b(refresh|re-analyze|reanalyze|update (the )?dashboard|update (the )?insights|run analysis again|re-run analysis)\b/.test(t);
  };

  const handleRefreshInsights = async () => {
    if (!isAiSupportedPage) return;
    const lastUserMessage = [...chatHistory].reverse().find((m) => m?.role === "user")?.content;
    const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const refreshPrompt = composeRefreshPrompt(lastUserMessage);
    const basePayload = {
      orgId: user?.orgId || "default-org",
      userId: user?.id || "anonymous",
      pageId,
      category: dashboardData?.tableType || "generic",
      filters: buildAiFilters(),
      modelId: selectedModelId || undefined,
      customPrompt: refreshPrompt,
      focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
    };
    await invalidateAnalysisCache(basePayload);
    await handleRunAnalysis(refreshPrompt);
    setQueuedKpiRequests([]);
  };

  const handleChatSend = async () => {
    if (!isAiSupportedPage || !chatInput.trim()) return;
    const userMessage = { role: "user", content: chatInput };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setChatInput("");

    try {
      setChatLoading(true);
      const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      const payload = {
        orgId: user?.orgId || "default-org",
        userId: user?.id || "anonymous",
        pageId,
        category: dashboardData?.tableType || "generic",
        filters: buildAiFilters(),
        messages: newHistory,
        modelId: selectedModelId || undefined,
        focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
      };

      const result = await chatWithData(payload);
      const assistantMessage = {
        messageId: buildChatMessageId(),
        role: "assistant",
        content: result?.answer || "No answer returned from AI.",
        insight: result?.insight || null,
        charts: Array.isArray(result?.charts) ? result.charts : [],
        kpisSnapshot: Array.isArray(result?.insight?.kpis)
          ? result.insight.kpis
          : Array.isArray(aiResult?.kpis)
            ? aiResult.kpis
            : [],
        feedbackType: "",
        addedToInsights: false,
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
      if (userWantsInsightsRefresh(userMessage.content)) {
        const refreshPrompt = composeRefreshPrompt(userMessage.content);
        const basePayload = {
          orgId: user?.orgId || "default-org",
          userId: user?.id || "anonymous",
          pageId,
          category: dashboardData?.tableType || "generic",
          filters: buildAiFilters(),
          modelId: selectedModelId || undefined,
          customPrompt: refreshPrompt,
          focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
        };
        await invalidateAnalysisCache(basePayload);
        await handleRunAnalysis(refreshPrompt);
        setQueuedKpiRequests([]);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMessage = getAiErrorMessage(
        error,
        "Failed to chat with AI. Please try again.",
      );
      setChatHistory((prev) => [
        ...prev,
        { messageId: buildChatMessageId(), role: "assistant", content: errorMessage, feedbackType: "", addedToInsights: false },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearInsight = async () => {
    if (!isAiSupportedPage) {
      setAiError("AI analysis is only available on supported report and register pages.");
      return;
    }
    setChatLoading(true);
    setAiLoading(true);
    setChatHistory([]);
    setChatInput("");
    setAiResult(null);
    setAiRequestDebug(null);
    setAiResponseDebug(null);
    setAiError("");
    setHiddenInsightIds([]);
    setQueuedKpiRequests([]);
    setKpiTitleActions({});
    try {
      const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      const category = dashboardData?.tableType || "generic";
      clearHiddenInsightIds(user?.id, pageId, category);
      const payload = {
        orgId: user?.orgId || "default-org",
        userId: user?.id || "anonymous",
        pageId,
        category,
        filters: buildAiFilters(),
        modelId: selectedModelId || undefined,
      };
      await clearChatSession(payload);
      try {
        sessionStorage.removeItem(aiInsightChatStateKey(user?.id, pageId, category));
      } catch {
        // noop
      }
      await handleRunAnalysis();
      toast.success("Insight memory cleared for this dataset.");
    } catch (error) {
      console.error("AI chat clear error:", error);
      const errBody = error?.response?.data;
      setAiError(
        errBody?.detail ||
          errBody?.message ||
          error?.message ||
          "Failed to clear chat session. Please try again.",
      );
      setAiLoading(false);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAiModelSwitch = async (nextId) => {
    if (nextId === selectedModelId) return;
    setSelectedModelId(nextId);
    if (!isAiSupportedPage || !aiDialogOpen) return;

    setChatLoading(true);
    setAiLoading(true);
    setChatHistory([]);
    setChatInput("");
    setAiResult(null);
    setAiRequestDebug(null);
    setAiResponseDebug(null);
    setAiError("");
    setHiddenInsightIds([]);
    setQueuedKpiRequests([]);
    setKpiTitleActions({});
    try {
      const pageId = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      const category = dashboardData?.tableType || "generic";
      clearHiddenInsightIds(user?.id, pageId, category);
      const payload = {
        orgId: user?.orgId || "default-org",
        userId: user?.id || "anonymous",
        pageId,
        category,
        filters: buildAiFilters(),
        modelId: nextId || undefined,
      };
      await clearChatSession(payload);
      try {
        sessionStorage.removeItem(aiInsightChatStateKey(user?.id, pageId, category));
      } catch {
        // noop
      }
      await handleRunAnalysis(undefined, { modelId: nextId });
      toast.success("Switched model — insights refreshed for this dataset.");
    } catch (error) {
      console.error("AI model switch error:", error);
      const errBody = error?.response?.data;
      setAiError(
        errBody?.detail ||
          errBody?.message ||
          error?.message ||
          "Failed to switch model. Please try again.",
      );
    } finally {
      setChatLoading(false);
      setAiLoading(false);
    }
  };

  const handleDownload = async (option) => {
    if (option === "") return;
    let dataToExport;

    if (pagination) {
      const allSourceData = await fetchAllSourceData();
      dataToExport = filterDataByColumnVisibility(allSourceData || []);
    } else
      dataToExport = filterDataByColumnVisibility(
        table.getFilteredRowModel().rows.map((row) => row.original),
      );

    if (option === "Excel") exportToExcel(pathname, dataToExport);
    if (option === "PDF") exportToPDF(pathname, dataToExport);
    if (option === "CSV") exportToCSV(pathname, dataToExport);
    setIsModalOpen(false);
  };
  return (
    <div className={`space-y-2 ${className}`}>
      <div />

      <div className="flex gap-5 justify-between items-center ms-3 !my-5">
        {enableFilter && (
          <main className="absolute left-6 space-y-1">
            {myData && myData.length > 0 ? (
              <p
                style={{ color: backgroundColor }}
                className="underline cursor-pointer w-fit italic text-sm font-medium"
                onClick={() => openShowAddedFilterModal(true)}
              >
                View Filters
              </p>
            ) : (
              <p className="text-gray-600 text-sm">No filters applied.</p>
            )}

            {saveFilters?.xDaysFilter ? (
              <div className="flex items-center gap-2">
                <span
                  style={{ color: backgroundColor }}
                  className="underline italic text-sm font-medium cursor-pointer mb-2"
                  onClick={handleOpenChangeTrackingFilter}
                >
                  View Days Filters
                </span>
                {/* <button
                  onClick={handleRemoveChangeTrackingFilter}
                  className="text-red-500 hover:text-red-700"
                  title="Remove Changes Filter"
                >
                  <X size={16} />
                </button> */}
              </div>
            ) : null}
          </main>
        )}
        <div className="flex gap-5 items-center mx-3 flex-col sm:flex-row absolute right-5">
          {enableToSearch && (
            <div
              className={`relative transition-all self-end ${
                isFocused ? "sm:w-72 w-60 bg-transparent" : "w-7"
              }`}
            >
              <div
                className="absolute inset-y-0 sm:left-0 flex items-center pl-3 cursor-pointer"
                onClick={handleFocus}
              >
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search..."
                name="search"
                value={filtering}
                className={`w-full py-1 pl-10 sm:pr-4 text-gray-700 outline-none transition-all border rounded-full bg-transparent ${
                  !isFocused && "border-transparent"
                }`}
                onFocus={handleFocus}
                style={{ borderColor: isFocused && backgroundColor }}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSaveFilters &&
                      setSaveFilters((pre) => ({
                        ...pre,
                        searchText: filtering,
                      }));

                    setSearchValue(filtering);
                    if (onPaginationChange) {
                      onPaginationChange(manualPagination.pageSize, 0, false);
                    }
                  }
                }}
                onChange={(e) => {
                  setFiltering(e.target.value);
                  setManualPagination((prev) => ({
                    ...prev,
                    pageIndex: 0,
                  }));
                }}
              />
            </div>
          )}
          <div className="flex gap-5 items-center">
            {/* Column Visibility */}
            {enableColumnVisibility && (
              <div className="relative" ref={columnDropdownRef}>
                <div className="relative">
                  <div
                    className="cursor-pointer flex items-center gap-2 py-1 rounded text-sm"
                    onClick={() =>
                      setIsColumnDropdownOpen(!isColumnDropdownOpen)
                    }
                  >
                    <div className="relative group">
                      <HiMiniViewColumns
                        sx={{ color: textWhiteColor, backgroundColor }}
                        className="cursor-pointer"
                      />
                      <div
                        style={{ backgroundColor }}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        Column
                      </div>
                    </div>
                  </div>
                  {isColumnDropdownOpen && (
                    <div className="absolute left-[-50px] mt-1 border rounded shadow-lg p-3 z-20 min-w-48 bg-white h-72 overflow-scroll">
                      {table
                        .getAllLeafColumns()
                        .filter(
                          (v) =>
                            !["select", "sno", "action", ...grouping].includes(
                              v.id,
                            ),
                        )
                        .map((column) => (
                          <div
                            key={column.id}
                            className="flex items-center gap-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={column.getIsVisible()}
                              onChange={column.getToggleVisibilityHandler()}
                              onClick={() =>
                                setIsColumnChange((pre) => pre + 1)
                              }
                              className="rounded"
                            />
                            <label className="text-sm">{column.id}</label>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {permissionList?.includes(routeName) && enableAdvanceFilter && (
              <div className="relative group">
                <IoFilter
                  sx={{ color: textWhiteColor, backgroundColor }}
                  onClick={handleOpenAdvanceFilterModal}
                  className="cursor-pointer"
                />
                <div
                  style={{ backgroundColor }}
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  Advance Filter
                </div>
              </div>
            )}

            {permissionList?.includes(routeName) &&
              dashboardData.daysFilterShow && (
                <div className="relative group">
                  <Clock
                    style={{ width: 16 }}
                    sx={{ color: textWhiteColor }}
                    onClick={handleOpenChangeTrackingFilter}
                    className="cursor-pointer"
                  />
                  <div
                    style={{ backgroundColor }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    Changes Filter
                  </div>
                </div>
              )}

            {permissionList?.includes(routeName) && enableGroupByFilter && (
              <div className="relative" ref={groupByDropdownRef}>
                <div className="relative">
                  <div
                    className="cursor-pointer flex items-center gap-2 py-1 rounded text-sm"
                    onClick={() =>
                      setIsGroupByDropdownOpen(!isGroupByDropdownOpen)
                    }
                  >
                    <div className="relative group">
                      <FaObjectGroup
                        sx={{ color: textWhiteColor, backgroundColor }}
                        className="cursor-pointer"
                      />
                      <div
                        style={{ backgroundColor }}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        Group by filter
                      </div>
                    </div>
                  </div>
                  {isGroupByDropdownOpen && (
                    <div className="absolute left-[-50px] mt-1 border rounded shadow-lg p-3 z-20 min-w-48 bg-white h-72 overflow-scroll">
                      {table
                        .getHeaderGroups()[0]
                        .headers.map((v) => v.id)
                        .filter((v) => !["select", "sno", "action"].includes(v))
                        .map((column) => (
                          <div
                            key={column}
                            className="flex items-center gap-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={grouping.includes(column)}
                              onChange={() => handleGroupByFromDropdown(column)}
                              className="rounded"
                            />
                            <label className="text-sm">{column}</label>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {permissionList?.includes(routeName) &&
              permissionDetails[routeName]?.hasWriteOnly &&
              enableCreateView && (
                <div className="relative group">
                  <FiSave
                    sx={{ color: textWhiteColor, backgroundColor }}
                    onClick={openFilterSaveModal}
                    className="cursor-pointer"
                  />
                  <div
                    style={{ backgroundColor }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2  text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    Save View
                  </div>
                </div>
              )}

            {permissionList?.includes(routeName) && enableCreateEmail && (
              <div className="relative group">
                <MdOutlineAttachEmail
                  sx={{ color: textWhiteColor, backgroundColor }}
                  onClick={openEmailModal}
                  className="cursor-pointer"
                />
                <div
                  style={{ backgroundColor }}
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2  text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  Send Mail
                </div>
              </div>
            )}

            {permissionList?.includes(routeName) &&
              permissionDetails[routeName]?.hasWriteOnly &&
              enableCreateDashboard && (
                <div className="relative group">
                  <MdOutlineDashboardCustomize
                    sx={{ color: textWhiteColor, backgroundColor }}
                    onClick={() =>
                      navigate(`/data-console/dashboard/new-create`, {
                        state: dashboardData,
                      })
                    }
                    className="cursor-pointer"
                  />
                  <div
                    style={{ backgroundColor }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    Create Dashboard
                  </div>
                </div>
              )}
            {enableDownload &&
              (permissionList?.includes(routeName) || isDownload) && (
                <div className="flex items-center gap-3">
                  <div
                    className="relative inline-block"
                    ref={downloadDropdownRef}
                  >
                    <FiDownload
                      className="cursor-pointer"
                      onClick={handleIconClick}
                      size={24}
                    />

                    {isModalOpen && (
                      <div className="absolute top-full right-0 z-20  mt-2 bg-white border rounded-md shadow-md">
                        <ul className="py-2">
                          {options.map((option) => (
                            <li
                              key={option}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                handleDownload(option);
                              }}
                            >
                              {option}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {showAnalyzeButton && (
                    <div className="relative group">
                      <div className="rounded-xl p-1.5 ring-1 ring-violet-200/70 bg-white/90 shadow-sm hover:ring-violet-400/80 hover:bg-violet-50/60 transition-all">
                        <FiZap
                          sx={{ color: textWhiteColor, backgroundColor }}
                          className="cursor-pointer text-violet-600"
                          onClick={handleOpenAiDialog}
                          size={24}
                        />
                      </div>
                      <div
                        style={{ backgroundColor }}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2  text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        AI insights & chat
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : data?.length ? (
        <div
          className={`${
            className === "relative" ? "" : "!mb-[70px] z-10"
          } relative`}
          ref={dropdownContainer}
          // className="overflow-auto border rounded-lg"
        >
          {/* Column Options Dropdown */}
          <ColumnOptionsDropdown
            isOpen={dropdownState.isOpen}
            onClose={() =>
              setDropdownState({
                isOpen: false,
                column: null,
                position: { top: 0, left: 0 },
              })
            }
            column={dropdownState.column}
            position={dropdownState.position}
            onSortAsc={handleSortAsc}
            onSortDesc={handleSortDesc}
            onGroupBy={handleGroupBy}
            onFilter={handleFilter}
            currentSort={
              dropdownState.column
                ? getCurrentSort(dropdownState.column.id)
                : null
            }
            isGrouped={
              dropdownState.column
                ? grouping.includes(dropdownState.column.id)
                : false
            }
            isFilterActive={
              dropdownState.column
                ? isColumnFilterActive(dropdownState.column.id)
                : false
            }
          />

          <ColumnFilterDropdown
            isOpen={filterDropdownState.isOpen}
            onClose={() =>
              setFilterDropdownState({
                isOpen: false,
                column: null,
                position: { top: 0, left: 0 },
              })
            }
            column={filterDropdownState.column}
            position={filterDropdownState.position}
            data={data}
            onApplyFilter={handleApplyColumnFilter}
            columnFilters={columnFilters}
            setSaveFilters={setSaveFilters}
            jobName={jobName}
            pathname={pathname}
            viewId={viewId}
            tableDataSource={
              dashboardData.tableType === "original-source" ? "AC" : "DC"
            }
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-white">
                    {enableRowOrdering && (
                      <th
                        style={{
                          background: backgroundColor,
                          color: layoutTextColor,
                          width: 10,
                        }}
                        // className="py-3 text-left text-xs font-medium uppercase tracking-wider"
                      />
                    )}
                    <SortableContext
                      items={columnOrder}
                      strategy={horizontalListSortingStrategy}
                    >
                      {headerGroup.headers.map((header) => (
                        <DraggableTableHeader
                          key={header.id}
                          backgroundColor={backgroundColor}
                          enableColumnResizing={enableColumnResizing}
                          layoutTextColor={layoutTextColor}
                          header={header}
                          onHeaderClick={handleColumnHeaderClick}
                          sorting={sorting}
                          enableFilter={enableFilter}
                          enableColumnOrdering={enableColumnOrdering}
                        />
                      ))}
                    </SortableContext>
                  </tr>
                ))}
              </thead>
              <tbody className="relative z-[9px]">
                <SortableContext
                  items={tableData.map((row, index) => index.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {[
                    table.getRowModel().rows.length
                      ? table.getRowModel().rows
                      : Object.values(table.getRowModel().rowsById),
                  ]
                    .flat(1)
                    .map((row, index) => {
                      if (enableRowOrdering) {
                        return (
                          <SortableRow
                            key={row.id}
                            row={{ id: index.toString() }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-4 py-2"
                                style={{ width: cell.column.getSize() }}
                              >
                                {cell.getIsGrouped() ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={row.getToggleExpandedHandler()}
                                      className="p-1 hover:bg-gray-200 rounded"
                                    >
                                      {row.getIsExpanded() ? (
                                        <ChevronDown size={16} />
                                      ) : (
                                        <ChevronRight size={16} />
                                      )}
                                    </button>
                                    {flexRender(
                                      cell.column.id,
                                      cell.getContext(),
                                    )}
                                    {"."}
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}{" "}
                                    ({getUnifiedGroupCount(row)})
                                  </div>
                                ) : cell.getIsAggregated() ? (
                                  flexRender(
                                    cell.column.columnDef.aggregatedCell ??
                                      cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )
                                ) : cell.getIsPlaceholder() ? null : (
                                  flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )
                                )}
                              </td>
                            ))}
                          </SortableRow>
                        );
                      } else {
                        return (
                          <tr
                            key={row.id}
                            className="border-b bg-white hover:bg-gray-50"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-4 py-2"
                                style={{ width: cell.column.getSize() }}
                              >
                                {cell.getIsGrouped() ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={row.getToggleExpandedHandler()}
                                      className="p-1 hover:bg-gray-200 rounded"
                                    >
                                      {row.getIsExpanded() ? (
                                        <ChevronDown size={16} />
                                      ) : (
                                        <ChevronRight size={16} />
                                      )}
                                    </button>
                                    {flexRender(
                                      cell.column.id,
                                      cell.getContext(),
                                    )}
                                    {"."}
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}{" "}
                                    ({getUnifiedGroupCount(row)})
                                  </div>
                                ) : cell.getIsAggregated() ? null : cell.getIsPlaceholder() ? null : ( // ) //   cell.getContext() //     cell.column.columnDef.cell, //   cell.column.columnDef.aggregatedCell ?? // flexRender(
                                  flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      }
                    })}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )}

      {/* Pagination */}
      {enablePagination && (
        <div
          className={`${
            className === "relative"
              ? "flex justify-end"
              : "absolute bottom-[20px] right-8"
          } py-3 bg-white rounded-b-lg`}
          style={{ marginBottom: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <div className="sm:text-sm text-xs">Rows per page:</div>
            <select
              value={
                pagination ? pagination.pageSize : manualPagination.pageSize
              }
              onChange={(e) => {
                setManualPagination({
                  pageSize: Number(e.target.value),
                  pageIndex: 0,
                });
                if (onPaginationChange) {
                  onPaginationChange(Number(e.target.value), 0);
                }
              }}
              className="rounded px-2 py-1 sm:text-sm text-xs mr-3"
            >
              {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              {pagination ? (
                <span className="sm:text-sm text-xs text-gray-700">
                  {pagination.pageIndex * pagination.pageSize + 1} -{" "}
                  {Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    totalRecords
                      ? totalRecords
                      : table.getFilteredRowModel().rows.length,
                  )}{" "}
                  of{" "}
                  {totalRecords
                    ? totalRecords
                    : table.getFilteredRowModel().rows.length}
                </span>
              ) : (
                <span className="sm:text-sm text-xs text-gray-700">
                  {manualPagination.pageIndex * manualPagination.pageSize + 1} -{" "}
                  {Math.min(
                    (manualPagination.pageIndex + 1) *
                      manualPagination.pageSize,
                    totalRecords
                      ? totalRecords
                      : table.getFilteredRowModel().rows.length,
                  )}{" "}
                  of{" "}
                  {totalRecords
                    ? totalRecords
                    : table.getFilteredRowModel().rows.length}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                if (onPaginationChange) {
                  onPaginationChange(
                    pagination.pageSize,
                    pagination.pageIndex - 1,
                  );
                }
                setManualPagination((prev) => ({
                  ...prev,
                  pageIndex: prev.pageIndex - 1,
                }));
              }}
              disabled={
                pagination
                  ? pagination.pageIndex == 0 || grouping.length
                  : !table.getCanPreviousPage()
              }
              className="sm:px-2 px-1 py-1 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                if (onPaginationChange) {
                  onPaginationChange(
                    pagination.pageSize,
                    pagination.pageIndex + 1,
                  );
                }
                setManualPagination((prev) => ({
                  ...prev,
                  pageIndex: prev.pageIndex + 1,
                }));
              }}
              disabled={
                pagination
                  ? pagination.pageIndex + 1 >=
                      Math.ceil(
                        (totalRecords ||
                          table.getFilteredRowModel().rows.length) /
                          pagination.pageSize,
                      ) || grouping.length
                  : !table.getCanNextPage()
              }
              className="sm:px-2 px-1 py-1 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
      {isAdvanceFilterModalOpen && (
        <AdvanceFilter
          isOpen={isAdvanceFilterModalOpen}
          onClose={handleCloseAdvanceFilterModal}
          onApplyFilters={handleApplyAdvanceFilters}
          originalData={tableData}
          sourceData={data}
          fieldsArray={columns.map((v) => v.accessorKey)}
          setSaveFilters={setSaveFilters}
          jobName={jobName}
          tableName={tableName}
          tableDataSource={
            dashboardData.tableType === "original-source" ? "AC" : "DC"
          }
          availableTables={availableTables}
        />
      )}
      <ViewFiltersModal
        isFiltersModalOpen={!!viewAddedFilter}
        CloseFiltersModal={() => setViewAddedFilter(false)}
        onApplyFilters={handleApplyAdvanceFilters}
        sourceData={data}
      />
      <EmailModal
        routeName={routeName}
        jobName={jobName}
        tableName={tableName}
        viewId={viewId}
        isEmailModalOpen={isEmailModalOpen}
        CloseEmailModal={closeEmailModal}
      />

      <ChangeTrackingFilter
        isOpen={isChangeTrackingFilterOpen}
        onClose={handleCloseChangeTrackingFilter}
        fieldsArray={
          columns?.filter((col) => col.header).map((col) => col.header) || []
        }
        onApplyFilter={handleApplyChangeTrackingFilter}
        tableName={tableName}
        onRemoveFilter={handleRemoveChangeTrackingFilter}
        currentFilter={{
          xDaysFilter: saveFilters?.xDaysFilter || null,
          xFilter: saveFilters?.xFilter || false,
        }}
      />

      <Dialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        slotProps={{
          root: { sx: { zIndex: 1400 } },
          backdrop: { sx: { zIndex: 1399 } },
          paper: {
            className:
              "rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col max-h-[min(90vh,calc(100dvh-48px))]",
            sx: {
              backgroundImage: "linear-gradient(180deg, #fafafa 0%, #ffffff 120px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <DialogTitle className="!flex !shrink-0 !flex-row !items-start !justify-between !gap-3 !pr-2 !pb-3 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Sparkles className="text-white" size={22} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <span className="block text-lg font-semibold tracking-tight leading-tight">AI insights</span>
              <span className="block text-xs font-normal text-violet-100/95 mt-1 leading-snug">
                Structured analysis for this grid, then conversational follow-up on the same data.
              </span>
            </div>
          </div>
          <IconButton
            size="small"
            onClick={() => setAiDialogOpen(false)}
            aria-label="Close AI Insights"
            sx={{ ml: 0, color: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          className="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !border-slate-200/80 !bg-slate-50/30 !p-0"
        >
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200/70 bg-slate-50/95 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-sm z-[8]">
            {aiModels.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200, flex: "1 1 200px", maxWidth: "100%" }}>
                <InputLabel id="ai-model-label">Model</InputLabel>
                <Select
                  labelId="ai-model-label"
                  value={selectedModelId || aiModels[0]?.id || ""}
                  label="Model"
                  onChange={(e) => handleAiModelSwitch(e.target.value)}
                >
                  {aiModels.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.label || m.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <div className="flex flex-wrap items-center gap-2 min-w-0 sm:ml-auto">
              <Button
                variant="contained"
                size="small"
                onClick={handleRefreshInsights}
                disabled={aiLoading}
                sx={{
                  borderRadius: "999px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 1.8,
                  boxShadow: "none",
                  background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                  "&:hover": {
                    boxShadow: "0 6px 16px rgba(59,130,246,0.28)",
                  },
                }}
              >
                Refresh insights{queuedKpiRequests.length ? ` (${queuedKpiRequests.length})` : ""}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearInsight}
                disabled={chatLoading && chatHistory.length === 0}
                sx={{
                  borderRadius: "999px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 1.8,
                  borderColor: "#fecaca",
                  color: "#b91c1c",
                  backgroundColor: "#fff1f2",
                  "&:hover": {
                    borderColor: "#fca5a5",
                    backgroundColor: "#ffe4e6",
                  },
                }}
              >
                Clear memory
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [scrollbar-gutter:stable]">
          {aiError && (
            <div
              className="mb-4 flex gap-3 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-900 shadow-sm"
              role="alert"
            >
              <span className="shrink-0 font-semibold">Error</span>
              <span className="leading-relaxed">{aiError}</span>
            </div>
          )}
          {!aiError && aiLoading && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-violet-100 bg-white px-5 py-8 text-sm text-slate-600 shadow-sm">
              <CircularProgress size={28} sx={{ color: "#7c3aed" }} />
              <div>
                <div className="font-semibold text-slate-800">Working on your analysis</div>
                <div className="text-slate-600 mt-0.5">{currentAiStageMessage}</div>
              </div>
            </div>
          )}
          {!aiLoading && aiResult && (
            <AiInsightContent
              aiResult={aiResult}
              pathname={pathname}
              onInsightFeedback={handleInsightFeedback}
              hiddenInsightIds={hiddenInsightIds}
              drillDown={aiInsightDrillDown}
            />
          )}
          <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 md:p-5 shadow-sm ring-1 ring-slate-100/80">
            <div className="flex items-center gap-2 mb-3 text-slate-800">
              <MessageSquareText className="text-violet-600 shrink-0" size={20} strokeWidth={1.75} aria-hidden />
              <h3 className="font-semibold text-base">Chat with this data</h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mb-4">
              Follow-up questions use the same session context as the insights above. Use{" "}
              <span className="font-medium text-slate-600">Refresh insights</span> above to regenerate analysis, or{" "}
              <span className="font-medium text-slate-600">Clear memory</span> to reset chat for this session.
            </p>
            <div className="min-h-[300px] max-h-[380px] overflow-y-auto rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-4 mb-3 shadow-inner text-sm [scrollbar-width:thin]">
              {chatHistory.length === 0 && (
                <div className="text-slate-500 text-sm py-10 text-center px-4 leading-relaxed max-w-md mx-auto">
                  <span className="block text-violet-600/90 font-medium mb-1">Start the conversation</span>
                  Try “What changed since the last import?” or “Which rows look risky and why?”
                </div>
              )}
              {chatHistory.map((m, idx) => (
                <div
                  key={idx}
                  className={`mb-3 last:mb-0 p-3 rounded-xl ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-sky-50 to-blue-50/80 border border-sky-200/60 text-sky-950 ml-3 sm:ml-8 shadow-sm"
                      : "bg-white border border-slate-200/90 text-slate-800 mr-3 sm:mr-8 shadow-sm"
                  }`}
                >
                  {m.role === "user" ? (
                    <>
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-sky-800/80 block mb-1.5">
                        You
                      </span>
                      <span className="whitespace-pre-wrap break-words block leading-relaxed">{m.content}</span>
                    </>
                  ) : (
                    <AiChatAssistantMessage
                      message={m}
                      kpiTitleActions={kpiTitleActions}
                      onToggleKpiLine={handleToggleKpiLine}
                      onMessageFeedback={handleChatMessageFeedback}
                      onAddToInsight={handleAddChatAnswerToInsights}
                      showContextFromInsights={false}
                      showAddToDashboardKpis={false}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-stretch">
              <input
                type="text"
                className="flex-1 border border-slate-300/90 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 outline-none transition bg-white shadow-sm placeholder:text-slate-400"
                placeholder="Ask anything about this table…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                disabled={chatLoading}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleChatSend}
                disabled={chatLoading}
                sx={{
                  minWidth: 92,
                  height: "42px",
                  minHeight: "42px",
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                  boxShadow: "none",
                  "&:hover": { boxShadow: "0 6px 16px rgba(59,130,246,0.28)" },
                }}
              >
                {chatLoading ? "Sending…" : "Send"}
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Focus columns (optional)</label>
              <Autocomplete
                multiple
                size="small"
                options={aiColumnCandidates}
                value={aiFocusColumns}
                onChange={(_, newValue) => setAiFocusColumns(newValue || [])}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search and select columns to emphasize…"
                    variant="outlined"
                  />
                )}
                sx={{ "& .MuiOutlinedInput-root": { py: 0.5, borderRadius: "12px", bgcolor: "#fff" } }}
              />
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Shapes preprocessing and insights. Feedback you give on cards is also remembered for this session.
              </p>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {saveFilter && (
        <SaveFilterModal
          jobName={jobName}
          closeFilterSaveModal={closeFilterSaveModal}
          saveFilter={saveFilter}
          filters={{ filterExpression: saveFilters?.filterExpression }}
          folderData={folderData}
          dataSource={
            dashboardData?.tableType === "original-source" ? "AC" : "DC"
          }
          tableName={dashboardData?.tableName}
          hideFields={tableName !== "Register"}
        />
      )}
    </div>
  );
};

export default memo(DataTable);
{
  /* <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              {'<<'}
            </button> */
}
{
  /* <span className="flex items-center gap-2 text-sm">
              Page{" "}
              <input
                type="number"
                value={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                className="border rounded w-16 px-2 py-1 text-center"
              />{" "}
              of {table.getPageCount()}
            </span> */
}
{
  /* <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              {'>>'}
            </button> */
}
