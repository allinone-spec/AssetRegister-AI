import { useCallback, useEffect, useRef, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import PageLayout from "./PageLayout";
import {
  deleteRequest,
  getCommonRegisterRequest,
  getRequest,
} from "../../Service/Console.service";
import {
  deleteRequest as DataDeleteRequest,
  getRequest as dataGetRequest,
} from "../../Service/api.service";
import { useDispatch, useSelector } from "react-redux";
import { setHeadingTitle } from "../../redux/Slices/HeadingTitle";
// import { useTheme } from "../../ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";
import { MdOutlineAddCircleOutline } from "react-icons/md";
import { DeleteConfirm } from "./DeleteConfirm";
import toast from "react-hot-toast";
import { patchRequest, postDataRequest } from "../../Service/admin.save";
import DataTable from "./DataTable";
import { setFilters } from "../../redux/Slices/AdvancedFilterSlice";
import {
  filterKey,
  scheduleTypeEnum,
  tableNameEnum,
} from "../core/DataConsole/data";
import { EmailModal } from "./EmailModal";
import { PlusIcon } from "lucide-react";
import GridButton from "./GridButton";
import CommonButton from "./CommonButton";
import { SavedJobDrawer } from "./sideDrawer/SavedJobDrawer";

const importStatusHandler = async (selectedRows) => {
  const jobNames = selectedRows.map((r) => r.jobName).join(", ");
  const statusResponse = await postDataRequest(
    `/Status/getMultipleJObNames?jobNameswithCommasSeperated=${jobNames}`,
  );
  if (statusResponse?.status === 200) {
    const runningJobs = statusResponse.data
      .filter((status) => status.status.toLowerCase() === "running")
      .map((job) => job.jobName);

    // Filter out running jobs from selected rows
    const alreadyRunningJobs = selectedRows.filter((row) =>
      runningJobs.includes(row.jobName),
    );

    if (alreadyRunningJobs.length > 0) {
      toast.error(
        `uncheck the job because it’s currently running: ${alreadyRunningJobs
          .map((job) => job.jobName)
          .join(", ")}`,
      );
      // Remove running jobs from selection
      // setSelectedRows(
      //   selectedRows.filter((row) => !runningJobs.includes(row.jobName))
      // );
      return true;
    } else return false;
  }
};

// Helper function to check if a single job is disabled
export const isJobDisabled = (job) => {
  return (
    job?.disable === true ||
    (typeof job?.disable === "string" && job.disable.toLowerCase() === "yes")
  );
};

const checkDisabledJobs = (selectedRows) => {
  // Check if any selected jobs are disabled
  const disabledJobs = selectedRows.filter((job) => isJobDisabled(job));

  if (disabledJobs.length > 0) {
    toast.error(
      `Please uncheck the disabled job(s): ${disabledJobs
        .map((job) => job.jobName)
        .join(", ")}`,
    );
    return true;
  }
  return false;
};

const handleRunSelectedJobs = async (
  selectedRows,
  setSelectedRows,
  setRunLoading,
) => {
  if (!selectedRows?.length) return;

  setRunLoading(true);
  try {
    const hasDisabledJobs = checkDisabledJobs(selectedRows);
    if (hasDisabledJobs) {
      setRunLoading(false);
      return;
    }

    const jobsAreRunning = await importStatusHandler(selectedRows);
    if (jobsAreRunning) {
      setRunLoading(false);
      return;
    }

    // Build per-row requests based on jobType
    const runRequests = selectedRows.map((row) => {
      const type = String(row?.jobType || row?.type || "").toLowerCase();

      // default endpoint and payload
      let endpoint = `/jobSchedule/runJob`;
      const payload = {
        jobName: row?.jobName,
        postScript: row.postScript || "",
      };

      switch (type) {
        case "active-directory":
        case "activedirectory":
          // endpoint = `/activedirectory/write-datarunJob`;
          break;
        case "googlecloud":
          // endpoint = `/googleCloud/runJob`;
          break;
        case "aws":
        case "aws-vm":
          // endpoint = `/aws/runJob`;
          break;
        case "custom-api":
        case "custom":
          // endpoint = `/customAPI/readData`;
          break;
        case "flat-file-csv":
        case "csv":
        case "xlsx":
          // endpoint = `/file/runNow`;
          break;
        case "flexera":
          // endpoint = `/flexera/runJob`;
          break;
        case "azure":
          // endpoint = `/azure/runJob`;
          break;
        case "sql":
          // endpoint = `/sql/runJob`;
          break;
        case "itune":
          // endpoint = `/flexera/runJob`;
          break;
        case "servicenow":
        case "serviceNow":
          // endpoint = `/serviceNow/runJob`;
          break;
        case "windowdefender":
        case "ms-defender":
          // endpoint = `/windowDefender/runJob`;
          break;
        default:
          toast.error(`Sorry, no matching job type for ${type}`);
      }

      // Use postDataRequest for all endpoints; some expect path params, others body
      return postDataRequest(endpoint, payload);
    });

    const results = await Promise.all(runRequests);

    const successCount = results.filter(
      (r) => r && (r.status === 200 || r.status === 201),
    ).length;

    if (successCount === selectedRows.length) {
      toast.success(
        selectedRows.length <= 1
          ? "Job triggered successfully"
          : `${selectedRows.length} job(s) triggered successfully`,
      );
    } else if (successCount > 0) {
      toast.success(
        `${successCount} of ${selectedRows.length} job(s) triggered`,
      );
    }
    // refresh list and clear selection
    // fetchJobs();
    setSelectedRows([]);
  } catch (error) {
    console.error(error);
    toast.error(
      error?.response?.data?.error || error?.message || "Failed to run job(s)",
    );
  } finally {
    setRunLoading(false);
  }
};

const handleExecuteASelectedARMapping = async (
  selectedRows,
  setSelectedRows,
  setRunLoading,
) => {
  if (!selectedRows?.length) return;
  setRunLoading(true);

  try {
    const hasDisabledJobs = checkDisabledJobs(selectedRows);
    if (hasDisabledJobs) {
      setRunLoading(false);
      return;
    }

    const jobsAreRunning = await importStatusHandler(selectedRows);
    if (jobsAreRunning) {
      setRunLoading(false);
      return;
    }
    // Process each selected row individually to get their specific mapping data
    const runRequests = await Promise.all(
      selectedRows.map(async (selectedRow) => {
        try {
          const [columnsResponse, mappingResponse] = await Promise.all([
            getRequest(`/table/${selectedRow.ACTableName}/getColumns`),
            selectedRow.filterId
              ? getRequest(`/filter/${selectedRow.filterId}/get`)
              : Promise.resolve(null),
          ]).finally(() => setSelectedRows([]));

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

            // Process rows for this specific selected item
            const currentRowsData = columns.map((col) => {
              const row = {
                acColumnName: col,
                ignoreInDC: "No",
                dcDatatype: "",
                mappedColumn: "",
                isPrimaryKey: false,
                isSecondaryKey: false,
              };

              if (processedMappingData.filterId) {
                const columnName = row.acColumnName;

                if (processedMappingData.deleteColumns.includes(columnName))
                  row.ignoreInDC = "Yes";

                if (columnName === processedMappingData.primaryKey)
                  row.isPrimaryKey = true;

                if (columnName === processedMappingData.secondaryKey)
                  row.isSecondaryKey = true;

                const dataTypeChange =
                  processedMappingData.changeDataTypeColumns.find(
                    (item) => item.columnName === columnName,
                  );

                if (dataTypeChange) {
                  row.dcDatatype = dataTypeChange.newDataType;
                  if (
                    dataTypeChange.newDataType === "DATETIME" &&
                    dataTypeChange.formattedDateCode
                  )
                    row.formattedDateCode = dataTypeChange.formattedDateCode;
                }

                const renamedColumn = processedMappingData.renameColumns.find(
                  (item) => item.oldName === columnName,
                );
                if (renamedColumn) row.mappedColumn = renamedColumn.newName;
              }

              return row;
            });

            // Create payload using this specific row's data
            const payload = {
              tableName: selectedRow.ACTableName,
              JobId: selectedRow.id,
              jobName: selectedRow.jobName,
              dataTypeChanges: currentRowsData
                .filter((row) => row.dcDatatype && row.ignoreInDC === "No")
                .map((row) => ({
                  columnName: row.acColumnName,
                  newDataType: row.dcDatatype,
                  formattedDateCode: row.formattedDateCode,
                })),
              ignoreColumns: currentRowsData
                .filter((row) => row.ignoreInDC === "Yes")
                .map((row) => row.acColumnName),
              renameColumns: currentRowsData
                .filter((row) => row.mappedColumn)
                .map((row) => ({
                  oldName: row.acColumnName,
                  newName: row.mappedColumn,
                })),
              primaryKey:
                currentRowsData.find((row) => row.isPrimaryKey)?.acColumnName ||
                "",
              secondaryKey:
                currentRowsData.find((row) => row.isSecondaryKey)
                  ?.acColumnName || "",
            };
            return payload;
            // return postDataRequest("/filter/execute", payload);
          }
        } catch (error) {
          console.error(`Error processing row ${selectedRow.id}:`, error);
          return null;
        } finally {
          setSelectedRows([]);
        }
      }),
    );

    // Filter out any null results from failed requests
    const validRequests = runRequests.filter((request) => request !== null);

    const results = await postDataRequest(
      "/filter/executeMultiple",
      validRequests,
    );

    toast.success(
      selectedRows.length <= 1
        ? "Job triggered successfully"
        : `${selectedRows.length} job(s) triggered successfully`,
    );

    setSelectedRows([]);
  } catch (error) {
    console.error(error);
    toast.error(
      error?.response?.data?.error || error?.message || "Failed to run job(s)",
    );
  } finally {
    setRunLoading(false);
  }
};

