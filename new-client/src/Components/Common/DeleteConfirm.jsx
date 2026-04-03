import React from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

export const DeleteConfirm = ({
  isOpen,
  close,
  handleDelete,
  deleteLoading,
  reloadApp,
  deleteCheckValue = {
    job: false,
    AcDcTable: false,
    dashboards: false,
    savedViews: false,
  },
  setDeleteCheckValue,
}) => {
  return (
    <Modal open={isOpen} onClose={close} aria-labelledby="delete-confirmation">
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 330,
          bgcolor: "white",
          boxShadow: 24,
          p: 3,
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Are you sure?
        </Typography>
        {setDeleteCheckValue && (
          <FormGroup className="mb-2">
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteCheckValue.job || false}
                  onChange={({ target }) => {
                    if (target.checked) {
                      setDeleteCheckValue((pre) => ({
                        ...pre,
                        job: true,
                        AcDcTable: true,
                        dashboards: true,
                        savedViews: true,
                      }));
                    } else {
                      setDeleteCheckValue((pre) => ({
                        ...pre,
                        job: false,
                        AcDcTable: false,
                        dashboards: false,
                        savedViews: false,
                      }));
                    }
                  }}
                />
              }
              label="Delete Job(s)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteCheckValue.AcDcTable || false}
                  disabled={deleteCheckValue.job}
                  onChange={({ target }) => {
                    if (target.checked) {
                      setDeleteCheckValue((pre) => ({
                        ...pre,

                        AcDcTable: true,
                        dashboards: true,
                        savedViews: true,
                      }));
                    } else {
                      setDeleteCheckValue((pre) => ({
                        ...pre,
                        AcDcTable: false,
                        dashboards: false,
                        savedViews: false,
                      }));
                    }
                  }}
                />
              }
              label="Delete AC / DC Table"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteCheckValue.dashboards || false}
                  disabled={deleteCheckValue.job || deleteCheckValue.AcDcTable}
                  onChange={({ target }) =>
                    setDeleteCheckValue((pre) => ({
                      ...pre,
                      dashboards: target.checked,
                    }))
                  }
                />
              }
              label="Delete associated Dashboards"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteCheckValue.savedViews || false}
                  disabled={deleteCheckValue.job || deleteCheckValue.AcDcTable}
                  onChange={({ target }) =>
                    setDeleteCheckValue((pre) => ({
                      ...pre,
                      savedViews: target.checked,
                    }))
                  }
                />
              }
              label="Delete associated Saved Views"
            />
          </FormGroup>
        )}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            color="inherit"
            onClick={close}
            sx={{ minWidth: 90 }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={
              deleteLoading ||
              (setDeleteCheckValue &&
                !deleteCheckValue.AcDcTable &&
                !deleteCheckValue.job &&
                !deleteCheckValue.dashboards &&
                !deleteCheckValue.savedViews)
            }
            sx={{ minWidth: 90 }}
          >
            {deleteLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete"
            )}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};
