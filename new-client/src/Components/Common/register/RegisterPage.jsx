import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../PageLayout";
import RegisterSidebar from "./RegisterSidebar";
import Summary from "../../core/DataConsole/Register/Summary";
import { Register } from "../../core/DataConsole/Register/Register";
import { RegisterDrawer } from "../sideDrawer/RegisterDrawer";

export default function RegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get("tab") === "detailed" ? "Detailed" : "Summary",
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "detailed") setActiveTab("Detailed");
    else setActiveTab("Summary");
  }, [searchParams]);
  const [editJob, setEditJob] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [summaryDrawerData, setSummaryDrawerData] = useState(null);

  const handleDrawer = (val) => {
    console.log("val", val);
    setOpenDrawer(val);
    if (editJob) setEditJob(false);
  };

  const handleSummaryChartClick = (data) => {
    setSummaryDrawerData(data);
    setOpenDrawer({ type: "summary", selectedSlice: data.selectedSlice });
  };

  const tabMap = () => {
    switch (activeTab) {
      case "Summary":
        return (
          <Summary
            routeName="Register"
            onChartClick={handleSummaryChartClick}
          />
        );
      case "Detailed":
        return (
          <Register
            routeName="Register"
            handleDrawer={handleDrawer}
            setOpenDrawer={setOpenDrawer}
            openDrawer={openDrawer}
          />
        );
    }
  };
  const activeTabHandler = useCallback(
    (val) => {
      setActiveTab(val);
      setEditJob(false);
      setOpenDrawer(null);
      setSummaryDrawerData(null);
      if (val === "Detailed") {
        setSearchParams({ tab: "detailed" }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setSearchParams],
  );

  return (
    <div className="flex">
      <PageLayout className="flex-1 bg-surface text-primary rounded-xl border border-surface shadow-sm p-8 h-[90vh] my-4 mx-8">
        {/* Header */}
        <div className="mb-6 pb-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-text-primary">Register</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account Register and set e-mail preferences.
          </p>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex gap-10">
          <RegisterSidebar active={activeTab} onChange={activeTabHandler} />
          <div className="flex-1 min-w-0">{tabMap()}</div>
        </div>
      </PageLayout>
      <RegisterDrawer
        showModal={openDrawer?.columnName}
        primaryKeyVal={openDrawer?.primaryValue}
        open={openDrawer}
        activeTab={activeTab}
        selectedChartType={summaryDrawerData?.chartType}
        vennChartData={summaryDrawerData?.vennChartData}
        chartConfig={summaryDrawerData?.chartConfig}
        selectedSlice={summaryDrawerData?.selectedSlice}
        onClose={() => {
          setEditJob(false);
          setOpenDrawer(null);
          setSummaryDrawerData(null);
        }}
      />
    </div>
  );
}
