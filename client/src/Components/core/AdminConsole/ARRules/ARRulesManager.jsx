import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  IconButton,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import { FaPlus } from "react-icons/fa";
import { AiOutlineMinusCircle } from "react-icons/ai";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { IoArrowBack } from "react-icons/io5";
import SubmitBtn from "../../../Common/SubmitBtn";
import { useTheme } from "../../../../ThemeContext";
import { getRequest, postDataRequest } from "../../../../Service/admin.save";
import { Commom_Saved_Job } from "../../../Common/Commom_Saved_Job";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GripVertical } from "lucide-react";

const operators = [
  { name: "Equals", value: "=" },
  { name: "Contains", value: "contains" },
  { name: "Not Equals", value: "!=" },
  { name: "Greater Than", value: ">" },
  { name: "Less Than", value: "<" },
  { name: "Is blank", value: "Is blank" },
  { name: "Is not blank", value: "Is not blank" },
  { name: "Does not contain", value: "Does not contain" },
  { name: "Is any of", value: "Is any of" },
  { name: "Is none of", value: "Is none of" },
];

const conditions = ["AND", "OR"];
const rules = [
  { name: "Duplicate records by Primary Key", value: "primaryKey" },
  {
    name: "Duplicate records by Secondary Key",
    value: "secondaryKey",
  },
  {
    name: "Duplicate records by Primary and Secondary Key",
    value: "primaryAndSecondary",
  },
  {
    name: "Duplicate records by selected Column(s)",
    value: "UniqueSelectedColumnData",
  },
  {
    name: "Keep records by Column(s) values",
    value: "ColumnConditionNotSatisfied",
  },
  {
    name: "Remove records by Column(s) values",
    value: "ColumnConditionSatisfied",
  },
  {
    name: "Duplicate records for a column keeping the latest by a date-based column",
    value: "ColumnLatestData",
  },
];

