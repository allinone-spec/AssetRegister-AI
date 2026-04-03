import React, { useState, useEffect } from "react";
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
  InputAdornment,
  IconButton,
} from "@mui/material";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import SubmitBtn from "./SubmitBtn";

export const AddUserDataModal = ({ open, handleClose, onRefresh }) => {
  const [roles, setRoles] = useState([]);
  const [objects, setObjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    password: "",
    authentication: "",
    disabled: "no",
    groupId: [],
    roleId: [],
    objectId: [],
  });

  useEffect(() => {
    fetchAllGroups();
    fetchAllRoles();
    fetchAllObjects();
  }, []);

  const fetchAllRoles = async () => {
    try {
      const response = await getRequest("/roles/readAll");
      if (response.status === 200) setRoles(response.data);
    } catch (error) {
      console.error("Error fetching roles", error);
    }
  };

  const fetchAllGroups = async () => {
    try {
      const response = await getRequest("/groups/readAll");
      if (response.status === 200) setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups", error);
    }
  };

  const fetchAllObjects = async () => {
    try {
      const response = await getRequest("/objects/readAll");
      if (response.status === 200) setObjects(response.data);
    } catch (error) {
      console.error("Error fetching objects", error);
    }
  };

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

  const handleAddUserData = async () => {
    try {
      setLoading(true);
      const updatedFormData = {
        ...formData,
        disabled: formData?.disabled,
      };
      const response = await postApplicationJsonRequest(
        "/user/add",
        updatedFormData,
      );
      if (response?.status === 200) {
        setFormData({
          firstName: "",
          lastName: "",
          middleName: "",
          email: "",
          authentication: "",
          disabled: "no",
          groupId: [],
          roleId: [],
          objectId: [],
        });
        onRefresh();

        handleClose();
      }
    } catch (error) {
      console.error("Error adding user", error);
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    formData.authentication === "Basic"
      ? !formData.firstName ||
        !formData.lastName ||
        !formData.email ||
        !formData.objectId.length ||
        !formData.authentication ||
        !formData.password ||
        formData.password !== confirmPassword ||
        !formData.disabled
      : !formData.firstName ||
        !formData.lastName ||
        !formData.email ||
        !formData.objectId.length ||
        !formData.authentication ||
        !formData.disabled;

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setPasswordError(value !== formData.password);
  };

  return (
    <CommanAddModal open={open} handleClose={handleClose} title="Add New User ">
      <Box sx={{ padding: 2 }}>
        <TextField
          label="First Name"
          name="firstName"
          required
          value={formData.firstName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          required
        />

        <TextField
          label="Middle Name"
          name="middleName"
          value={formData.middleName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          required
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Groups</InputLabel>
          <Select
            multiple
            label="Group"
            value={formData?.groupId}
            onChange={(e) => handleMultiSelectChange("groupId", e.target.value)}
            renderValue={(selected) =>
              selected
                .map(
                  (id) =>
                    groups.find((group) => group.groupId === id)?.groupName,
                )
                .join(", ")
            }
          >
            {groups.map((group) => (
              <MenuItem key={group.groupId} value={group.groupId}>
                <Checkbox checked={formData.groupId.includes(group.groupId)} />
                <ListItemText primary={group.groupName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Roles</InputLabel>
          <Select
            multiple
            label="Roles"
            value={formData.roleId}
            onChange={(e) => handleMultiSelectChange("roleId", e.target.value)}
            renderValue={(selected) =>
              selected
                .map((id) => roles.find((role) => role.roleId === id)?.roleName)
                .join(", ")
            }
          >
            {roles.map((role) => (
              <MenuItem key={role.roleId} value={role.roleId}>
                <Checkbox checked={formData.roleId.includes(role.roleId)} />
                <ListItemText primary={role.roleName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel required>Objects</InputLabel>
          <Select
            label="Objects"
            multiple
            required
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
          <InputLabel required>Authentication</InputLabel>
          <Select
            required
            label="Authentication"
            name="authentication"
            value={formData.authentication}
            onChange={handleInputChange}
          >
            <MenuItem value="Windows">Windows</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
            <MenuItem value="SSO">SSO</MenuItem>
          </Select>
        </FormControl>

        {formData.authentication === "Basic" && (
          <>
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={togglePasswordVisibility} edge="end">
                      {showPassword ? (
                        <AiOutlineEyeInvisible size={20} />
                      ) : (
                        <AiOutlineEye size={20} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              fullWidth
              margin="normal"
              error={passwordError}
              helperText={passwordError ? "Passwords do not match" : ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={toggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? (
                        <AiOutlineEyeInvisible size={20} />
                      ) : (
                        <AiOutlineEye size={20} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}

        <FormControl fullWidth margin="normal">
          <InputLabel required>Disabled</InputLabel>

          <Select
            required
            name="disabled"
            value={formData.disabled}
            onChange={handleInputChange}
            defaultValue="no"
            label="Disabled"
          >
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
          </Select>
        </FormControl>
        <SubmitBtn
          text="Add User"
          type="submit"
          onClick={handleAddUserData}
          disabled={isValid}
          isLoading={isLoading}
        />
      </Box>
    </CommanAddModal>
  );
};
