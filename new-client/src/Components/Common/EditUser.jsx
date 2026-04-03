import React, { useState, useEffect } from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ListItemText,
  Checkbox,
  Chip,
  Box,
} from "@mui/material";
import { getRequest, patchRequest } from "../../Service/api.service";
import { toast } from "react-hot-toast";
import CommanModal from "./Modal";
import { useSelector } from "react-redux";

const EditUser = ({ open, handleClose, data, onRefresh }) => {
  const [formData, setFormData] = useState(data);
  const [roles, setRoles] = useState([]);
  const [objects, setObjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useSelector((state) => state.permission);
  useEffect(() => {
    const objectId = objects
      .filter((item) => data.object?.some((p) => p === item.objectName))
      .map((p) => p.objectId);

    const roleId = roles
      .filter((item) => data.roles?.some((p) => p === item.roleName))
      .map((p) => p.roleId);

    const groupId = groups
      .filter((item) => data.groups?.some((p) => p === item.groupName))
      .map((p) => p.groupId);

    setFormData({
      ...data,
      roleId: roleId || [],
      objectId: objectId || [],
      groupId: groupId || [],
    });
  }, [data, objects, roles, groups]);

  const fetchAllRoles = async () => {
    try {
      const response = await getRequest("/roles/readAll");
      if (response.status === 200) {
        setRoles(response.data);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error("Internal server error");
    }
  };

  const fetchAllGroups = async () => {
    try {
      const response = await getRequest("/groups/readAll");
      if (response.status === 200) {
        setGroups(response.data);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error("Internal server error");
    }
  };

  const fetchAllObjects = async () => {
    try {
      const response = await getRequest("/objects/readAll");
      if (response.status === 200) {
        setObjects(response.data);
      } else {
        setObjects([]);
      }
    } catch (error) {
      console.error("Internal server error");
    }
  };

  useEffect(() => {
    fetchAllGroups();
    fetchAllRoles();
    fetchAllObjects();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updatedGroups = async () => {
    try {
      setIsLoading(true);
      const payload = {
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
        middleName: formData.middleName || "",
        groupId: formData.groupId || [],
        email: formData.email || "",
        roleId: formData.roleId || [],
        objectId: formData.objectId || [],
        authentication: formData.authentication || "no",
        disabled: formData.disabled || "no",
      };

      const response = await patchRequest(
        `/user/${formData.userId}/update`,
        payload,
      );

      if (response.status === 200) {
        toast.success("User updated successfully!");
        await onRefresh();
        handleClose();
        setIsLoading(false);
        if (user.userId == data?.id) window.location.reload();
      } else toast.error("Failed to update user. Please try again.");
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const isValid =
    !formData?.firstName ||
    !formData?.lastName ||
    !formData?.email ||
    !formData?.objectId?.length ||
    !formData?.authentication ||
    !formData?.disabled;

  return (
    <CommanModal
      open={open}
      handleClose={handleClose}
      handleSave={updatedGroups}
      isLoading={isLoading}
      disabled={isValid}
    >
      <TextField
        label="First Name"
        required
        fullWidth
        margin="normal"
        name="firstName"
        value={formData?.firstName || ""}
        onChange={handleInputChange}
      />
      <TextField
        label="Last Name"
        required
        fullWidth
        margin="normal"
        name="lastName"
        value={formData?.lastName || ""}
        onChange={handleInputChange}
      />
      <TextField
        label="Middle Name"
        fullWidth
        margin="normal"
        name="middleName"
        value={formData?.middleName || ""}
        onChange={handleInputChange}
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>Groups</InputLabel>
        <Select
          label="Groups"
          multiple
          name="groupId"
          value={formData?.groupId || []}
          onChange={handleInputChange}
          // renderValue={(selected) => selected.join(", ")}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected
                ?.map(
                  (id) =>
                    groups?.find((group) => group.groupId === id)?.groupName,
                )
                .filter((name) => name) // Filter out undefined values
                .map((groupName, index) => (
                  <Chip key={index} label={groupName} style={{ margin: 2 }} />
                ))}
            </Box>
          )}
        >
          {groups?.map((group) => (
            <MenuItem key={group?.groupId} value={group?.groupId}>
              <Checkbox checked={formData?.groupId?.includes(group?.groupId)} />
              <ListItemText primary={group?.groupName} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Email"
        required
        fullWidth
        margin="normal"
        name="email"
        value={formData?.email || ""}
        onChange={handleInputChange}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel required>Disabled</InputLabel>
        <Select
          name="disabled"
          label="Disabled"
          defaultValue={data?.disabled}
          value={formData?.disabled}
          onChange={handleInputChange}
        >
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Roles</InputLabel>
        <Select
          label="Roles"
          multiple
          name="roleId"
          value={formData?.roleId || []}
          onChange={handleInputChange}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected
                ?.map(
                  (id) => roles?.find((role) => role.roleId === id)?.roleName,
                )
                .map((roleName, index) => (
                  <Chip key={index} label={roleName} style={{ margin: 2 }} />
                ))}
            </Box>
          )}
        >
          {roles?.map((role) => (
            <MenuItem key={role?.roleId} value={role?.roleId}>
              <Checkbox checked={formData?.roleId?.includes(role?.roleId)} />
              <ListItemText primary={role?.roleName} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
        <InputLabel required>Authentication</InputLabel>
        <Select
          label="Authentication"
          name="authentication"
          disabled
          value={formData?.authentication}
          defaultValue={data?.authentication}
          onChange={handleInputChange}
        >
          <MenuItem value="Windows">Windows</MenuItem>
          <MenuItem value="Basic">Basic</MenuItem>
          <MenuItem value="SSO">SSO</MenuItem>
        </Select>
      </FormControl>
    </CommanModal>
  );
};

export default EditUser;
