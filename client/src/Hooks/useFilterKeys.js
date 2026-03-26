import { useState, useEffect } from "react";
import {
  getRequest as forConsoleApi,
  postDataRequest,
} from "../Service/Console.service";
import toast from "react-hot-toast";

/**
 * Custom hook to manage matchedKey and ignoreKey for the filter functionality
 * @param {Object} options - Configuration options
 * @param {string} options.jobName - Name of the job
 * @param {string} options.tableName - Name of the table
 * @param {number} options.filterId - ID of the filter (optional)
 * @param {string} options.toggleButton - Current toggle mode (replace/update)
 * @param {Function} options.setToggleButton - Function to update toggle mode
 * @returns {Object} Filter state and functions
 */
const useFilterKeys = ({
  jobName,
  tableName,
  filterId,
  toggleButton,
  setToggleButton,
}) => {
  const [matchedKey, setMatchedKey] = useState([]);
  const [ignoreKey, setIgnoreKey] = useState([]);
  const [columnOptions, setColumnOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetches column options for the table
   */
  const fetchColumnOptions = async () => {
    try {
      if (!jobName || !tableName) return;

      const columnsResponse = await forConsoleApi(
        `/table/${tableName}/getColumns`
      );
      if (columnsResponse.status === 200 && columnsResponse.data) {
        setColumnOptions(columnsResponse.data);
      }
    } catch (error) {
      console.error("Error fetching column options:", error);
    }
  };

  /**
   * Fetches filter data including matchedKey and ignoreKey
   */
  const fetchFilterData = async () => {
    setLoading(true);
    try {
      if (!jobName) return;

      let filterRes;
      if (filterId) {
        filterRes = await forConsoleApi(`/filter/${filterId}/get`);
      } else {
        filterRes = await forConsoleApi(`/filter/get/${jobName}/jobName`);
      }

      if (filterRes.status === 200) {
        const filterData = filterRes.data;

        // Set matched keys and ignore keys from filter data
        if (filterData?.matchedKey) {
          setMatchedKey(filterData.matchedKey.split(","));
        }

        if (filterData?.ignoreKey) {
          setIgnoreKey(filterData.ignoreKey.split(","));
        }

        // Fetch column options for dropdowns
        await fetchColumnOptions();

        return filterData;
      }
    } catch (error) {
      console.error("Error fetching filter data:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validates if update mode can be enabled
   */
  const validateUpdateMode = async () => {
    try {
      if (!jobName) {
        toast.error("Please enter Job Name first");
        return false;
      }

      const tableCheckResponse = await forConsoleApi(
        `/jobSchedule/${jobName}/jobName`
      );

      if (tableCheckResponse.status !== 200) {
        toast.error("Run the job once to configure this option.");
        return false;
      }

      // Check if matchedKey exists in mapping
      const filterData = await fetchFilterData();

      if (!filterData) {
        toast.error(
          "Unable to fetch mapping data. Please ensure AR Mapping is configured."
        );
        return false;
      }

      return true;
    } catch (error) {
      toast.error("Run the job once to configure this option.");
      return false;
    }
  };

  /**
   * Handles toggle change between replace and update modes
   * @param {string} value - New toggle value
   */
  const handleToggleChange = async (value) => {
    if (!jobName) {
      toast.error("Please enter Job Name first");
      return;
    }

    if (value === "update") {
      // Validate before switching to update mode
      const isValid = await validateUpdateMode();
      if (isValid) {
        setToggleButton(value);
      }
    } else {
      setToggleButton(value);
      // Clear selections when switching to replace mode
      setMatchedKey([]);
      setIgnoreKey([]);
    }
  };

  /**
   * Saves the filter settings with matched and ignore keys
   * @param {Object} additionalData - Additional filter data to include in the payload
   * @returns {boolean} Success status
   */
  const saveFilterSettings = async (additionalData = {}) => {
    if (toggleButton !== "update") return true;

    try {
      // Validate at least one matching key is selected
      if (matchedKey.length === 0 && toggleButton === "update") {
        toast.error("At least one Matching Key must be selected.");
        return false;
      }

      // Format matchedKey and ignoreKey as comma-separated strings
      const matchedKeyString = matchedKey.join(",");
      const ignoreKeyString = ignoreKey.join(",");

      // Prepare filter payload
      const filterPayload = {
        tableName: tableName,
        jobName: jobName,
        matchedKey: matchedKeyString,
        ignoreKey: ignoreKeyString,
        primaryKey: additionalData.primaryKey || "",
        secondaryKey: additionalData.secondaryKey || "",
        dataTypeChanges: additionalData.dataTypeChanges || [],
        ignoreColumns: additionalData.ignoreColumns || [],
        renameColumns: additionalData.renameColumns || [],
        ...additionalData,
      };

      // Save filter settings
      const filterResponse = await postDataRequest(
        "/filter/save",
        filterPayload
      );

      if (filterResponse?.status !== 200) {
        toast.error("Failed to save matching and ignore keys");
        return false;
      }

      return true;
    } catch (filterError) {
      console.error("Error saving filter settings:", filterError);
      toast.error("Failed to save filter settings");
      return false;
    }
  };

  // Load initial data when jobName or tableName changes
  useEffect(() => {
    if (toggleButton === "update" && jobName && tableName) {
      fetchFilterData();
    }
  }, [jobName, tableName, toggleButton]);

  return {
    matchedKey,
    setMatchedKey,
    ignoreKey,
    setIgnoreKey,
    columnOptions,
    loading,
    fetchFilterData,
    validateUpdateMode,
    handleToggleChange,
    saveFilterSettings,
  };
};

export default useFilterKeys;
