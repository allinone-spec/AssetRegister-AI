import { useEffect, useMemo, useState } from "react";
import { Switch, FormControlLabel, CircularProgress } from "@mui/material";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { getRequest } from "../../../../Service/Console.service";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import DataTable from "../../../Common/DataTable";
import { patchRequest } from "../../../../Service/admin.save";
import PageLayout from "../../../Common/PageLayout";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";

const AT_AR_Rules = ({ routeName }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [filteredTableData, setFilteredTableData] = useState(0);

  useEffect(() => {
    dispatch(setHeadingTitle("By AR Source"));
  }, []);

  const fetchSoruceData = async (showLoading = true) => {
    showLoading && setLoading(true);
    try {
      const response = await getRequest("/table/get/jobNames");
      if (response?.status === 200) {
        setData(
          response.data.map((v) => ({
            jobName: v?.jobName,
            ...v,
          })) || [],
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoruceData();
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  const handleUpdatePriority = (priority) => {
    patchRequest("/jobSchedule/updatePriority", priority);
  };

  const rows = useMemo(() => {
    return selectedObject
      ? data
          .filter((job) => job?.object == selectedObject)
          .sort((a, b) => a.priority - b.priority)
      : data.sort((a, b) => a.priority - b.priority);
  }, [selectedObject, data]);

  const navigateEditHandler = (row) => {
    navigate(`/data-console/reports/by-ar-resource/jobs/${row?.jobName}`, {
      state: row,
    });
  };

  const column = rows.length
    ? Object.keys(...rows).map((key) => ({
        accessorKey: key,
        header: key,
        enableLinkHandler:
          key === "jobName" &&
          permissionList?.includes(routeName) &&
          // permissionDetails[routeName]?.hasWriteOnly &&
          navigateEditHandler,
        enableGrouping: true,
      }))
    : [];

  return (
    <PageLayout className={`${!showTable && "!bg-transparent"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex justify-between items-center m-4 my-7">
          <FormControlLabel
            className="absolute"
            control={
              <Switch
                checked={showTable}
                onChange={() => setShowTable(!showTable)}
              />
            }
            label={showTable ? "Hide Table" : "Show Table"}
          />
        </div>
        {showTable && (
          <div className="flex gap-3 sm:gap-6 justify-between absolute right-7">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Total:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {rows.length}
              </span>
            </div>
            {filteredTableData !== rows.length && rows.length ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Filtered:
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  {filteredTableData}
                </span>
              </div>
            ) : (
              <></>
            )}
          </div>
        )}
      </div>
      {showTable ? (
        loading ? (
          <div className="flex justify-center items-center h-[75vh]">
            <CircularProgress />
          </div>
        ) : rows.length ? (
          <DataTable
            key={selectedObject || "all"}
            isSelectedObject
            data={rows}
            columns={column}
            enableRowOrdering={true}
            enableRowSelection={false}
            enableFiltering={false}
            enableEditing={true}
            enableAction={false}
            enableGrouping={true}
            enableCreateView={false}
            enableCreateDashboard={false}
            onDataChange={() => {}}
            dashboardData={{ tableType: "by-ar-resource" }}
            routeName={routeName}
            handleUpdatePriority={handleUpdatePriority}
            setFilteredData={setFilteredTableData}
            tableId={1}
          />
        ) : (
          <div className="flex justify-center items-center h-[75vh]">
            No Data Found
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {rows.length > 0 ? (
            rows.map((jobName, index) => (
              <Link
                key={index}
                to={`/data-console/reports/by-ar-resource/jobs/${jobName?.jobName}`}
                state={jobName}
              >
                <div className="flex w-[100%] rounded-[20px] justify-between p-4 items-center bg-[#ffffff] shadow-md">
                  <img
                    src="https://cdn.paperpile.com/guides/img/find-credible-illustr-400x400.png?v=351"
                    alt="job"
                    className="w-20 h-20 object-cover rounded-full"
                  />
                  <div className="w-[75%] ml-2">
                    <h1 className="font-semibold text-[0.96rem] leading-[25px]">
                      {jobName?.jobName}
                    </h1>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center text-gray-500 col-span-2">
              No data available.
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default AT_AR_Rules;
