import React from "react";

const CardChartComponent = ({ tableName, columnNames, chartData, count }) => {
  // console.log("Debugging Data:", tableName, columnNames, chartData, count);

  if (!tableName || !columnNames || columnNames.length === 0) {
    return (
      <div style={styles.message}>No table name or columns available.</div>
    );
  }

  const parsedData = Object.entries(
    chartData?.columnNamesWithValuesANDCounting || {},
  )
    .map(([key, count]) => {
      try {
        const parsedKey = JSON.parse(key);
        return { ...parsedKey, count };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const Chartcolumns =
    parsedData.length > 0
      ? Object.keys(parsedData[0]).filter((key) => key !== "count")
      : [];

  return (
    <div style={styles.container}>
      {/* <h2 style={styles.title}>Table: {tableName}</h2> */}
      <p style={styles.count}>
        <strong>Total Records:</strong> {chartData.length || count}
      </p>
      {/* <h3 style={styles.subtitle}>Columns:</h3>
      <ul style={styles.list}>
        {Object.values(columnNames || Chartcolumns)[0]?.map((col, index) => (
          <li key={index} style={styles.listItem}>
            {col}
          </li>
        ))}
      </ul> */}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    width: "70%",
    height: "80%",
    margin: "20px auto",
    padding: "20px",
    // border: "1px solid #ddd",
    borderRadius: "8px",
    // boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    backgroundColor: "var(--surface)",
    textAlign: "center",
    overflowY: "auto", // in case content exceeds height
  },
  title: {
    fontSize: "1.5em",
    marginBottom: "10px",
  },
  count: {
    fontSize: "1.2em",
    marginBottom: "15px",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: "1.2em",
    marginBottom: "10px",
  },
  list: {
    listStyleType: "none",
    padding: 0,
  },
  listItem: {
    fontSize: "1em",
    padding: "5px 0",
  },
  message: {
    textAlign: "center",
    padding: "20px",
    color: "var(--text-sub)",
  },
};

export default CardChartComponent;
