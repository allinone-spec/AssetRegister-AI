import React, { useState, useEffect, useMemo } from "react";
import { X, Clock, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";
import { getRequest } from "../../Service/admin.save";
import DataTable from "./DataTable";

const HistoryModal = ({
  isOpen,
  onClose,
  numberID,
  tableType, // 'AC' or 'DC'
  title,
  jobName,
  primaryKey,
}) => {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [numberOfRecords, setNumberOfRecords] = useState(10);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setHistoryRecords([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && numberID) {
      fetchHistoryData();
    }
    // Cleanup function to prevent state interference
    return () => {
      if (!isOpen) {
        setHistoryRecords([]);
      }
    };
  }, [isOpen, numberID]);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const response = await getRequest(
        `/importData/${numberID}/rowValues/${numberOfRecords}/xdays?jobName=${jobName}`,
      );

      if (response.status === 200) {
        setHistoryRecords(response.data || []);
      } else {
        toast.error("Failed to fetch history data");
      }
    } catch (error) {
      console.error("Error fetching history data:", error);
      toast.error("Error fetching history data");
    } finally {
      setLoading(false);
    }
  };

  const parseJsonField = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return {};
    }
  };

  // Process history data for DataTable
  const processedHistoryData = useMemo(() => {
    return historyRecords.map((record, index) => {
      const oldColumnKey =
        tableType === "AC" ? "acoldValueJson" : "dcoldValueJson";
      const newColumnKey =
        tableType === "AC" ? "acnewValueJson" : "dcnewValueJson";

      const oldData = parseJsonField(record[oldColumnKey] || "{}");
      const newData = parseJsonField(record[newColumnKey] || "{}");

      // Create processed row with change detection
      const processedRow = {
        id: record.id,
        updatedTime: record.updatedTime,
        recordNumber: index + 1,
      };

      // Get all unique keys from both old and new data
      const allKeys = new Set([
        ...Object.keys(oldData),
        ...Object.keys(newData),
      ]);

      // Create the new format: key with [newValue, oldValue] array
      allKeys.forEach((key) => {
        const oldValue = String(oldData[key] || "").trim();
        const newValue = String(newData[key] || "").trim();

        // Store as [newValue, oldValue] format
        processedRow[key] = [newValue, oldValue];
      });

      return processedRow;
    });
  }, [historyRecords, tableType]);

  // Generate columns dynamically based on available data
  const tableColumns = useMemo(() => {
    if (processedHistoryData.length === 0) return [];

    // Get all unique keys (excluding metadata)
    const allKeys = new Set();
    processedHistoryData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!["id", "recordNumber"].includes(key)) {
          allKeys.add(key);
        }
      });
    });

    const columns = [];

    // Add columns for each data field (showing old -> new if changed)
    Array.from(allKeys)
      .sort()
      .forEach((key) => {
        columns.push({
          header: key,
          accessorKey: key,
          size: 150,
          cell: ({ row }) => {
            const values = row.original[key];

            // Check if values is an array with [newValue, oldValue]
            if (Array.isArray(values) && values.length === 2) {
              const [newValue, oldValue] = values;
              const newVal = String(newValue || "").trim();
              const oldVal = String(oldValue || "").trim();
              const hasChanged = newVal !== oldVal;

              if (hasChanged) {
                return (
                  <div className="space-y-1">
                    <div className="text-green-600 font-medium text-xs">
                      New: {newVal || "NULL"}
                    </div>
                    <div className="text-red-600 text-xs">
                      Old: {oldVal || "NULL"}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="text-text-primary text-xs">
                    {newVal || oldVal || "NULL"}
                  </div>
                );
              }
            } else {
              // Fallback for non-array values
              return (
                <div className="text-text-primary text-xs">
                  {String(values || "NULL")}
                </div>
              );
            }
          },
        });
      });

    return columns;
  }, [processedHistoryData]);

  if (!isOpen) return null;

  return (
    <div>
      <div className="rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-text-sub">
              {`Display history records for last ${numberOfRecords} days.`}
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={numberOfRecords}
              onChange={(e) => setNumberOfRecords(parseInt(e.target.value))}
              className="border bg-input-bg rounded px-3 py-1 w-20 text-sm"
            />
            <button
              onClick={fetchHistoryData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading history...</p>
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No history records found</p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  History Records ({historyRecords.length})
                </h3>
                <div className="text-sm text-text-sub mb-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 bg-green-600"></div>
                      <span className="font-medium">New Value</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 bg-red-600"></div>
                      <span>Old Value</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 bg-gray-400"></div>
                      <span>No Change</span>
                    </div>
                  </div>
                </div>
              </div>

              <DataTable
                data={processedHistoryData}
                columns={tableColumns}
                enableToSearch={false}
                enableRowSelection={false}
                enableSerialNumber={false}
                enableAction={false}
                enableColumnVisibility={false}
                enableGrouping={false}
                enableRowOrdering={false}
                enableColumnOrdering={false}
                enableCreateDashboard={false}
                enableCreateView={false}
                enableCreateEmail={false}
                enableFilter={false}
                isDownload={false}
                pageSize={10}
                className="relative"
                isLoading={loading}
                enableFiltering={false}
                enableEditing={false}
                onDataChange={() => {}}
                tableId={`history-modal-${numberID}-${Date.now()}`}
                key={`history-table-${numberID}-${isOpen}`}
                setSaveFilters={null}
                saveFilters={null}
                isAppliedFilter={false}
                isSelectedObject
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {/* <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default HistoryModal;
