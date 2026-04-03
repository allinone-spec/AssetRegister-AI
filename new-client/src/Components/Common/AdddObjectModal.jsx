import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  patchRequest,
  postApplicationJsonRequest,
} from "../../Service/api.service";
import SubmitBtn from "./SubmitBtn";

export const AddObjectDataModal = ({ handleClose, onRefresh, data }) => {
  const isEdit = Boolean(data?.objectId);
  const emptyForm = { objectName: "", email: "" };

  const [isLoading, setLoading] = useState(false);
  const [formData, setFormData] = useState(isEdit ? data : emptyForm);
  const [emailError, setEmailError] = useState("");

  // Keep form in sync when `data` changes (e.g. opening edit for a different row)
  useEffect(() => {
    setFormData(isEdit ? { ...data } : emptyForm);
    setEmailError("");
  }, [data]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

  const handleSubmit = async () => {
    try {
      if (emailError) return;
      setLoading(true);

      const payload = {
        objectName: formData.objectName,
        email: formData.email,
      };

      const response = isEdit
        ? await patchRequest(`/objects/${formData.objectId}/update`, payload)
        : await postApplicationJsonRequest("/objects/add", payload);

      if (response.status === 200) {
        setFormData(emptyForm);
        onRefresh();
        toast.success(
          response?.data?.message ||
            (isEdit
              ? "Object updated successfully"
              : "Object added successfully"),
        );
        handleClose();
      }
    } catch (error) {
      console.error("Error saving object", error);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !formData.objectName;

  return (
    <>
      <label className="block text-sm font-medium mb-1">Object Name</label>
      <input
        type={"text"}
        value={formData.objectName}
        onChange={handleInputChange}
        className="w-full p-2 border border-[var(--border)] bg-input-bg text-text-sub rounded-md"
      />

      <label className="block text-sm font-medium mb-1 my-4">Email</label>
      <input
        type={"email"}
        value={formData.email}
        onChange={handleInputChange}
        className="w-full p-2 border border-[var(--border)] bg-input-bg text-text-sub rounded-md mb-6"
      />

      <SubmitBtn
        text={isEdit ? "Update Object" : "Add Object"}
        type="submit"
        onClick={handleSubmit}
        disabled={isDisabled}
        isLoading={isLoading}
      />
    </>
  );
};
