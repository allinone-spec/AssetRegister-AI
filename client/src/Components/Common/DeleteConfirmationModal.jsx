import React from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";
import SubmitBtn from "./SubmitBtn";

const DeleteConfirmationModal = ({ open, handleClose, onConfirm,isLoading }) => {



  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <p>Are you sure you want to delete this item?</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        {/* <Button onClick={onConfirm} color="primary">
         {isLoading ? "Deleting" :"Confirm"}
        </Button> */}
        <SubmitBtn type="submit" text="Confirm" onClick={onConfirm} isLoading={isLoading} />
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
