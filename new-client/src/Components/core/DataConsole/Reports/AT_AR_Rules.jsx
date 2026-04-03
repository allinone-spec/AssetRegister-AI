import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { getRequest } from "../../../../Service/Console.service";
import DataTable from "../../../Common/DataTable";
import { patchRequest } from "../../../../Service/admin.save";
import PageLayout from "../../../Common/PageLayout";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import GridButton from "../../../Common/GridButton";
import LoadingBar from "../../../Common/LoadingBar";

const AT_AR_Rules = ({ routeName, setEditJob, setOpenDrawer }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const { permissionList } = useSelector((state) => state.permission);
  const [data, setData] = useState([]);
  const [view, setView] = useState("table");
  const [loading, setLoading] = useState(false);
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
    setOpenDrawer(row);
    setEditJob(true);
    // navigate(`/data-console/reports/by-ar-resource/jobs/${row?.jobName}`, {
    //   state: row,
    // });
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

  if (loading) return <LoadingBar />;

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
        <div className="flex gap-3 sm:gap-6 justify-start">
          <div className="flex items-center gap-2">
            {/* <span className="text-sm font-medium text-gray-600">Total:</span> */}
            <div className="font-extrabold text-2xl">By AR Source</div>
            <span className="inline-flex items-end ml-2 rounded-full text-sm text-gray-600">
              {rows.length} Total
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3">
          <GridButton setView={setView} view={view} />
        </div>
      </div>
      {rows.length ? (
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
          cardNavigateEditHandler={navigateEditHandler}
          tableView={view}
          isDrawer
          cardFiled={{
            id: "jobName",
            title: "jobName",
            subTitle1: "id",
            subTitle2: "providerName",
            status: "status",
            assets: "noOfRecords",
          }}
        />
      ) : (
        <div className="flex justify-center items-center h-[75vh]">
          No Data Found
        </div>
      )}
    </PageLayout>
  );
};

export default AT_AR_Rules;
