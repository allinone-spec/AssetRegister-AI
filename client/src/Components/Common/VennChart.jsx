import React, { useEffect, useRef, useState } from "react";
import * as venn from "venn.js";
import * as d3 from "d3";
import { postDataRequest } from "../../Service/admin.save.js";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A569BD",
  "#D35400",
  "#2E86C1",
  "#45B39D",
  "#F4D03F",
  "#EC7063",
  "#AF7AC5",
  "#5D6D7E",
  "#B03A2E",
  "#2874A6",
  "#239B56",
  "#9B59B6",
  "#F39C12",
  "#1ABC9C",
];

// Helper function to format large numbers
const formatNumber = (num) => {
  if (num === 0) return ""; // Hide zero
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString();
};

// Heuristics to mitigate complete overlap
const JITTER_REL = 0.06;
const EQUAL_TOLERANCE_REL = 0.01;
const INTERSECTION_SHRINK_REL = 0.06;
const MEDIUM_OVERLAP_THRESHOLD = 0.98;
const STRONG_OVERLAP_THRESHOLD = 0.995;
const INTERSECTION_SHRINK_MEDIUM = 0.12;
const INTERSECTION_SHRINK_STRONG = 0.18;
const SUBSET_THRESHOLD_REL = 0.001;
const INTERSECTION_SHRINK_SUBSET = 0.4;

const adjustVennDataForDisplay = (data) => {
  if (!Array.isArray(data) || data.length === 0) return data;

  const cloned = data.map((d) => ({ ...d }));

  const singles = cloned
    .filter((d) => d?.sets?.length === 1)
    .map((d) => ({ key: d.sets[0], size: d.size }));
  const singleSizeByKey = new Map(singles.map((s) => [s.key, s.size]));

  const maxInterBySet = new Map();
  cloned
    .filter((d) => d?.sets?.length > 1)
    .forEach((inter) => {
      inter.sets.forEach((s) => {
        const prev = maxInterBySet.get(s) || 0;
        if (inter.size > prev) maxInterBySet.set(s, inter.size);
      });
    });

  const singlesSorted = [...singles].sort((a, b) => a.size - b.size);
  const groups = [];
  let group = [];
  singlesSorted.forEach((item) => {
    if (group.length === 0) {
      group.push(item);
      return;
    }
    const ref = group[0].size;
    const relDiff = Math.abs(item.size - ref) / (ref || 1);
    if (relDiff <= EQUAL_TOLERANCE_REL) {
      group.push(item);
    } else {
      groups.push(group);
      group = [item];
    }
  });
  if (group.length) groups.push(group);

  groups.forEach((g) => {
    if (g.length <= 1) return;
    const steps = Math.ceil(g.length / 2);
    const stepSize = JITTER_REL / steps;
    const ordered = [...g].sort((a, b) => a.key.localeCompare(b.key));
    ordered.forEach((item, idx) => {
      const k = idx;
      const offsetIndex =
        k === 0 ? 0 : (k % 2 === 1 ? -1 : 1) * Math.ceil(k / 2);
      let factor = 1 + offsetIndex * stepSize;
      const maxInter = maxInterBySet.get(item.key) || 0;
      const minAllowed =
        item.size > 0
          ? Math.min(1, Math.max((maxInter * 1.05) / item.size, 0))
          : 1;
      const minFactor = Math.max(minAllowed, 1 - JITTER_REL);
      const maxFactor = 1 + JITTER_REL;
      factor = Math.max(minFactor, Math.min(maxFactor, factor));
      singleSizeByKey.set(item.key, item.size * factor);
    });
  });

  const adjustedSingles = singleSizeByKey;

  const adjusted = cloned.map((d) => {
    const out = { ...d, originalSize: d.size };
    if (d?.sets?.length === 1) {
      const key = d.sets[0];
      out.size = adjustedSingles.get(key) ?? d.size;
      return out;
    }
    const parentMin = Math.min(
      ...(d?.sets?.map(
        (s) => adjustedSingles.get(s) || singleSizeByKey.get(s) || 0
      ) || [])
    );
    if (parentMin > 0) {
      const closeness = d.size / parentMin;
      let shrink = 0;
      if (closeness >= 1 - SUBSET_THRESHOLD_REL) {
        shrink = INTERSECTION_SHRINK_SUBSET;
      } else if (closeness >= STRONG_OVERLAP_THRESHOLD) {
        shrink = INTERSECTION_SHRINK_STRONG;
      } else if (closeness >= MEDIUM_OVERLAP_THRESHOLD) {
        shrink = INTERSECTION_SHRINK_MEDIUM;
      } else if (d.size >= parentMin * (1 - EQUAL_TOLERANCE_REL / 2)) {
        shrink = INTERSECTION_SHRINK_REL;
      }
      if (shrink > 0) {
        out.size = Math.max(0, parentMin * (1 - shrink));
      }
    }
    return out;
  });

  return adjusted;
};

