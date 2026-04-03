import React, { useState, useEffect } from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  ListItemText,
  Box,
} from "@mui/material";
import { getRequest, patchRequest } from "../../Service/api.service";
import { toast } from "react-hot-toast";
import CommanModal from "./Modal";
import { useSelector } from "react-redux";

const EditRole = ({ open, handleClose, data, getallRole }) => {
  const [formData, setFormData] = useState(data);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useSelector((state) => state.permission);

  const fetchAllPermission = async () => {
    try {
      const response = await getRequest("/permission/readAll");
      if (response.status === 200) {
        setPermissions(response?.data); // Set as an array, not wrapped in another array
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error("Internal server error");
    }
  };

  useEffect(() => {
    fetchAllPermission();
  }, []);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (event) => {
    const { value } = event.target;
    setFormData((prev) => ({
      ...prev,
      permissions: value.map((v) => ({ permissionId: v })),
    }));
  };

  const updatedGroups = async () => {
    try {
      setIsLoading(true);
      const payload = {
        permissionId: formData?.permissions?.map((v) => v.permissionId) || [], // Ensure you are sending the selected permissions
        roleName: formData?.roleName,
        disabled: formData?.disabled,
      };

      const response = await patchRequest(
        `/roles/${formData.roleId}/update`,
        payload
      );
      if (response.status === 200) {
        await getallRole();
        if (user.rolesName.includes(data.roleName)) window.location.reload();
        toast.success("Role updated successfully!");
        setIsLoading(false);
        handleClose();
      } else {
        toast.error("Failed to update role. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
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
      isLoading={isLoading}
    >
      <Box sx={{ padding: 2 }}>
        <TextField
          label="Role Name"
          fullWidth
          margin="normal"
          name="roleName"
          value={formData?.roleName}
          onChange={handleInputChange}
          sx={{
            marginBottom: 2,
            "& .MuiInputLabel-root": { color: "primary.main" },
            "& .MuiOutlinedInput-root": { borderColor: "primary.main" },
          }}
        />
        <FormControl fullWidth margin="normal" sx={{ marginBottom: 2 }}>
          <InputLabel>Disabled</InputLabel>
          <Select
            name="disabled"
            label="Disabled"
            value={formData?.disabled || "no"}
            onChange={handleInputChange}
            sx={{
              "& .MuiOutlinedInput-root": { borderColor: "primary.main" },
              "& .MuiInputLabel-root": { color: "primary.main" },
            }}
          >
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </Select>
        </FormControl>

        {/* Permissions Checkbox List */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Permissions</InputLabel>
          <Select
            multiple
            label="Permissions"
            name="permissionId"
            value={formData?.permissions?.map((v) => v?.permissionId) || []}
            onChange={handlePermissionChange}
            renderValue={(selected) =>
              selected
                .map(
                  (id) =>
                    permissions.find((perm) => perm.permissionId === id)
                      ?.permissionName
                )
                .join(", ")
            }
            sx={{
              "& .MuiOutlinedInput-root": { borderColor: "primary.main" },
              "& .MuiInputLabel-root": { color: "primary.main" },
            }}
          >
            {permissions?.map((perm) => (
              <MenuItem key={perm.permissionId} value={perm.permissionId}>
                <Checkbox
                  checked={formData?.permissions
                    ?.map((v) => v?.permissionId)
                    ?.includes(perm.permissionId)}
                />
                <ListItemText primary={perm.permissionName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </CommanModal>
  );
};

export default EditRole;
