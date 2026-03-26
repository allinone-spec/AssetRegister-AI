import React, { useEffect, useState } from "react";
import CommanAddModal from "./CommonAddModal";
import {
  getRequest,
  postApplicationJsonRequest,
} from "../../Service/api.service";
import {
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  ListItemText,
  Button,
  Box,
} from "@mui/material";
import toast from "react-hot-toast";

export const AddGroupModal = ({
  open,
  handleClose,
  getallGroups,
  roles,
  objects,
}) => {
  const [isAllSelected, setIsAllSelected] = useState(false);

  const [formData, setFormData] = useState({
    groupName: "",
    email: "",
    objectId: [],
    roleId: [],
    disabled: "no",
    authentication: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (field, value) => {
    if (value.includes("all")) {
      if (formData[field].length === objects.length) {
        // Deselect all if all are selected
        setFormData((prev) => ({ ...prev, [field]: [] }));
        setIsAllSelected(false);
      } else {
        // Select all objects
        setFormData((prev) => ({
          ...prev,
          [field]: objects.map((obj) => obj.objectId),
        }));
        setIsAllSelected(true);
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsAllSelected(value.length === objects.length);
    }
  };
  const handleAddGroupData = async () => {
    try {
      const updatedFormData = {
        ...formData,
        disabled: formData?.disabled === "no" ? "disabled" : "enabled",
      };
      const response = await postApplicationJsonRequest(
        "/groups/add",
        updatedFormData,
      );
      if (response.status === 200) {
        setFormData({
          groupName: "",
          email: "",
          objectId: [],
          roleId: [],
          disabled: "",
          authentication: "",
        });
        getallGroups();
        handleClose();
      }
    } catch (error) {
      toast.error(error.response.data.message || "Internal server Error");
    } finally {
      handleClose();
    }
  };

  const isValid =
    !formData.disabled ||
    !formData.groupName ||
    formData.objectId.length === 0 ||
    formData.roleId.length === 0;

  return (
    <CommanAddModal
      open={open}
      handleClose={handleClose}
      title="Add New Group "
    >
      <Box>
        <TextField
          label="Group Name"
          name="groupName"
          required
          value={formData.groupName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />

        <FormControl fullWidth margin="normal">
          <InputLabel required>Objects</InputLabel>
          <Select
            label="Objects"
            multiple
            value={
              isAllSelected ? ["all", ...formData.objectId] : formData.objectId
            }
            onChange={(e) =>
              handleMultiSelectChange("objectId", e.target.value)
            }
            renderValue={(selected) =>
              selected.includes("all")
                ? "All"
                : selected
                    .map(
                      (id) =>
                        objects.find((object) => object.objectId === id)
                          ?.objectName,
                    )
                    .join(", ")
            }
          >
            <MenuItem value={isAllSelected ? "" : "all"}>
              <Checkbox checked={isAllSelected} />
              <ListItemText primary="All" />
            </MenuItem>

            {objects.map((object) => (
              <MenuItem key={object.objectId} value={object.objectId}>
                <Checkbox
                  checked={formData.objectId.includes(object.objectId)}
                />
                <ListItemText primary={object.objectName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel required>Role </InputLabel>
          <Select
            multiple
            label="Role"
            value={formData.roleId}
            onChange={(e) => handleMultiSelectChange("roleId", e.target.value)}
            renderValue={(selected) =>
              selected
                ?.map(
                  (id) => roles.find((role) => role.roleId === id)?.roleName,
                )
                .join(", ")
            }
          >
            {roles?.map((role) => (
              <MenuItem key={role.roleId} value={role.roleId}>
                <Checkbox checked={formData.roleId.includes(role.roleId)} />
                <ListItemText primary={role.roleName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Disabled Dropdown */}
        <FormControl fullWidth margin="normal">
          <InputLabel required>Disabled</InputLabel>
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
          onClick={handleAddGroupData}
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
          Add Group
        </Button>
      </Box>
    </CommanAddModal>
  );
};
