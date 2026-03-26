import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,

} from "@mui/material";
import SubmitBtn from "./SubmitBtn";

const CommanModal = ({ open, handleClose, children, handleSave,isLoading,disabled=false }) => {
   
    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Edit Data</DialogTitle>
            <DialogContent> 
                
               {children}
            </DialogContent>
            <DialogActions sx>
                <Button onClick={handleClose} color="secondary" sx={{backgroundColor:"#f3ece3",width:"50%"}}>
                    Cancel
                </Button>
                {/* <Button onClick={handleSave} color="primary">
                    Save
                </Button> */}
                <SubmitBtn text="Update" disabled={disabled} onClick={handleSave} isLoading={isLoading} className="w-1/2"/>
            </DialogActions>
        </Dialog>
    );
};

export default CommanModal;