// Helper to detect label collisions and adjust positions
const adjustLabelPositions = (svg, fontSize) => {
  const labels = [];
  const padding = 5;

  // Collect all label positions
  svg.selectAll(".venn-area text.label").each(function () {
    const text = d3.select(this);
    const bbox = this.getBBox();
    labels.push({
      element: text,
      x: parseFloat(text.attr("x")) || 0,
      y: parseFloat(text.attr("y")) || 0,
      width: bbox.width,
      height: bbox.height,
    });
  });

  // Simple collision detection and adjustment
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i];
      const b = labels[j];

      // Check if labels overlap
      const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2 + padding;
      const overlapY =
        Math.abs(a.y - b.y) < (a.height + b.height) / 2 + padding;

      if (overlapX && overlapY) {
        // Move the second label slightly
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const distance = fontSize * 1.5;
        b.x += Math.cos(angle) * distance;
        b.y += Math.sin(angle) * distance;
        b.element.attr("x", b.x).attr("y", b.y);
      }
    }
  }
};

const VennChart = ({
  tableName,
  columnNames,
  setSelectedSlice,
  setShowModal,
  showLabelsStatus,
  vennChartData,
}) => {
  if (!tableName || tableName.length < 2 || !columnNames) {
    return (
      <div className="text-red-500">
        ⚠️ Venn diagram requires at least two tables.
      </div>
    );
  }

  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 400 });
  const [vennData, setVennData] = useState([]);
  const resizeObserverRef = useRef(null);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        const width = Math.max(250, Math.min(containerWidth - 40, 1200));
        const height = Math.max(
          200,
          Math.min(containerHeight - 40, width * 0.75)
        );

        setDimensions((prev) => {
          if (
            Math.abs(prev.width - width) > 5 ||
            Math.abs(prev.height - height) > 5
          ) {
            return { width, height };
          }
          return prev;
        });
      }
    };

    const initialResize = () => {
      setTimeout(handleResize, 10);
    };
    initialResize();

    if (containerRef.current && "ResizeObserver" in window) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        requestAnimationFrame(() => {
          handleResize();
        });
      });
      resizeObserverRef.current.observe(containerRef.current);
    } else {
      const debouncedResize = () => {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(handleResize, 100);
      };
      window.addEventListener("resize", debouncedResize);

      return () => {
        window.removeEventListener("resize", debouncedResize);
        clearTimeout(window.resizeTimeout);
      };
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (vennChartData) {
      setVennData(vennChartData || []);
      return;
    }
    const payload = Object.entries(columnNames).map(([key, val]) => ({
      tableName: key,
      columnNames: val,
    }));

    postDataRequest("/table/get/VennChart/data", {
      tableData: payload,
    })
      .then(({ data }) => {
        const formattedData = data.map((d) => ({
          ...d,
          label: d.sets.length === 1 ? d.sets[0] : d.sets.join(" ∩ "),
        }));
        setVennData(formattedData);
      })
      .catch((error) => {
        console.error("Error fetching Venn chart data:", error);
      });
  }, [columnNames, vennChartData]);

  useEffect(() => {
    if (!chartRef.current) return;

    d3.select(chartRef.current).selectAll("*").remove();

    if (vennData.length === 0) return;

    const fontSize = Math.max(
      10,
      Math.min(18, Math.min(dimensions.width / 35, dimensions.height / 25))
    );

    const chart = venn
      .VennDiagram()
      .wrap(false)
      .fontSize(`${fontSize}px`)
      .width(dimensions.width)
      .height(dimensions.height);

    const div = d3.select(chartRef.current);
    const layoutData = adjustVennDataForDisplay(vennData);

    try {
      div.datum(layoutData).call(chart);

      const svg = div.select("svg");
      svg
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)
        .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .style("overflow", "visible");

      // Style paths
      div
        .selectAll(".venn-area path")
        .style("fill", function (d, i) {
          return COLORS[i % COLORS.length];
        })
        .style("fill-opacity", function (d) {
          return d.sets.length === 1 ? 0.18 : 0.08;
        })
        .style("stroke", function (d) {
          return d.sets.length === 1 ? "#00000033" : "#ffffff";
        })
        .style("stroke-width", function (d) {
          return d.sets.length === 1 ? 1 : 0;
        });

      // Update labels with better formatting
      div.selectAll(".venn-area").each(function (d, i) {
        const area = d3.select(this);
        const displaySize = d.originalSize ?? d.size;
        const formattedSize = formatNumber(displaySize);

        // Add background to labels for better visibility
        const text = area.select("text.label");
        text
          .text(formattedSize)
          .style("fill", "#333")
          .style("font-size", `${fontSize}px`)
          .style("font-weight", "bold")
          .style("text-shadow", "0 0 3px white, 0 0 3px white, 0 0 3px white");

        area.select("text.tooltip").style("display", "none");
      });

      // Adjust label positions to avoid collisions
      setTimeout(() => {
        adjustLabelPositions(svg, fontSize);
      }, 50);

      // Create tooltip
      let tooltip = d3.select(containerRef.current).select(".venn-tooltip");
      if (tooltip.empty()) {
        tooltip = d3
          .select(containerRef.current)
          .append("div")
          .attr("class", "venn-tooltip")
          .style("position", "absolute")
          .style("opacity", 0)
          .style("background-color", "white")
          .style("border", "1px solid #ccc")
          .style("padding", "8px 12px")
          .style("border-radius", "4px")
          .style("pointer-events", "none")
          .style("font-size", "12px")
          .style("z-index", "1000")
          .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
          .style("max-width", "250px")
          .style("word-wrap", "break-word");
      }

      // Hover effects
      div
        .selectAll(".venn-area")
        .on("mouseover", function (event, d) {
          venn.sortAreas(div, d);

          const displaySize = d.originalSize ?? d.size;
          tooltip.transition().duration(400).style("opacity", 0.95);
          tooltip.html(
            `<strong 
            style="color: ${
              // COLORS[
              //   vennData.findIndex(
              //     (v) => v.sets.join(",") === d.sets.join(",")
              //   ) % COLORS.length
              // ]
              ""
            };"
            >${
              d.label
            }</strong><br/><span style="color: #666;">Size: ${displaySize.toLocaleString()}</span>`
          );

          d3.select(this)
            .transition("tooltip")
            .duration(400)
            .select("path")
            .style("stroke-width", 3)
            .style("fill-opacity", d.sets.length === 1 ? 0.35 : 0.25)
            .style("stroke-opacity", 1)
            .style(
              "stroke",
              1
              // COLORS[
              //   vennData.findIndex(
              //     (v) => v.sets.join(",") === d.sets.join(",")
              //   ) % COLORS.length
              // ]
            );
        })
        .on("mousemove", function (event) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const tooltipNode = tooltip.node();
          const tooltipRect = tooltipNode
            ? tooltipNode.getBoundingClientRect()
            : { width: 200, height: 50 };

          let left = event.clientX - containerRect.left + 15;
          let top = event.clientY - containerRect.top - 10;

          if (left + tooltipRect.width > containerRect.width) {
            left = event.clientX - containerRect.left - tooltipRect.width - 15;
          }
          if (top < 0) {
            top = event.clientX - containerRect.top + 25;
          }
          if (top + tooltipRect.height > containerRect.height) {
            top = containerRect.height - tooltipRect.height - 10;
          }

          tooltip
            .style("left", Math.max(0, left) + "px")
            .style("top", Math.max(0, top) + "px");
        })
        .on("mouseout", function (event, d) {
          tooltip.transition().duration(400).style("opacity", 0);
          d3.select(this)
            .transition("tooltip")
            .duration(400)
            .select("path")
            .style("stroke-width", d.sets.length === 1 ? 1 : 0)
            .style("fill-opacity", d.sets.length === 1 ? 0.18 : 0.08)
            .style("stroke-opacity", d.sets.length === 1 ? 1 : 0);
        });

      const handleClick = (event) => {
        if (event.target.__data__) {
          const tableNames = [...new Set(event.target.__data__.sets)];
          const result = tableNames.map((tableName) => ({
            tableName: tableName,
            columnNames: columnNames[tableName] || [],
          }));

          if (setSelectedSlice && setShowModal) {
            setSelectedSlice(result);
            setShowModal(true);
          }
        }
      };

      div.selectAll(".venn-area").on("click", handleClick);

      return () => {
        tooltip.remove();
      };
    } catch (error) {
      console.error("Error creating Venn diagram:", error);
      div
        .append("div")
        .style("color", "red")
        .style("padding", "20px")
        .style("text-align", "center")
        .text("Error rendering Venn diagram");
    }
  }, [vennData, dimensions]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "200px",
        minWidth: "250px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {showLabelsStatus && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          {vennData
            .filter((v) => v.size > 0)
            .map((v, index) => (
              <div
                key={v.label}
                className="flex items-start cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200"
                onMouseEnter={() => {
                  // Highlight corresponding venn area
                  const chartDiv = d3.select(chartRef.current);
                  chartDiv.selectAll(".venn-area").each(function (d) {
                    const area = d3.select(this);
                    if (d.sets.join(",") === v.sets.join(",")) {
                      // Highlight this area
                      area
                        .select("path")
                        .style("stroke-width", 3)
                        .style(
                          "fill-opacity",
                          d.sets.length === 1 ? 0.35 : 0.25
                        )
                        .style("stroke-opacity", 1)
                        .style(
                          "stroke",
                          d.sets.length === 1 ? "#00000033" : "#ffffff"
                        );

                      // Show tooltip if available
                      // const tooltip = d3
                      //   .select(containerRef.current)
                      //   .select(".venn-tooltip");
                      // if (!tooltip.empty()) {
                      //   const displaySize = d.originalSize ?? d.size;
                      //   tooltip
                      //     .transition()
                      //     .duration(200)
                      //     .style("opacity", 0.95);
                      //   tooltip.html(
                      //     `<strong>${
                      //       d.label
                      //     }</strong><br/><span style="color: #666;">Size: ${displaySize.toLocaleString()}</span>`
                      //   );
                      // }
                    } else {
                      // Dim other areas
                      area
                        .select("path")
                        .style("fill-opacity", d.sets.length === 1 ? 0.1 : 0.05)
                        .style("stroke-opacity", 0.3);
                    }
                  });
                }}
                onMouseLeave={() => {
                  // Reset all areas to normal state
                  const chartDiv = d3.select(chartRef.current);
                  chartDiv.selectAll(".venn-area").each(function (d) {
                    const area = d3.select(this);
                    area
                      .select("path")
                      .style("stroke-width", d.sets.length === 1 ? 1 : 0)
                      .style("fill-opacity", d.sets.length === 1 ? 0.18 : 0.08)
                      .style("stroke-opacity", d.sets.length === 1 ? 1 : 0)
                      .style(
                        "stroke",
                        d.sets.length === 1 ? "#00000033" : "#ffffff"
                      );
                  });

                  // Hide tooltip
                  const tooltip = d3
                    .select(containerRef.current)
                    .select(".venn-tooltip");
                  if (!tooltip.empty()) {
                    tooltip.transition().duration(200).style("opacity", 0);
                  }
                }}
                onClick={() => {
                  // Same click behavior as clicking on the venn area
                  const result = v.sets.map((tableName) => ({
                    tableName: tableName,
                    columnNames: columnNames[tableName] || [],
                  }));

                  if (setSelectedSlice && setShowModal) {
                    setSelectedSlice(result);
                    setShowModal(true);
                  }
                }}
              >
                <div
                  className="font-semibold rounded-full w-2 h-2"
                  style={{
                    backgroundColor: COLORS[index % COLORS.length],
                    opacity: 0.4,
                    marginTop: 5,
                  }}
                />
                <div className="text-[12px] ml-2">{v.label}</div>
              </div>
            ))}
        </div>
      )}
      <div
        ref={chartRef}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: "100%",
          maxHeight: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      />
    </div>
  );
};

export default VennChart;
