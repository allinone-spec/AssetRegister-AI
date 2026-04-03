import { useEffect, useRef, useState, memo } from "react";
import { CircularProgress } from "@mui/material";
import { FiDownload } from "react-icons/fi";
import { useLocation } from "react-router-dom";
import { getCommonRegisterRequest } from "../../../../Service/Console.service";
import DataTable from "../../../Common/DataTable";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  options,
} from "../../../../Utility/utilityFunction";
import { useSelector } from "react-redux";

const RegisterDetail = ({ columnName, primaryValue }) => {
  const objectId = useSelector((state) => state.selectedObject.value);
  const [loading, setLoading] = useState(false);
  const [sourceData, setSourceData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMountedRef = useRef(true);
  const lastRequestRef = useRef("");

  const fetchTableData = async () => {
    if (!isMountedRef.current) return;
    // Create a unique request identifier
    const requestId = `${objectId}-${columnName}-${primaryValue}`;

    // If this is the same request, don't fetch again
    if (lastRequestRef.current === requestId) return;

    // Update the last request identifier
    lastRequestRef.current = requestId;

    try {
      setLoading(true);
      const { data } = await getCommonRegisterRequest(
        `/AssetRegister/${objectId}/get/${columnName}/${primaryValue}/getColumnValues`,
      );

      // Only update state if the request wasn't aborted and component is still mounted
      if (isMountedRef.current) {
        const modifyData = Object.entries(data).flatMap(([source, values]) =>
          values.map((value) => ({ source, value })),
        );
        setSourceData(modifyData);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.log(error, "fetching click table data");
        setSourceData([]);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;

    if (objectId && columnName && primaryValue) {
      fetchTableData();
    }

    // Cleanup function to abort any pending request when component unmounts or dependencies change
    return () => {
      isMountedRef.current = false;
    };
  }, [objectId, columnName, primaryValue]);

  const { pathname } = useLocation();

  const handleDownload = (option) => {
    if (option === "Excel") exportToExcel(pathname, sourceData);
    if (option === "PDF") exportToPDF(pathname, sourceData);
    if (option === "CSV") exportToCSV(pathname, sourceData);
    setIsModalOpen(false);
  };

  const handleIconClick = () => {
    setIsModalOpen((prev) => !prev);
  };

  const column =
    sourceData.length > 0
      ? Object.keys(sourceData[0] || {}).map((key) => ({
          accessorKey: key,
          header: key,
        }))
      : [];

  return (
    <div>
      <div className="flex justify-between">
        <h2 className="text-xl font-bold mb-4">
          {primaryValue} - {columnName}
        </h2>
        <FiDownload
          className="cursor-pointer mr-8"
          onClick={handleIconClick}
          size={24}
        />
      </div>
      <div className="relative flex justify-end mx-4 mt-2">
        {isModalOpen && (
          <div className="absolute top-0 right-0 z-9999  mt-2 bg-white border rounded-md shadow-md">
            <ul className="py-1">
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
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <CircularProgress />
        </div>
      ) : sourceData.length ? (
        <DataTable
          key={`${objectId}-${columnName}-${primaryValue}`}
          data={sourceData}
          columns={column}
          enableRowOrdering={false}
          enableRowSelection={false}
          enableFiltering={false}
          enableEditing={false}
          enableAction={false}
          enableGrouping={false}
          enableFilter={false}
          onDataChange={() => {}}
          enableColumnOrdering={false}
          enableColumnVisibility={false}
          enableToSearch={false}
          className="relative"
          isSelectedObject
          isAppliedFilter={false}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          No Data Found
        </div>
      )}
    </div>
  );
};

export default memo(RegisterDetail);
