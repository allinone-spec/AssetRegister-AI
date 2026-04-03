export const extractSets = (data) => {
    return [...new Set(data.flatMap((d) => d.sets))];
  };
  
  export const generateCombinations = (sets) => {
    return sets.map((set, index) => ({
      sets: [set],
      size: index * 10 + 10, // Sample size logic
    }));
  };
  
  export const pieChartConfig = (chartData, COLORS) => ({
    labels: chartData?.map((item) => item.name || "Unknown"),
    datasets: [
      {
        data: chartData?.map((item) => item.count || 0),
        backgroundColor: COLORS,
        hoverBackgroundColor: COLORS,
      },
    ],
  });
  
  export const pieChartOptions = {
    plugins: {
      legend: {
        position: "left",
        labels: {
          usePointStyle: true,
          font: { size: 14 },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };
  