const ARRulesConfig = ({ routeName }) => {
  //   const dispatch = useDispatch();
  const [isEditMode, setIsEditMode] = useState(false);
  const location = useLocation();
  const HeadingTitle = useSelector((state) => state.title);
  // useEffect(() => {
  //     dispatch(setHeadingTitle(`${location.state?.heading} / ${location.state?.jobName}` || HeadingTitle?.headingTitle
  //     ));

  // }, [location]);

  const { bgColor } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const tableName = searchParams.get("table-name");
  const jobName = searchParams.get("jobName");
  const jobId = searchParams.get("jobId");
  // helper to generate stable ids for queries
  const generateId = () =>
    `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // initialize queries with an id
  const [queries, setQueries] = useState([
    { id: generateId(), rule: "", conditions: [] },
  ]);

  const [isLoading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [columnName, setColumnName] = useState([]);
  const [openModal, setOpenModal] = useState(!tableName);

  const [payload, setPayload] = useState({
    jobId: Number(jobId),
    ruleSelects: [
      {
        orderNumber: 0,
        ruleRequest: {
          RuleName: "",
          tableName: tableName,
          Conditions: [
            {
              columnnames: [],
              operator: "",
              value: "",
            },
          ],
          jobName: jobName,
        },
      },
    ],
  });

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      setIsSaveLoading(false);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (HeadingTitle?.headingTitle?.includes("undefined")) {
      setIsEditMode(false);
    }
  }, [HeadingTitle]);

  useEffect(() => {
    if (location.search) setIsEditMode(true);

    if (location.state?.job?.ruleId) {
      setDataLoading(true);
      getRequest(`/rules/get?objectId=${location.state.job.object}`)
        .then((res) => {
          const data = res.data
            .filter((v) => v.ruleId == location.state.job.ruleId)
            .map((v) => JSON.parse(v.ruleRequest));

          setQueries(
            data.flat(1).map((v) => ({
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
            })),
          );
        })
        .finally(() => {
          setDataLoading(false);
        });
    }
  }, [location.state]);

  const handleAddRule = (queryIndex) => {
    const updatedQueries = [...queries];
    const currentRule = updatedQueries[queryIndex].rule;

    // For UniqueSelectedColumnData rule, don't add condition field
    if (currentRule === "UniqueSelectedColumnData") {
      updatedQueries[queryIndex].conditions.push({
        columnnames: [],
        operator: "",
        value: "",
      });
    } else {
      updatedQueries[queryIndex].conditions.push({
        condition: "AND",
        columnnames: [],
        operator: "",
        value: "",
      });
    }
    setQueries(updatedQueries);
  };

  // Update handleAddQuery to use id
  const handleAddQuery = () => {
    setQueries((prev) => [
      ...prev,
      { id: generateId(), rule: "", conditions: [] },
    ]);
  };

  const handleRemoveRule = (queryIndex, ruleIndex) => {
    const updatedQueries = [...queries];
    updatedQueries[queryIndex].conditions.splice(ruleIndex, 1);
    setQueries(updatedQueries);
  };

  const handleRuleChange = (queryIndex, field, value, ruleIndex = null) => {
    const updatedQueries = [...queries];
    if (ruleIndex !== null) {
      updatedQueries[queryIndex].conditions[ruleIndex][field] = value;
    } else {
      updatedQueries[queryIndex][field] = value;
      // If rule is being changed, clear all conditions and set up based on rule type
      if (field === "rule") {
        if (value === "ColumnLatestData") {
          // For "Duplicate records for a column keeping the latest by a date-based column"
          updatedQueries[queryIndex].conditions = [
            {
              referenceColumn: [],
              comparingColumnName: "",
            },
          ];
        } else {
          updatedQueries[queryIndex].conditions = [];
        }
      }
    }
    setQueries(updatedQueries);
  };

  const handleSubmit = async (isSave) => {
    if (!tableName) {
      setOpenModal(true);
      return;
    }

    // Rules that don't need conditions
    const noConditionRules = [
      "primaryKey",
      "secondaryKey",
      "primaryAndSecondary",
    ];

    // Rules that need column conditions with operator and value
    const columnConditionRules = [
      "ColumnConditionNotSatisfied",
      "ColumnConditionSatisfied",
    ];

    // Rules that need column selection but no operator/value
    const columnSelectionRules = ["UniqueSelectedColumnData"];

    // Rules that need reference and date columns
    const dateBasedRules = ["ColumnLatestData"];

    // Validate rules that need column selection (but not operator/value)
    const getRules = queries.filter((query) =>
      columnSelectionRules.includes(query.rule),
    );

    if (
      getRules.length &&
      getRules.some(
        (v) =>
          !v.conditions ||
          !v.conditions[0] ||
          !v.conditions[0].columnnames ||
          !v.conditions[0].columnnames.length,
      )
    ) {
      toast.error("Please add rule");
      return;
    }

    // Validate rules that need column conditions with operator and value
    const getRules2 = queries.filter((query) =>
      columnConditionRules.includes(query.rule),
    );

    if (
      getRules2.length &&
      getRules2.some(
        (v) =>
          !v.conditions ||
          !v.conditions[0] ||
          !v.conditions[0].columnnames ||
          !v.conditions[0].columnnames.length ||
          !v.conditions[0].operator ||
          // Skip value validation for "Is blank" and "Is not blank" operators
          (v.conditions[0].operator !== "Is blank" &&
            v.conditions[0].operator !== "Is not blank" &&
            (v.conditions[0].value === undefined ||
              !v.conditions[0].value.length)),
      )
    ) {
      toast.error("Please add rule");
      return;
    }

    // Validate ColumnLatestData rule
    const getDateBasedRules = queries.filter((query) =>
      dateBasedRules.includes(query.rule),
    );

    if (
      getDateBasedRules.length &&
      getDateBasedRules.some(
        (v) =>
          !v.conditions ||
          !v.conditions[0] ||
          !v.conditions[0].referenceColumn ||
          !v.conditions[0].referenceColumn.length ||
          !v.conditions[0].comparingColumnName,
      )
    ) {
      toast.error("Please select Reference Column and Date Column");
      return;
    }

    // Generate payload
    const newRuleSelects = queries.map((query, queryIndex) => ({
      orderNumber: queryIndex + 1,
      ruleRequest: {
        RuleName: query.rule || "primaryKey",
        tableName: tableName,
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
        jobName: jobName,
      },
    }));

    setPayload((prev) => ({
      ...prev,
      ruleSelects: newRuleSelects,
    }));

    const updatedPayload = {
      ...payload,
      jobId: Number(jobId),
      ruleSelects: newRuleSelects,
    };
    console.log("Updated Payload:", payload);
    console.log("Updated Payload:", updatedPayload);

    // Generate SQL Queries
    const sqlQueries = queries.map((query, queryIndex) => {
      const sqlConditions = query.conditions
        .map((rule, ruleIndex) => {
          const condition = ruleIndex === 0 ? "" : rule.condition;
          const column = rule.columnnames?.join(", ") || ""; // Ensure columnnames is handled correctly
          const operator = mapOperator(rule.operator);
          const value = isNaN(rule.value) ? `'%${rule.value}%'` : rule.value;
          return `${condition} ${column} ${operator} ${value}`.trim();
        })
        .join(" ");

      return `-- Query ${
        queryIndex + 1
      } \n DELETE FROM ${tableName} WHERE ${sqlConditions}`;
    });

    // alert("Query Generated Successfully");
    console.log("Generated SQL Queries:", sqlQueries.join("\n"));
    if (isSave) setIsSaveLoading(true);
    else setLoading(true);

    try {
      // Execute API call
      const response = await postDataRequest(
        `/rules/${isSave ? "save" : "executeRules"}`,
        updatedPayload,
      );

      console.log("result", response);

      if (response?.status !== 200) {
        console.log("inside error");
        throw new Error(
          `API call failed: ${response?.message || "Unknown error"}`,
        );
      }

      toast.success(
        isSave
          ? "Rules saved successfully!"
          : "All queries executed successfully!",
      );
      setIsEditMode(false);
    } catch (error) {
      console.error(error.message);
      toast.error(
        error.message || "An error occurred while processing the request",
      );
    } finally {
      // Reset loading state
      if (isSave) setIsSaveLoading(false);
      else setLoading(false);
    }
  };
  const mapOperator = (operator) => {
    switch (operator) {
      case "Equals":
        return "=";
      case "Contains":
        return "LIKE";
      case "Not Equals":
        return "!=";
      case "Greater Than":
        return ">";
      case "Less Than":
        return "<";
      case "Is blank":
        return "Is blank";
      case "Is not blank":
        return "Is not blank";
      case "Does not contain":
        return "Does not contain";
      case "Is any of":
        return "Is any of";
      case "Is none of":
        return "Is none of";
      default:
        return "";
    }
  };

  const getColumnName = async () => {
    if (tableName) {
      try {
        const response = await getRequest(`/table/${tableName}/getColumns`);
        if (response.status === 200) {
          setColumnName(response.data);
        }
      } catch (error) {
        console.error("Error fetching columns:", error);
        setColumnName([]);
      }
    }
    // else {
    //     setOpenModal(true);
    // }
  };

  useEffect(() => {
    getColumnName();
  }, [tableName]);

  const handleCloseModal = () => {
    setOpenModal(false);
    navigate("/admin-console/saved-jobs");
  };

  // react-dnd: move item function
  const moveQuery = (fromIndex, toIndex) => {
    setQueries((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  // QueryItem component using react-dnd
  const QueryItem = ({ id, index, moveQuery, children }) => {
    const ref = useRef(null);
    const [{ isDragging }, drag] = useDrag({
      type: "QUERY",
      item: { id, index },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    const [, drop] = useDrop({
      accept: "QUERY",
      hover(item, monitor) {
        if (!ref.current) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;

        const hoverBounding = ref.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBounding.bottom - hoverBounding.top) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverClientY = clientOffset.y - hoverBounding.top;

        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

        moveQuery(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    });

    drag(drop(ref));

    return (
      <div
        ref={ref}
        style={{
          opacity: isDragging ? 0.6 : 1,
          cursor: "grab",
        }}
      >
        {children}
      </div>
    );
  };

  if (dataLoading)
    return (
      <div className="flex justify-center items-center h-full">
        <CircularProgress />
      </div>
    );

  return (
    <>
      {isEditMode && (
        <Box
          sx={{
            p: 3,
            maxWidth: 800,
            mx: "auto",
            boxShadow: 3,
            borderRadius: 2,
          }}
        >
          <div className="m-4">
            <button
              onClick={() => {
                setIsEditMode(false);
                if (location.state?.isOpen)
                  navigate("/admin-console/saved-jobs");
                else navigate("/admin-console/ar-rules");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: "blue",
              }}
            >
              <IoArrowBack style={{ marginRight: "8px" }} />
              Back
            </button>
          </div>
          <Typography variant="h5" gutterBottom>
            Configure AR Rules
          </Typography>

          {/* Wrap queries list with react-dnd provider and sortable QueryItem */}
          <DndProvider backend={HTML5Backend}>
            {queries.map((query, queryIndex) => (
              <Box key={queryIndex} sx={{ mb: 4 }}>
                <QueryItem
                  key={query.id}
                  id={query.id}
                  index={queryIndex}
                  moveQuery={moveQuery}
                >
                  <div className="flex items-center mb-2">
                    <GripVertical size={14} className="mr-2" />
                    <Typography variant="h6">Query {queryIndex + 1}</Typography>
                  </div>
                </QueryItem>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Rule</InputLabel>
                  <div className="w-full">
                    <Select
                      value={query.rule}
                      label="Select Rule"
                      className="w-[93%]"
                      onChange={(e) =>
                        handleRuleChange(queryIndex, "rule", e.target.value)
                      }
                    >
                      {rules.map((rule) => (
                        <MenuItem key={rule} value={rule.value}>
                          {rule.name || ""}
                        </MenuItem>
                      ))}
                    </Select>
                    {queries.length >= 2 && (
                      <IconButton
                        color="error"
                        disabled={
                          permissionList?.includes(routeName) &&
                          !permissionDetails[routeName]?.hasWriteOnly
                        }
                        onClick={() => {
                          const updatedQueries = [...queries];
                          updatedQueries.splice(queryIndex, 1);
                          setQueries(updatedQueries);
                        }}
                      >
                        <AiOutlineMinusCircle />
                      </IconButton>
                    )}
                  </div>
                </FormControl>

                {query.rule === "primaryKey" ||
                query.rule === "secondaryKey" ||
                query.rule === "primaryAndSecondary" ? (
                  <></>
                ) : query.rule === "ColumnLatestData" ? (
                  // Special UI for "Duplicate records for a column keeping the latest by a date-based column"
                  <div className="w-[88%]">
                    {query.conditions.map((rule, ruleIndex) => (
                      <Box
                        key={ruleIndex}
                        sx={{
                          display: "flex",
                          gap: 2,
                          alignItems: "center",
                          mb: 2,
                          flexDirection: "column",
                        }}
                      >
                        {/* Reference Column */}
                        <FormControl fullWidth>
                          <InputLabel>Reference Column</InputLabel>
                          <Select
                            multiple
                            label="Reference Column"
                            value={rule.referenceColumn || []}
                            onChange={(e) =>
                              handleRuleChange(
                                queryIndex,
                                "referenceColumn",
                                e.target.value,
                                ruleIndex,
                              )
                            }
                            renderValue={(selected) => selected.join(", ")}
                          >
                            {columnName.map((col) => (
                              <MenuItem key={col} value={col}>
                                <Checkbox
                                  checked={Boolean(
                                    rule.referenceColumn?.includes(col),
                                  )}
                                />
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Date Column */}
                        <FormControl fullWidth>
                          <InputLabel>Comparing Column</InputLabel>
                          <Select
                            value={rule.comparingColumnName || ""}
                            label="Comparing Column"
                            onChange={(e) =>
                              handleRuleChange(
                                queryIndex,
                                "comparingColumnName",
                                e.target.value,
                                ruleIndex,
                              )
                            }
                          >
                            {columnName.map((col) => (
                              <MenuItem key={col} value={col}>
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    ))}
                    {/* No "Add Rule" button for this rule type */}
                  </div>
                ) : (
                  // Existing UI for other rules
                  <div className="w-[88%]">
                    {query.conditions.map((rule, ruleIndex) => (
                      <Box
                        key={ruleIndex}
                        sx={{
                          display: "flex",
                          gap: 2,
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        {/* Only show condition field if it's not the first rule AND not UniqueSelectedColumnData */}
                        {ruleIndex > 0 &&
                          query.rule !== "UniqueSelectedColumnData" && (
                            <FormControl fullWidth>
                              <InputLabel>Condition</InputLabel>
                              <Select
                                label="Condition"
                                value={rule.condition}
                                onChange={(e) =>
                                  handleRuleChange(
                                    queryIndex,
                                    "condition",
                                    e.target.value,
                                    ruleIndex,
                                  )
                                }
                              >
                                {conditions.map((cond) => (
                                  <MenuItem key={cond} value={cond}>
                                    {cond}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}

                        <FormControl fullWidth>
                          <InputLabel>Column</InputLabel>
                          <Select
                            multiple
                            label="Column"
                            value={rule.columnnames || []}
                            onChange={(e) =>
                              handleRuleChange(
                                queryIndex,
                                "columnnames",
                                e.target.value,
                                ruleIndex,
                              )
                            }
                            renderValue={(selected) => selected.join(", ")}
                          >
                            {columnName.map((col) => (
                              <MenuItem key={col} value={col}>
                                <Checkbox
                                  checked={rule.columnnames?.includes(col)}
                                />
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {(query.rule === "ColumnConditionNotSatisfied" ||
                          query.rule === "ColumnConditionSatisfied") && (
                          <>
                            <FormControl fullWidth>
                              <InputLabel>Operator</InputLabel>
                              <Select
                                value={rule.operator}
                                label="Operator"
                                onChange={(e) => {
                                  handleRuleChange(
                                    queryIndex,
                                    "operator",
                                    e.target.value,
                                    ruleIndex,
                                  );
                                  if (
                                    ["Is blank", "Is not blank"].includes(
                                      e.target.value,
                                    )
                                  ) {
                                    handleRuleChange(
                                      queryIndex,
                                      "value",
                                      "",
                                      ruleIndex,
                                    );
                                  }
                                }}
                              >
                                {operators.map((op) => (
                                  <MenuItem key={op} value={op.value}>
                                    {op.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>

                            {rule.operator !== "Is blank" &&
                              rule.operator !== "Is not blank" && (
                                <TextField
                                  label="Value"
                                  value={rule.value}
                                  onChange={(e) =>
                                    handleRuleChange(
                                      queryIndex,
                                      "value",
                                      e.target.value,
                                      ruleIndex,
                                    )
                                  }
                                  fullWidth
                                />
                              )}
                          </>
                        )}

                        <IconButton
                          color="error"
                          disabled={
                            permissionList?.includes(routeName) &&
                            !permissionDetails[routeName]?.hasWriteOnly
                          }
                          onClick={() =>
                            handleRemoveRule(queryIndex, ruleIndex)
                          }
                        >
                          <AiOutlineMinusCircle />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      variant="outlined"
                      startIcon={<FaPlus />}
                      onClick={() => handleAddRule(queryIndex)}
                      sx={{ mb: 2, color: bgColor?.backgroundColor }}
                    >
                      Add Rule
                    </Button>
                  </div>
                )}
              </Box>
            ))}
          </DndProvider>

          <Button
            variant="contained"
            color="primary"
            disabled={
              permissionList?.includes(routeName) &&
              !permissionDetails[routeName]?.hasWriteOnly
            }
            onClick={handleAddQuery}
            sx={{ mb: 2, backgroundColor: bgColor?.backgroundColor }}
          >
            Generate New Query
          </Button>
          <div className="flex gap-3">
            <SubmitBtn
              text="Save"
              disabled={
                permissionList?.includes(routeName) &&
                !permissionDetails[routeName]?.hasWriteOnly
              }
              isLoading={isSaveLoading}
              onClick={() => handleSubmit(true)}
              type="submit"
            />
            <SubmitBtn
              text="Execute Rules"
              disabled={
                permissionList?.includes(routeName) &&
                !permissionDetails[routeName]?.hasWriteOnly
              }
              isLoading={isLoading}
              onClick={() => handleSubmit(false)}
              type="submit"
            />
          </div>
          {/* <Dialog open={openModal} onClose={handleCloseModal}>
                        <DialogTitle>Missing Table Name</DialogTitle>
                        <DialogContent>Please select a table from Saved Jobs first.</DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseModal} color="primary">OK</Button>
                        </DialogActions>
                    </Dialog> */}
        </Box>
      )}
      {!isEditMode && (
        <Commom_Saved_Job
          heading="AR Rules"
          path="tables"
          setIsEditMode={setIsEditMode}
          routeName="A R Rules"
        />
      )}
    </>
  );
};

export default ARRulesConfig;