const handleExecuteSelectedARRule = async (
  selectedRows,
  setSelectedRows,
  setRunLoading,
) => {
  if (!selectedRows?.length) return;

  setRunLoading(true);
  try {
    const hasDisabledJobs = checkDisabledJobs(selectedRows);
    if (hasDisabledJobs) {
      setRunLoading(false);
      return;
    }

    const jobsAreRunning = await importStatusHandler(selectedRows);
    if (jobsAreRunning) {
      setRunLoading(false);
      return;
    }

    // Process each selected row to get complete rule data and build payloads array
    const rulePayloads = await Promise.all(
      selectedRows.map(async (row) => {
        try {
          // Fetch complete rule data for this row
          const response = await getRequest(
            `/rules/get?objectId=${row.object}`,
          );

          if (response?.status !== 200) {
            throw new Error(`Failed to fetch rule data for ${row.jobName}`);
          }

          // Filter and parse the rule data for this specific ruleId
          const data = response.data
            .filter((v) => v.ruleId == row.ruleId)
            .map((v) => JSON.parse(v.ruleRequest));

          // Transform the data into queries format (same as ARRulesConfig)
          const queries = data.flat(1).map((v) => ({
            rule: v.ruleRequest.RuleName,
            conditions:
              v.ruleRequest?.Conditions?.map((condition, index) => ({
                // Ensure condition field is preserved for applicable rules
                ...(index > 0 &&
                  v.ruleRequest.RuleName !== "UniqueSelectedColumnData" && {
                    condition: condition.seperatedOperator || "AND",
                  }),
                columnnames: condition.columnnames || [],
                operator: condition.operator || "",
                value: condition.value || "",
                comparingColumnName: condition.comparingColumnName || "",
                referenceColumn: condition.referenceColumn || "",
              })) || [],
          }));

          // Generate payload using the same logic as ARRulesConfig handleSubmit
          const newRuleSelects = queries.map((query, queryIndex) => ({
            orderNumber: queryIndex + 1,
            ruleRequest: {
              RuleName: query.rule || "primaryKey",
              tableName: row.DCTableName,
              ...(query.rule !== "primaryKey" &&
                query.rule !== "secondaryKey" &&
                query.rule !== "primaryAndSecondary" && {
                  Conditions: query.conditions.map((rule, index) => ({
                    // Handle ColumnLatestData rule differently
                    ...(query.rule === "ColumnLatestData"
                      ? {
                          referenceColumn: rule.referenceColumn || [],
                          comparingColumnName: rule.comparingColumnName || "",
                        }
                      : {
                          // Existing logic for other rules
                          ...(index > 0 &&
                            query.rule !== "UniqueSelectedColumnData" && {
                              seperatedOperator: rule.condition || "AND",
                            }),
                          columnnames: rule.columnnames || [],
                          ...((query.rule === "ColumnConditionNotSatisfied" ||
                            query.rule === "ColumnConditionSatisfied") && {
                            operator: rule.operator || "",
                            value: rule.value || "",
                          }),
                        }),
                  })),
                }),
              jobName: row.jobName,
            },
          }));

          return {
            jobId: Number(row.jobId || row.id),
            ruleSelects: newRuleSelects,
          };
        } catch (error) {
          console.error(`Error processing rule ${row.ruleId}:`, error);
          return null;
        }
      }),
    );

    // Filter out any null results from failed requests
    const validPayloads = rulePayloads.filter((payload) => payload !== null);

    if (validPayloads.length === 0) {
      toast.error("No valid rules to execute");
      return;
    }

    // Execute all rules with a single API call using the new multiple endpoint
    const result = await postDataRequest(
      "/rules/executeRules/multiple",
      validPayloads,
    );

    if (result?.status === 200 || result?.status === 201) {
      toast.success(
        selectedRows.length <= 1
          ? "AR Rule executed successfully"
          : `${selectedRows.length} AR Rule(s) executed successfully`,
      );
    }

    // Clear selection
    setSelectedRows([]);
  } catch (error) {
    console.error(error);
    toast.error(
      error?.response?.data?.error ||
        error?.message ||
        "Failed to execute AR Rule(s)",
    );
  } finally {
    setRunLoading(false);
  }
};

