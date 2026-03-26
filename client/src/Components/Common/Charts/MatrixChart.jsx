import React from "react";

const MatrixChart = React.memo(({ data }) => {
  return data.length > 0 ? <p>Matrix Chart Placeholder</p> : <p>No data for Matrix Chart</p>;
});

export default MatrixChart;
