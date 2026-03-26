import React, { useState, useEffect } from "react";
import {
    TextField,
    FormControl,
    InputLabel,
    MenuItem,
    Select
} from "@mui/material";
import { patchRequest } from "../../Service/api.service";
import { toast } from "react-hot-toast";
import CommanModal from "./Modal";

const EditModal= ({ open, handleClose, data, getallGroups }) => {
    const [formData, setFormData] = useState(data);

    useEffect(() => {
        setFormData(data);
    }, [data]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const updatedGroups = async () => {
        try {
            const payload = {
                groupName: formData?.groupName,
                email: formData?.email,
                objects: formData?.objects,
                disabled: formData?.disabled,
                authentication: formData?.authentication
            };

            const response = await patchRequest(`/groups/${formData.groupId}/update`, payload);
            if (response.status === 200) {
                toast.success("Group updated successfully!");
                getallGroups();
                handleClose();
            } else {
                toast.error("Failed to update group. Please try again.");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        }
    };

    const handleSave = () => {
        updatedGroups();
    };

    return (
        <CommanModal
            open={open}
            handleClose={handleClose}
            handleSave={handleSave}
        >

            <TextField
                label="Group Name"
                fullWidth
                margin="normal"
                name="groupName"
                value={formData?.groupName || ""}
                onChange={handleInputChange}
            />
            <TextField
                label="Email"
                fullWidth
                margin="normal"
                name="email"
                value={formData?.email || ""}
                onChange={handleInputChange}
            />
            <TextField
                label="Objects"
                fullWidth
                margin="normal"
                name="objects"
                value={formData?.objects || ""}
                onChange={handleInputChange}
            />
            <FormControl fullWidth margin="normal">
                <InputLabel>Disabled</InputLabel>
                <Select
                    name="disabled"
                    value={formData?.disabled || "no"}
                    onChange={handleInputChange}
                >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
                <InputLabel>Authentication</InputLabel>
                <Select
                    name="authentication"
                    value={formData?.authentication || "no"}
                    onChange={handleInputChange}
                >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                </Select>
            </FormControl>

        </CommanModal>
    );
};

export default EditModal;
