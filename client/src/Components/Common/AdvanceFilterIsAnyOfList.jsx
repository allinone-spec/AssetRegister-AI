import { Checkbox, FormControlLabel, Typography } from "@mui/material";

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
      <div style={{ marginTop: "10px" }}>
        {/* <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <Typography variant="body2">
                      Select Values ({currentSelectedValues.size} selected):
                    </Typography>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button
                        size="small"
                        onClick={() =>
                          handleSelectAll(group, index, filter.column)
                        }
                        sx={{ fontSize: "12px" }}
                        disabled={isLoading}
                      >
                        Select All
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeselectAll(group, index)}
                        sx={{ fontSize: "12px" }}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div> */}

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Typography variant="body2">Loading values...</Typography>
          </div>
        ) : (
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "8px",
              backgroundColor: "#fafafa",
            }}
          >
            {availableValues.slice(0, 1000).map((value) => (
              <FormControlLabel
                key={value}
                control={
                  <Checkbox
                    checked={currentSelectedValues.has(
                      typeof value === "number" ? value : value.toLowerCase()
                    )}
                    onChange={() =>
                      handleValueSelection(
                        typeof value === "number" ? value : value.toLowerCase()
                      )
                    }
                    size="small"
                  />
                }
                label={<Typography variant="body2">{String(value)}</Typography>}
                sx={{ display: "flex", margin: "2px 0" }}
              />
            ))}

            {availableValues.length > 1000 && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ display: "block", mt: 1 }}
              >
                Showing first 1000 values...
              </Typography>
            )}

            {availableValues.length === 0 && !isLoading && (
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ textAlign: "center", py: 2 }}
              >
                No values available
              </Typography>
            )}
          </div>
        )}
      </div>
    )
  );
}
