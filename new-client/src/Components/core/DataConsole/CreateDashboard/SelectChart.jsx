import React, { useEffect, useState } from "react";
// import { GrFormNextLink, GrFormPreviousLink } from "react-icons/gr";
import { setDashboardData } from "../../../../redux/Slices/DashboardSlice";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import SelectField from "../../../Common/Fileds/SelectField.jsx";

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
      <div>
        <SelectField
          label="Chart Type"
          name="chartType"
          value={selectedChart}
          onChange={handleChange}
          disabled={!dashboardData?.tableType}
          className="w-full"
        >
          <option value="" disabled>
            Select a chart type
          </option>
          {charts.map((chart, index) => (
            <option key={index} value={chart}>
              {chart}
            </option>
          ))}
        </SelectField>
      </div>
    );
  };

export default SelectChart;
