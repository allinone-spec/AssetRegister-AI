import React from "react";
import {VennDiagram} from "@upsetjs/react";

const VennChart = React.memo(({ sets, combinations, selection, onHover }) => {
  return sets.length > 0 ? (
    <VennDiagram
      sets={sets}
      combinations={combinations}
      width={780}
      height={400}
      selection={selection}
      onHover={onHover}
      colorScheme={["#007AFF", "#FF3366", "#00C49A", "#FFA600", "#7B68EE"]}
      backgroundColor="#F8F9FA"
      strokeColor="#333333"
    />
  ) : (
    <p>No data for Venn Diagram</p>
  );
});

export default VennChart;
