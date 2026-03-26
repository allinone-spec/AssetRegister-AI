import React, { useEffect, useState } from "react";
// import { GrFormNextLink, GrFormPreviousLink } from "react-icons/gr";
import { setDashboardData } from "../../../../redux/Slices/DashboardSlice";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

const SelectChart = () =>
  // {
  //   gotoNext,
  //   textColor,
  //   borderColor,
  //   lightbackground,
  //   textWhiteColor,
  // }
  {
    const dispatch = useDispatch();
    const { dashboardData } = useSelector((state) => state.dashboard);
    const { state } = useLocation();

    const charts =
      dashboardData?.tableType === "register" || state?.viewId
        ? [
            "Pie Chart",
            "Bar Chart",
            "Line Chart",
            "Card Chart",
            "Doughnut Chart",
            "Radar Chart",
            "Polar Area Chart",
            "Bubble Chart",
            "Scatter Chart",
            "Pivot",
          ]
        : [
            "Pie Chart",
            "Bar Chart",
            "Line Chart",
            "Matrix Chart",
            "Venn Chart",
            "Card Chart",
            "Doughnut Chart",
            "Radar Chart",
            "Polar Area Chart",
            "Bubble Chart",
            "Scatter Chart",
            "Pivot",
          ];

    // Set selected chart from Redux state
    const [selectedChart, setSelectedChart] = useState(
      dashboardData?.chartType || "",
    );

    useEffect(() => {
      setSelectedChart(dashboardData?.chartType || "");
    }, [dashboardData]);

    const handleChange = (event) => {
      const chart = event.target.value;
      dispatch(setDashboardData({ field: "chartType", value: chart }));
      setSelectedChart(chart);
    };

    // const GoNext = () => {
    //   if (!dashboardData.chartType) {
    //     toast.error("Select Any Chart Type");
    //     return;
    //   }
    //   gotoNext(2);
    // };

    return (
      <div
      // className="py-2 max-w-full h-full mx-auto flex flex-col justify-between"
      >
        {/* <p className="text-center mb-4 text-lg font-semibold" style={{ color: textColor }}>
        Select a Chart
      </p> */}

        {/* Dropdown Select */}
        {/* <div className="mb-4"> */}
        <select
          value={selectedChart}
          onChange={handleChange}
          disabled={!dashboardData?.tableType}
          className="border border-gray-300 font-semibold text-gray-600 text-sm rounded-md py-4 px-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" disabled>
            Select a chart type
          </option>
          {charts.map((chart, index) => (
            <option key={index} value={chart}>
              {chart}
            </option>
          ))}
        </select>
        {/* </div> */}

        {/* <section className="w-full flex items-center justify-between">
        <div onClick={() => gotoNext(0)} className="text-right flex cursor-pointer items-center">
          <GrFormPreviousLink className="w-8" />
          <span className="text-[0.8rem]" style={{ color: textColor }}>
            Back
          </span>
        </div>

        <div onClick={() => GoNext()} className="text-right flex cursor-pointer items-center">
          <span className="text-[0.8rem]" style={{ color: textColor }}>
            Next
          </span>
          <GrFormNextLink className="w-8" />
        </div>
      </section> */}
      </div>
    );
  };

export default SelectChart;
