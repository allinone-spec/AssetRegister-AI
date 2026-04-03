export default function AdvanceFilterIsAnyOfList({
  filter,
  isLoading,
  availableValues,
  currentSelectedValues,
  handleValueSelection,
}) {
  return (
    ["Is any of", "Is none of"].includes(filter.operator) &&
    filter.column && (
      <div className="mt-3">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
              Loading values...
            </div>
          </div>
        ) : (
          <>
            {/* Header with selection count */}
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Select Values ({currentSelectedValues.size} selected):
              </label>
            </div>

            {/* Values container */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
              {availableValues.length > 0 ? (
                <>
                  {availableValues.slice(0, 1000).map((value) => {
                    const valueKey =
                      typeof value === "number" ? value : value.toLowerCase();
                    const isChecked = currentSelectedValues.has(valueKey);

                    return (
                      <label
                        key={value}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleValueSelection(valueKey)}
                          className="w-4 h-4 text-accent bg-gray-100 dark:bg-gray-600 border-accent dark:border-gray-500 rounded focus:ring-accent focus:ring-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                          {String(value)}
                        </span>
                      </label>
                    );
                  })}

                  {availableValues.length > 1000 && (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-600 border-t border-gray-200 dark:border-gray-600">
                      Showing first 1000 values...
                    </div>
                  )}
                </>
              ) : (
                <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No values available
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  );
}
