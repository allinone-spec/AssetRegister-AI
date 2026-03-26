import React from "react";

const TableComponent = ({ data, columns, filters, activeFilter, setActiveFilter, handleFilterChange }) => {
    return (
        <div className="overflow-x-auto min-h-[30vh] h-auto" style={{ msOverflowStyle: "none" }}>
            <table className="min-w-full border-collapse border border-gray-200">
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index} className="p-2 border border-gray-300 text-left w-full min-w-60 relative">
                                <div className="flex items-center justify-between">
                                    <span className="text-black cursor-pointer" onClick={() => setActiveFilter(col.field)}>
                                        {col.label}
                                    </span>
                                </div>
                                {(activeFilter === col.field || filters[col.field]) && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-lg p-2 border rounded">
                                        <input
                                            type="text"
                                            className="border rounded p-1 text-sm w-full"
                                            placeholder={`Filter ${col.label}`}
                                            value={filters[col.field] || ""}
                                            onChange={(e) => handleFilterChange(e, col.field)}
                                        />
                                    </div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-100">
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} className="p-2 border border-gray-300">
                                        {row[col.field]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="text-center p-4">No Data Found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TableComponent;
