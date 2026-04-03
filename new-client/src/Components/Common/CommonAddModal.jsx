import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,

} from "@mui/material";

const CommanAddModal = ({ open, handleClose, children,title }) => {
   
    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                
               {children}
            </DialogContent>
            <DialogActions sx={{width:'100%',display:'flex',alignItems:'center'}}>
                <Button onClick={handleClose} color="secondary">
                    Cancel
                </Button>

            </DialogActions>
        </Dialog>
    );
};

export default CommanAddModal;

