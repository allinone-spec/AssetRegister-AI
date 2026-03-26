import React from "react";
import { Line } from "react-chartjs-2";

const LineChart = React.memo(({ data }) => {
  return <Line data={data} />;
});

export default LineChart;
