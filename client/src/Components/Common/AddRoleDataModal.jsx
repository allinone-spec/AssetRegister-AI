import React, { useEffect, useState } from "react";
import CommanAddModal from "./CommonAddModal";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import {
  getRequest,
  postApplicationJsonRequest,
} from "../../Service/api.service";
import toast from "react-hot-toast";

export const AddRoleDataModal = ({ open, handleClose, getallRoles }) => {
  const [permissions, setPermissions] = useState([]);
  const [formData, setFormData] = useState({
    permissionId: [],
    roleName: "",
    disabled: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const fetchAllPermission = async () => {
    try {
      const response = await getRequest("/permission/readAll");
      if (response.status === 200) {
        setPermissions(response.data);
      }
    } catch (error) {
      console.error("Error fetching objects", error);
    }
  };
  useEffect(() => {
    fetchAllPermission();
  }, []);

  const handleMultiSelectChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddRoleData = async () => {
    try {
      const response = await postApplicationJsonRequest("/roles/add", formData);
      if (response.status == 200) {
        setFormData({
          permissionId: [],
          roleName: "",
          disabled: "",
        });
        getallRoles();
        handleClose();
      }
    } catch (error) {
      console.error("Error adding role", error);
      toast.error(error.response.data.error || "Internal Server Error ");
    } finally {
      handleClose();
    }
  };
  const isValid = !formData.roleName || !formData.disabled;

  return (
    <CommanAddModal open={open} handleClose={handleClose} title="Add New Role ">
      <Box sx={{ padding: 2 }}>
        <TextField
          label="Role Name"
          name="roleName"
          required
          value={formData.roleName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Permission </InputLabel>
          <Select
            label="Permission"
            multiple
            value={formData.permissionId}
            onChange={(e) =>
              handleMultiSelectChange("permissionId", e.target.value)
            }
            renderValue={(selected) =>
              selected
                ?.map(
                  (id) =>
                    permissions.find(
                      (permission) => permission.permissionId === id
                    )?.permissionName
                )
                .join(", ")
            }
          >
            {permissions?.map((permission) => (
              <MenuItem
                key={permission.permissionId}
                value={permission.permissionId}
              >
                <Checkbox
                  checked={formData.permissionId.includes(
                    permission.permissionId
                  )}
                />
                <ListItemText primary={permission.permissionName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl required fullWidth margin="normal">
          <InputLabel>Disabled</InputLabel>
          <Select
            required
            label="Disabled"
            name="disabled"
            value={formData.disabled}
            onChange={handleInputChange}
          >
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
          </Select>
        </FormControl>

        <Button
          disabled={isValid}
          variant="contained"
          color="primary"
          onClick={handleAddRoleData}
          fullWidth
          sx={{
            backgroundColor: isValid ? "#b0bec5" : "primary.main", // Grayish when disabled
            color: isValid ? "#ffffff" : "#fff",
            cursor: isValid ? "not-allowed" : "pointer",
            "&:hover": {
              backgroundColor: isValid ? "#b0bec5" : "primary.dark", // Prevent hover effect when disabled
            },
          }}
        >
          Add Role
        </Button>
      </Box>
    </CommanAddModal>
  );
};
