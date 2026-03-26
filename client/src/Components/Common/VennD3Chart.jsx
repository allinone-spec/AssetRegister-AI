import React, { useMemo, useState, useEffect, useRef } from "react";
import { extractSets, generateCombinations, VennDiagram } from "@upsetjs/react";
import { useTheme } from "../../ThemeContext";

// Custom color palette for circles
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A569BD", "#D35400"];
const HOVER_COLOR = "#f54291"; // Hover color for intersections

const VennChart = ({ tableName, columnNames, chartData, height = 500, width = 800 }) => {
    if (!tableName || tableName.length < 2 || !columnNames) {
        return (
            <div className="text-red-500">
                ⚠️ Venn diagram requires at least two tables.
            </div>
        );
    }
    const { colorPalette, selectedColor, bgColor } = useTheme();
    const { backgroundColor } = bgColor;

    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width, height });

    // Resize chart to match container
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const elems = useMemo(() => {
        const allColumns = Object.values(columnNames).flat();
        const uniqueColumns = [...new Set(allColumns)];

        return uniqueColumns.map((column) => ({
            name: column,
            sets: tableName.filter((table) => (columnNames[table] || []).includes(column)),
        }));
    }, [tableName, columnNames]);
    const sets = useMemo(() => {
        const extractedSets = extractSets(elems);
        // Apply colors to each set
        return extractedSets.map((set, i) => ({
            ...set,
            color: COLORS[i % COLORS.length],
            opacity: 0.7
        }));
    }, [elems]);

    const combinations = useMemo(() => generateCombinations(sets), [sets]);
    const [selection, setSelection] = useState(null);

    return (
        <div
            ref={containerRef}
            className="w-full h-[100%] flex justify-center items-center"
        >
            <VennDiagram
                sets={sets}
                combinations={combinations}
                width={containerSize.width}
                height={containerSize.height}
                selection={selection}
                onHover={setSelection}
                backgroundColor={backgroundColor || "#fff"}
                selectionColor={HOVER_COLOR}
                hasSelectionOpacity={0.8}
                padding={0.1}
                strokeWidth={2}
            />
        </div>
    );
};

export default VennChart;
