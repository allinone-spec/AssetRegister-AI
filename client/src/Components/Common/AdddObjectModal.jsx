import { useState } from "react";
import CommanAddModal from "./CommonAddModal";
import { postApplicationJsonRequest } from "../../Service/api.service";
import { TextField, Box } from "@mui/material";
import SubmitBtn from "./SubmitBtn";
import toast from "react-hot-toast";

export const AddObjectDataModal = ({ open, handleClose, onRefresh }) => {
  const [isLoading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    objectName: "",
    email: "",
  });
  const [emailError, setEmailError] = useState("");
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddObject = async () => {
    try {
        if (!!emailError) return
        setLoading(true);
      const payload = {
        ...formData,
      };
      const response = await postApplicationJsonRequest(
        "/objects/add",
        payload
      );
      if (response.status === 200) {
        setFormData({
          objectName: "",
          email: "",
        });
        onRefresh();
        toast.success(response?.data?.message || "Object added successfully");
        handleClose();
      }
    } catch (error) {
      console.error("Error adding user", error);
    } finally {
      setLoading(false);
    }
  };

  const isValid = !formData.objectName


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
    <CommanAddModal
      open={open}
      handleClose={handleClose}
      title="Add New Object"
    >
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
          text="Add Object"
          type="submit"
          onClick={handleAddObject}
          disabled={isValid}
          isLoading={isLoading}
        />
      </Box>
    </CommanAddModal>
  );
};
