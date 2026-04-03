/**
 * AI analyze / cache-invalidate payloads aligned with DataTable buildAiFilters (objectId + dashboardData).
 */

export const resolveAiUserId = (user) =>
  (user?.id != null && String(user.id)) || localStorage.getItem("user-id") || "anonymous";

/**
 * @param {object | null} importTrendFilter - Same shape as DataTable saveFilters slice: { xDaysFilter: { columnNames, xDays }, xFilter: true }
 */
export const buildAdminConsoleOverviewFilters = (selectedObject, user, importTrendFilter = null) => {
  const dashboardData = {
    tableType: "admin-console",
    objectId: selectedObject || "",
    userName: user?.email || user?.userName || "",
  };
  if (importTrendFilter?.xDaysFilter && importTrendFilter.xFilter) {
    dashboardData.xDaysFilter = importTrendFilter.xDaysFilter;
    dashboardData.xFilter = true;
  } else {
    dashboardData.xDaysFilter = null;
    dashboardData.xFilter = false;
  }
  return {
    objectId: selectedObject || null,
    dashboardData,
  };
};

export const buildAdminConsoleOverviewPayload = ({
  user,
  selectedObject,
  selectedModelId,
  importTrendFilter = null,
}) => ({
  orgId: user?.orgId || "default-org",
  userId: resolveAiUserId(user),
  pageId: "admin-console/overview",
  category: "admin-console-home",
  filters: buildAdminConsoleOverviewFilters(selectedObject, user, importTrendFilter),
  modelId: selectedModelId || undefined,
  userName: user?.email || user?.userName || undefined,
});

export const buildDataConsoleOverviewFilters = (selectedObject, selectedJobName) => ({
  objectId: selectedObject || null,
  dashboardData: {
    tableType: "data-console-home",
    objectId: selectedObject || "",
    ...(selectedJobName ? { selectedJobName } : {}),
  },
});

export const buildDataConsoleOverviewPayload = ({
  user,
  selectedObject,
  selectedJobName,
  selectedModelId,
}) => ({
  orgId: user?.orgId || "default-org",
  userId: resolveAiUserId(user),
  pageId: "data-console/overview",
  category: "data-console-home",
  filters: buildDataConsoleOverviewFilters(selectedObject, selectedJobName),
  modelId: selectedModelId || undefined,
  userName: user?.email || user?.userName || undefined,
});