function hexToRgb(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ].join(",");
}

export const rgb = hexToRgb("#6f2fe1");
export const D = {
  bg: "#f7f5ff",
  surface: "#ffffff",
  border: `rgba(${rgb},0.12)`,
  text: "#1a1028",
  sub: "#6b7280",
  faint: "#9ca3af",
  card: "#ffffff",
  navBg: "#ffffff",
  inputBg: "#f8f6ff",
  shadow: `0 2px 16px rgba(${rgb},0.07)`,
};

export const Commom_Saved_Job = ({
  heading,
  path,
  setIsEditMode,
  routeName,
}) => {
  const [editJob, setEditJob] = useState(false);
  const [scheduleJobList, setScheduleJobList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [view, setView] = useState("table");
  const [runLoading, setRunLoading] = useState(false);
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultipleModalOpen, setIsMultipleModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [openDrawer, setOpenDrawer] = useState(null);
  // const [isEmailModalOpen, setIsEmailModalOpen] = useState(null);
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [deleteCheckValue, setDeleteCheckValue] = useState({
    job: false,
    AcDcTable: false,
    dashboards: false,
    savedViews: false,
  });
  const [saveFilters, setSaveFilters] = useState();
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isGrouped, setIsGrouped] = useState(false);
  const [isFiltersLoaded, setIsFiltersLoaded] = useState(false);
  const fetchJobsRef = useRef(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );
  // console.log("heading", heading)
  const dispatch = useDispatch();

  const tableName =
    routeName === "Saved Jobs"
      ? `${filterKey.SAVEDJOBS}_${localStorage.getItem("user-id")}`
      : routeName === "AR Mapping"
        ? `${filterKey.ARMAPPING}_${localStorage.getItem("user-id")}`
        : `${filterKey.ARRULES}_${localStorage.getItem("user-id")}`;

  useEffect(() => {
    dispatch(
      setHeadingTitle(
        location.search
          ? `${location.state?.heading} / ${location.state?.jobName}`
          : heading,
      ),
    );
  }, [heading, location]);

  useEffect(() => {
    getCommonRegisterRequest(`/AssetRegister/filterRequest/${tableName}/get`)
      .then(({ data }) => {
        setSaveFilters(data);
        data?.filterExpression &&
          dispatch(
            setFilters(
              data.filterExpression?.conditions?.map((v) => ({
                column: v.field,
                operator: data.filterExpression.logic,
                condition: v.operator,
                value: v.value,
              })),
            ),
          );
        setIsFiltersLoaded(true);
      })
      .catch(() => {
        setSaveFilters({
          tableName: tableNameEnum.IMPORTSTATUS,
        });
        setIsFiltersLoaded(true);
      });
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  useEffect(() => {
    if (!saveFilters?.grouping?.length) setIsGrouped(0);
  }, [saveFilters?.grouping?.length]);

  const fetchAllSourceData = useCallback(async () => {
    try {
      const response = await postDataRequest(
        `/jobSchedule/getJobs?page=${-1}`,
        {
          ...saveFilters,
          filterKey: tableName,
          objectId: selectedObject || null,
        },
      );
      if (response?.status === 200) return response.data?.data || [];
      else return [];
    } catch (error) {
      console.log("error", error);
      return [];
    }
  }, [saveFilters]);

  // const { bgColor } = useTheme();
  // const { backgroundColor } = bgColor;

  const navigate = useNavigate();

  const handleUpdatePriority = (priority) => {
    patchRequest("/jobSchedule/updatePriority", priority);
  };

  const handleDrawer = (val) => {
    if (heading === "AR Mapping") {
      setOpenDrawer(val);
      setEditJob(true);
      // handleNavigateArMApping(val);
    } else if (heading === "AR Rules") {
      setOpenDrawer(val);
      setEditJob(true);
    } else {
      setOpenDrawer(val);
      if (editJob) setEditJob(false);
    }
  };

  const fetchJobs = useCallback(
    async (page = 0, size = 10) => {
      if (fetchJobsRef.current) return;
      fetchJobsRef.current = true;
      try {
        const response = await postDataRequest(
          `/jobSchedule/getJobs?page=${
            saveFilters?.grouping?.length ? -1 : page
          }&size=${size}`,
          saveFilters?.grouping?.length
            ? {
                filterKey: tableName,
                objectId: selectedObject || null,
              }
            : {
                ...saveFilters,
                filterKey: tableName,
                objectId: selectedObject || null,
              },
        );
        // After fetching jobs, filter and sort by selectedObject and priority
        if (response.status === 200) {
          const result = response.data;
          // let data = result.data;
          // if (selectedObject) {
          //   data = data.filter((job) => job.object == selectedObject);
          // }
          // data = data.sort((a, b) => a.priority - b.priority);
          if (saveFilters?.grouping?.length) dispatch(setFilters([]));
          setIsGrouped(saveFilters?.grouping?.length);
          setScheduleJobList(
            result?.data
              ?.sort((a, b) => a.priority - b.priority)
              .map((v) => ({
                id: v?.id,
                jobName: v?.jobName,
                ...v,
              })) || [],
          );
          setTotalRecords(
            selectedObject ? result.objectRecords : result.totalRecords || 0,
          );
          setTotalPages(result.totalPages || 0);
          setFilteredTableData(result.totalFilterRecords || 0);
        } else {
          setScheduleJobList([]);
          setTotalRecords(0);
          setTotalPages(0);
          setIsGrouped(0);
          setFilteredTableData(0);
        }
      } catch (error) {
        console.log(error);
        setScheduleJobList([]);
        setTotalRecords(0);
        setTotalPages(0);
        setIsGrouped(0);
        setFilteredTableData(0);
      } finally {
        setLoading(false);
        setTimeout(() => {
          fetchJobsRef.current = false;
        }, 300);
      }
    },
    [selectedObject, saveFilters],
  );

  useEffect(() => {
    if (
      isFiltersLoaded &&
      (saveFilters?.tableName || saveFilters?.tableName === null) &&
      !isGrouped
    )
      fetchJobs(pagination.pageIndex, pagination.pageSize);
  }, [isFiltersLoaded, saveFilters, isGrouped, selectedObject]);

  const handlePaginationChange = useCallback(
    (pageSize, page, isCallApi = true) => {
      if (!isGrouped && isCallApi) {
        setLoading(true);
        fetchJobs(page, pageSize);
      }
      setPagination({
        pageSize: pageSize,
        pageIndex: page,
      });
    },
    [selectedObject, saveFilters, isGrouped],
  );

  const handleDelete = (jobId, job = {}) => {
    setSelectedId(jobId);
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleDeleteScheduleJob = async () => {
    setDeleteLoading(true);
    try {
      setDeleteCheckValue({ job: false, AcDcTable: false });
      if (heading === "AR Rules") {
        const response = await deleteRequest(
          `/rules/delete/${selectedId}/rule?ruleId=${selectedId}`,
        );
        if (response?.status === 200) {
          setIsModalOpen(false);
          toast.success("Successfully Deleted AR Rules");
          // Stay on current page and fetch data
          fetchJobs(pagination.pageIndex, pagination.pageSize);
        }
        return;
      }

      if (heading === "AR Mapping") {
        const response = await deleteRequest(
          `/filter/delete/${selectedId}/filter?filterId=${selectedId}`,
        );
        if (response?.status === 200) {
          setIsModalOpen(false);
          toast.success("Successfully Deleted AR Mapping");
          // Stay on current page and fetch data
          fetchJobs(pagination.pageIndex, pagination.pageSize);
        }
        return;
      }

      if (deleteCheckValue.AcDcTable && selectedJob?.tablesExist) {
        const response = await deleteRequest(
          `/jobSchedule/deleteJobwithTables/${selectedId}`,
        );
        if (response?.status === 200) {
          setIsModalOpen(false);
          toast.success("Successfully Deleted AC / DC Table");
          // Stay on current page and fetch data
          fetchJobs(pagination.pageIndex, pagination.pageSize);
        }
      } else if (deleteCheckValue.job) {
        const response = await deleteRequest(
          `/jobSchedule/deleteJob/${selectedId}`,
        );
        if (response?.status === 200) {
          setIsModalOpen(false);
          toast.success("Successfully Deleted Job");
          // Stay on current page and fetch data
          fetchJobs(pagination.pageIndex, pagination.pageSize);
        }
      }

      const jobObj = scheduleJobList.find((s) => s.id === selectedId);

      // Handle dashboard deletion
      if (deleteCheckValue.dashboards) {
        try {
          const response = await dataGetRequest(
            `/dashboard/checkdashboard/${jobObj?.jobName}`,
          );
          if (response.data) {
            await DataDeleteRequest(
              jobObj?.inRegister === "yes"
                ? `/dashboard/jobName/delete?objectId=${jobObj?.object}`
                : `/dashboard/jobName/delete?jobname=${jobObj?.jobName}`,
            );
          }
        } catch (error) {
          console.error("Error deleting dashboard:", error);
        }
      }

      // Handle saved views deletion
      if (deleteCheckValue.savedViews && selectedJob?.viewExist) {
        try {
          await DataDeleteRequest(
            jobObj?.inRegister === "yes"
              ? `/view/jobName/delete?objectId=${jobObj?.object}`
              : `/view/jobName/delete?jobname=${jobObj?.jobName}`,
          );
        } catch (error) {
          console.error("Error deleting saved views:", error);
        }
      }

      // Reset checkboxes after successful operations
      setDeleteCheckValue({
        job: false,
        AcDcTable: false,
        dashboards: false,
        savedViews: false,
      });
    } catch (error) {
      console.error(error || "Internal server error");
      setIsModalOpen(false);
      toast.error(error.response?.data?.error || "Failed to Delete Folder");
    } finally {
      setIsModalOpen(false);
      setDeleteLoading(false);
      // Reset all checkbox states
      setDeleteCheckValue({
        job: false,
        AcDcTable: false,
        dashboards: false,
        savedViews: false,
      });
    }
  };

  const handleARRulesNavigation = (job, isOpen = false) => {
    if (!job?.ACTableName) return;
    setIsEditMode && setIsEditMode(true);
    navigate(
      `/admin-console/ar-rules?table-name=${job?.DCTableName}&jobName=${job?.jobName}&jobId=${job.id}`,
      {
        state: {
          heading: "AR Rule",
          jobName: job?.jobName,
          job: job,
          isOpen,
        },
      },
    );
  };

  const handleNavigateEditForm = (job) => {
    console.log("step-1", job);
    if (!job?.jobType) return;

    const expr = job.jobType.toLowerCase();
    switch (expr) {
      case "googlecloud":
        navigate("/admin-console/edit-jobs/google-cloud", {
          state: { data: job },
        });
        break;
      case "aws":
      case "aws-vm":
        navigate("/admin-console/edit-jobs/aws-vm", { state: { data: job } });
        break;
      case "custom-api":
      case "custom":
        navigate("/admin-console/edit-jobs/custom-api", {
          state: { data: job },
        });
        break;
      case "flat-file-csv":
      case "csv":
      case "xlsx":
        navigate("/admin-console/edit-jobs/flat-file-csv", {
          state: { data: job },
        });
        break;
      case "flexera":
        navigate("/admin-console/edit-jobs/flexera", { state: { data: job } });
        break;
      case "azure":
        navigate("/admin-console/edit-jobs/azure", { state: { data: job } });
        break;
      case "sql":
        navigate("/admin-console/edit-jobs/sql", { state: { data: job } });
        break;
      case "itune":
        navigate("/admin-console/edit-jobs/itune", { state: { data: job } });
        break;
      case "serviceNow":
      case "servicenow":
        navigate("/admin-console/edit-jobs/service-now", {
          state: { data: job },
        });
        break;
      case "windowdefender":
      case "ms-defender":
        navigate("/admin-console/edit-jobs/ms-defender", {
          state: { data: job },
        });
        break;
      case "active-directory":
        navigate("/admin-console/edit-jobs/active-directory", {
          state: { data: job },
        });
        break;
      default:
        toast.error(`Sorry, no matching route for ${expr}`);
    }
  };

  const handleNavigateArMApping = (job) => {
    navigate(`${path}/${job.ACTableName}`, {
      state: { data: { ...job, heading: "AR Mapping" } },
    });
  };

  const handleMultipleDelete = () => {
    setIsMultipleModalOpen(true);
  };

  const handleDeleteMultipleScheduleJob = async () => {
    setDeleteLoading(true);
    try {
      setDeleteCheckValue({ job: false, AcDcTable: false });
      // if (isBulkDelete) {
      const idsToDelete = selectedRows.map((row) => row.id);
      const idsToDeleteRule = selectedRows.map((row) => row.ruleId);
      const idsToDeleteMap = selectedRows.map((row) => row?.filterId);

      if (heading === "AR Rules") {
        await Promise.all(
          idsToDeleteRule.map((id) =>
            deleteRequest(`/rules/delete/${id}/rule?ruleId=${id}`),
          ),
        );
        setIsModalOpen(false);
        setIsMultipleModalOpen(false);
        setDeleteLoading(false);
        setSelectedRows([]);
        // Stay on current page and fetch data
        fetchJobs(pagination.pageIndex, pagination.pageSize);
        return;
      }

      if (heading === "AR Mapping") {
        await Promise.all(
          idsToDeleteMap.map((id) =>
            deleteRequest(`/filter/delete/${id}/filter?filterId=${id}`),
          ),
        );
        setIsModalOpen(false);
        setIsMultipleModalOpen(false);
        setDeleteLoading(false);
        setSelectedRows([]);
        // Stay on current page and fetch data
        fetchJobs(pagination.pageIndex, pagination.pageSize);
        return;
      }
      if (deleteCheckValue.job) {
        await Promise.all(
          idsToDelete.map((id) =>
            deleteRequest(`/jobSchedule/deleteJob/${id}`),
          ),
        );
      } else if (deleteCheckValue.AcDcTable) {
        await Promise.all(
          selectedRows.map(
            (row) =>
              row?.id &&
              row?.tablesExist &&
              deleteRequest(`/jobSchedule/deleteJobwithTables/${row.id}`),
          ),
        );
      }

      if (deleteCheckValue.dashboards) {
        try {
          await Promise.all(
            selectedRows.map((row) =>
              dataGetRequest(`/dashboard/checkdashboard/${row?.jobName}`).then(
                (res) => {
                  if (res.data)
                    DataDeleteRequest(
                      row?.inRegister === "yes"
                        ? `/dashboard/jobName/delete?objectId=${row?.object}`
                        : `/dashboard/jobName/delete?jobname=${row?.jobName}`,
                    );
                },
              ),
            ),
          );
        } catch (error) {
          console.error("Error bulk deleting dashboards:", error);
        }
      }

      // Handle saved views deletion
      if (deleteCheckValue.savedViews) {
        try {
          await Promise.all(
            selectedRows
              .filter((v) => v?.viewExist)
              .map((row) =>
                DataDeleteRequest(
                  row?.inRegister === "yes"
                    ? `/view/jobName/delete?objectId=${row?.object}`
                    : `/view/jobName/delete?jobname=${row?.jobName}`,
                ),
              ),
          );
        } catch (error) {
          console.error("Error bulk deleting views:", error);
        }
      }
      toast.success(
        selectedRows.length <= 1
          ? "Successfully Deleted Job"
          : `${idsToDelete.length} Job(s) deleted successfully`,
      );
      fetchJobs(pagination.pageIndex, pagination.pageSize);
    } catch (error) {
      console.error(error || "Internal server error");
      toast.error(error.response?.data?.error || "Failed to Delete");
    } finally {
      setIsModalOpen(false);
      setIsMultipleModalOpen(false);
      // setIsBulkDelete(false); // reset
      setDeleteLoading(false);
      setSelectedRows([]);
    }
  };

  const handleAllSelectedRunAndExecuteJobs = () => {
    switch (heading) {
      case "Saved Jobs":
        handleRunSelectedJobs(selectedRows, setSelectedRows, setRunLoading);
        break;
      case "AR Mapping":
        handleExecuteASelectedARMapping(
          selectedRows,
          setSelectedRows,
          setRunLoading,
        );
        break;
      case "AR Rules":
        handleExecuteSelectedARRule(
          selectedRows,
          setSelectedRows,
          setRunLoading,
        );
        break;
      default:
        console.log("heading is wrong");
        break;
    }
  };
  // const filteredJobs = selectedObject
  //   ? scheduleJobList
  //       .filter((job) => job.object == selectedObject)
  //       .sort((a, b) => a.priority - b.priority)
  //   : scheduleJobList.sort((a, b) => a.priority - b.priority);

  const handleAddJob = () => {
    setOpenDrawer({ mode: "add" });
  };

  const openEmailModal = () => {
    setEmailDrawerOpen(true);
  };

  // const closeEmailModal = () => {
  // setIsEmailModalOpen(null);
  // setEmailDrawerOpen(false);
  // };

  const handleMerge = () => {
    if (selectedObject) {
      openEmailModal();
      // setMergeLoading(true);
      // getCommonRegisterRequest(
      //   `/AssetRegister/${selectedObject}/merge`
      // ).finally(() => setMergeLoading(false));
    }
  };

  const linkHandler = (val, isNavigateJob = false) => {
    if (isNavigateJob)
      return handleNavigateEditForm({
        ...JSON.parse(val?.jsonData),
        ...val,
        jobName: "",
        isNavigateJob,
      });

    switch (heading) {
      case "AR Mapping":
        handleDrawer({ ...val, heading: "AR Mapping" });
        // setOpenDrawer({ ...val, heading: "AR Mapping" });
        // setEditJob(true);
        // handleNavigateArMApping(val);
        break;
      case "AR Rules":
        setOpenDrawer(val);
        setEditJob(true);
        // handleARRulesNavigation(val);
        break;
      case "Saved Jobs":
        setOpenDrawer(val);
        if (emailDrawerOpen) setEmailDrawerOpen(false);
        // setEditJob(true);
        // handleNavigateEditForm(val);
        break;
      default:
        handleNavigateEditForm(val);
        break;
    }
  };

  const deleteActionHandler = (val) => {
    switch (heading) {
      case "AR Mapping":
        handleDelete(val?.filterId);
        break;
      case "AR Rules":
        handleDelete(val?.ruleId);
        break;
      case "Saved Jobs":
        handleDelete(val?.id, val);
        break;
    }
  };

  const column = scheduleJobList.length
    ? Object.keys(...scheduleJobList).map((key) => ({
        accessorKey: key,
        header: key,
        enableGrouping: true,
        enableLinkHandler:
          key === "jobName" &&
          // permissionList?.includes(routeName) &&
          // permissionDetails[routeName]?.hasWriteOnly &&
          linkHandler,
      }))
    : [];

  const handleDataChange = (newData) => {
    // setScheduleJobList(newData);
    console.log("Data updated:", newData);
  };

  return (
    <div className={`${!loading && "flex"}`}>
      <PageLayout className="flex-1">
        {/* <div className="mb-12">
        <div className="p-3 absolute top-20">
          <BackButton />
        </div>
      </div> */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
          <div className="flex items-center gap-2">
            <div className="font-extrabold text-2xl">{routeName}</div>
            <span className="inline-flex items-end ml-2 py-0.5 rounded-full text-sm text-gray-600">
              {totalRecords} Total
            </span>
            {/* <span className="text-sm font-medium text-gray-600"></span> */}
            {filteredTableData !== totalRecords && (
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
          <div className="flex gap-1 sm:gap-6 justify-end mt-3">
            {/* View toggle */}
            <GridButton setView={setView} view={view} />
            {heading === "Saved Jobs" && (
              <div className="group">
                <CommonButton
                  className="bg-accent"
                  onClick={handleMerge}
                  disabled={!selectedObject}
                  // backgroundColor={backgroundColor}
                >
                  Merge
                </CommonButton>
                {!selectedObject && (
                  <div
                    className="absolute right-1/2 transform -translate-x-1/2 text-white p-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      // backgroundColor,
                      position: "absolute",
                      right: "120px",
                      top: "50px",
                      transform: "translateX(-50%)",
                    }}
                  >
                    Select Object
                  </div>
                )}
              </div>
            )}

            {heading === "Saved Jobs" &&
              permissionList?.includes(routeName) &&
              permissionDetails[routeName]?.hasWriteOnly && (
                <div className="mb-3 ml-2">
                  <CommonButton
                    className="bg-accent"
                    onClick={handleAddJob}
                    // backgroundColor={backgroundColor}
                  >
                    <div className="flex gap-2 items-center">
                      <PlusIcon style={{ color: "white" }} size={13} /> Add Job
                    </div>
                  </CommonButton>
                </div>
              )}
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="m-4 mb-24">
            {heading && (
              <button
                onClick={handleAllSelectedRunAndExecuteJobs}
                disabled={
                  runLoading ||
                  deleteLoading ||
                  selectedRows.some((job) => isJobDisabled(job))
                }
                title={
                  selectedRows.filter((job) => isJobDisabled(job)).length
                    ? `Please uncheck the disabled job(s): ${selectedRows
                        .filter((job) => isJobDisabled(job))
                        .map((job) => job.jobName)
                        .join(", ")}`
                    : ""
                }
                className={
                  runLoading ||
                  deleteLoading ||
                  selectedRows.some((job) => isJobDisabled(job))
                    ? "absolute bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed transition left-52"
                    : "absolute bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition left-52"
                }
              >
                {runLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  `${heading === "Saved Jobs" ? "Run Job" : "Execute"} (${
                    selectedRows.length
                  })`
                )}
              </button>
            )}
            <button
              onClick={() => {
                if (heading === "Saved Jobs") handleMultipleDelete();
                else handleDeleteMultipleScheduleJob();
              }}
              disabled={runLoading || deleteLoading}
              className="absolute bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
              Delete Selected ({selectedRows.length})
            </button>
          </div>
        )}

        {/* {loading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : filteredJobs.length ? ( */}
        <DataTable
          data={scheduleJobList}
          setOpenDrawer={setOpenDrawer}
          openDrawer={openDrawer}
          columns={column}
          tableView={view}
          enableRowSelection={
            permissionList?.includes(routeName) &&
            permissionDetails[routeName]?.hasWriteOnly
          }
          enableFiltering={false}
          enableEditing={true}
          enableAction={true}
          disabledCheckBox={runLoading || deleteLoading}
          deleteId={
            permissionList?.includes(routeName) &&
            permissionDetails[routeName]?.hasWriteOnly
              ? heading === "AR Mapping"
                ? "filterId"
                : heading === "AR Rules"
                  ? "ruleId"
                  : true
              : false
          }
          tableName={tableNameEnum.SAVEDJOBS}
          editActionHandler={linkHandler}
          deleteActionHandler={deleteActionHandler}
          enableGrouping={true}
          enableCreateDashboard={false}
          enableCreateView={false}
          enableCreateEmail={
            routeName === "AR Rules" ? false : heading !== "AR Mapping"
          }
          setSelectedRows={setSelectedRows}
          selectedRows={selectedRows}
          onDataChange={handleDataChange}
          path={heading === "Saved Jobs" ? path : ""}
          handleARRulesNavigation={
            heading === "Saved Jobs" ? handleARRulesNavigation : ""
          }
          routeName={routeName}
          handleUpdatePriority={handleUpdatePriority}
          totalRecords={
            saveFilters?.grouping?.length ? undefined : filteredTableData
          }
          pagination={saveFilters?.grouping?.length ? undefined : pagination}
          totalPages={saveFilters?.grouping?.length ? undefined : totalPages}
          onPaginationChange={
            saveFilters?.grouping?.length ? undefined : handlePaginationChange
          }
          isLoading={loading}
          setFilteredData={setFilteredTableData}
          setSaveFilters={setSaveFilters}
          saveFilters={saveFilters}
          fetchAllSourceData={fetchAllSourceData}
          cardFiled={{
            title: "jobName",
            subTitle1: "id",
            id: "id",
            subTitle2: "jobType",
            status: "status",
            assets: "noOfRecords",
          }}
        />

        {/* ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )} */}
        <DeleteConfirm
          isOpen={isModalOpen}
          setDeleteCheckValue={
            heading === "Saved Jobs" ? setDeleteCheckValue : false
          }
          deleteCheckValue={deleteCheckValue}
          close={() => setIsModalOpen(false)}
          handleDelete={handleDeleteScheduleJob}
          deleteLoading={deleteLoading}
        />
        <DeleteConfirm
          isOpen={isMultipleModalOpen}
          setDeleteCheckValue={
            heading === "Saved Jobs" ? setDeleteCheckValue : false
          }
          deleteCheckValue={deleteCheckValue}
          close={() => setIsMultipleModalOpen(false)}
          handleDelete={handleDeleteMultipleScheduleJob}
          deleteLoading={deleteLoading}
        />
      </PageLayout>

      <SavedJobDrawer
        routeName={routeName}
        heading={heading}
        deleteActionHandler={deleteActionHandler}
        job={openDrawer || {}}
        open={emailDrawerOpen ? true : openDrawer}
        setEditJob={setEditJob}
        editJob={editJob}
        emailMode={emailDrawerOpen}
        emailProps={{
          routeName,
          tableName: tableNameEnum.SAVEDJOBS,
          scheduleType: scheduleTypeEnum.ASSETREGISTER,
          isJob: false,
          showScheduleManagement: true,
        }}
        onClose={() => {
          setEditJob(false);
          setOpenDrawer(null);
          setEmailDrawerOpen(false);
        }}
      />
    </div>
  );
};
