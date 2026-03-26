import React, { useState, useEffect } from "react";
import CommanAddModal from "./CommonAddModal";
import {
  patchRequest,
  postApplicationJsonRequest,
} from "../../Service/api.service";
import { TextField, Box } from "@mui/material";
import SubmitBtn from "./SubmitBtn";
import toast from "react-hot-toast";

const EditObjectDataModal = ({ open, handleClose, data, onRefresh }) => {
  const [isLoading, setLoading] = useState(false);
  const [formData, setFormData] = useState(data);
  const [emailError, setEmailError] = useState("");
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    setFormData({ ...data });
  }, [data]);

  const handleEditObject = async () => {
    try {
      if (!!emailError) return;
      setLoading(true);
      const payload = {
        objectName: formData.objectName,
        email: formData.email,
      };
      const response = await patchRequest(
        `/objects/${formData.objectId}/update`,
        payload
      );
      if (response.status === 200) {
        setFormData({
          objectName: "",
          email: "",
        });
        onRefresh();
        toast.success(response?.data?.message || "Object updated successfully");
        handleClose();
      }
    } catch (error) {
      console.error("Error adding user", error);
    } finally {
      setLoading(false);
    }
  };

  const isValid = !formData.objectName;

  const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  const handleEmailBlur = () => {
    if (!formData.email || !validateEmail(formData.email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };
  return (
    <CommanAddModal open={open} handleClose={handleClose} title="Edit Object">
      <Box>
        <TextField
          label="Object Name"
          name="objectName"
          required
          value={formData.objectName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          required
          onBlur={handleEmailBlur}
          error={!!emailError}
          helperText={emailError}
          value={formData.email}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />
        <SubmitBtn
          text="Update Object"
          type="submit"
          onClick={handleEditObject}
          disabled={isValid}
          isLoading={isLoading}
        />
      </Box>
    </CommanAddModal>
  );
};

export default EditObjectDataModal;
