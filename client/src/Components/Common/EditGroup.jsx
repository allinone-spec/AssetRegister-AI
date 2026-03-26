import React, { useState, useEffect } from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  ListItemText,
  Chip,
  Box,
} from "@mui/material";
import { getRequest, patchRequest } from "../../Service/api.service";
import { toast } from "react-hot-toast";
import CommanModal from "./Modal";
import { useSelector } from "react-redux";

const EditGroup = ({
  open,
  handleClose,
  data,
  getallGroups,
  roles,
  objects,
}) => {
  const [formData, setFormData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useSelector((state) => state.permission);
  useEffect(() => {
    setFormData({ ...data, disabled: data?.disabled || "no" });
  }, [data]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updatedGroups = async () => {
    try {
      setIsLoading(true);
      const payload = {
        groupName: formData?.groupName,
        email: formData?.email,
        objects: formData?.objectId,
        disabled: formData?.disabled,
        authentication: formData?.authentication,
        objectId: formData?.objectId,
        roleId: formData?.roleId,
      };

      const response = await patchRequest(
        `/groups/${formData.groupId}/update`,
        payload,
      );
      if (response.status === 200) {
        if (user?.groupName?.includes(data?.groupName))
          window.location.reload();
        await getallGroups();
        toast.success("Group updated successfully!");
        handleClose();
        setIsLoading(false);
      } else {
        toast.error("Failed to update group. Please try again.");
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
      disabled={
        !formData?.disabled ||
        !formData?.groupName ||
        formData?.objectId?.length === 0 ||
        formData?.roleId?.length === 0
      }
      title="Edit Group"
      handleClose={handleClose}
      handleSave={handleSave}
      isLoading={isLoading}
    >
      <TextField
        label="Group Name"
        fullWidth
        margin="normal"
        required
        name="groupName"
        value={formData?.groupName || ""}
        onChange={handleInputChange}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel required>Object</InputLabel>
        <Select
          label="Object"
          multiple
          name="objectId"
          value={formData?.objectId || []}
          onChange={handleInputChange}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected
                ?.map(
                  (id) =>
                    objects?.find((obj) => obj.objectId === id)?.objectName,
                )
                .filter((name) => name)
                .map((objName, index) => (
                  <Chip key={index} label={objName} style={{ margin: 2 }} />
                ))}
            </Box>
          )}
        >
          {/* {[
                        { id: 0, name: "Item 0" },
                        { id: 1, name: "Item 1" },
                        { id: 2, name: "Item 2" },
                        { id: 3, name: "Item 3" },
                        { id: 4, name: "Item 4" },
                        { id: 5, name: "Item 5" },
                    ]?.map((object) => (
                        <MenuItem key={object?.objectId} value={object?.objectId}>
                            <Checkbox checked={formData?.objectId?.includes(object?.objectId)} />
                            <ListItemText primary={object?.objectName} />
                        </MenuItem>
                    ))} */}
          {objects.map((object) => (
            <MenuItem key={object?.objectId} value={object?.objectId}>
              <Checkbox
                checked={formData?.objectId?.includes(object?.objectId)}
              />
              <ListItemText primary={object?.objectName} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel required>Role </InputLabel>
        <Select
          label="Role"
          name="roleId"
          multiple
          value={formData?.roleId}
          onChange={handleInputChange}
          renderValue={(selected) =>
            selected
              ?.map((id) => roles.find((role) => role.roleId === id)?.roleName)
              .join(", ")
          }
        >
          {roles?.map((role) => (
            <MenuItem key={role.roleId} value={role.roleId}>
              <Checkbox checked={formData?.roleId?.includes(role.roleId)} />
              <ListItemText primary={role?.roleName} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel required>Disabled</InputLabel>
        <Select
          label="Disabled"
          name="disabled"
          defaultValue="no"
          value={formData?.disabled}
          onChange={handleInputChange}
        >
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </Select>
      </FormControl>
    </CommanModal>
  );
};

export default EditGroup;
