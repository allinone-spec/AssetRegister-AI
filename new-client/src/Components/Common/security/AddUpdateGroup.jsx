import { useEffect, useState } from "react";
import {
  getRequest,
  patchRequest,
  postApplicationJsonRequest,
} from "../../../Service/api.service";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import SubmitBtn from "../SubmitBtn";
import InputField from "../Fileds/InputField";
import SelectField from "../Fileds/SelectField";
import MultiSelect from "../Fileds/MultiSelect";

const AddUpdateGroup = ({ setUpdateData, onClose, data }) => {
  const isEdit = Boolean(data?.groupId);

  const emptyForm = {
    groupName: "",
    email: "",
    objectId: [],
    roleId: [],
    disabled: "no",
    authentication: "",
  };
  const [objects, setObjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isAllSelected, setIsAllSelected] = useState(false);

  const { user } = useSelector((state) => state.permission);

  // Sync form when `data` changes (e.g. opening edit for a different row)
  useEffect(() => {
    if (isEdit) {
      const normalised = {
        ...emptyForm,
        ...data,
        disabled: data?.disabled || "no",
        objectId: data?.objectId || [],
        roleId: data?.roleId || [],
      };
      setFormData(normalised);
      setIsAllSelected(
        objects.length > 0 && (data?.objectId || []).length === objects.length,
      );
    } else {
      setFormData(emptyForm);
      setIsAllSelected(false);
    }
  }, [data]);

  const getallRoles = async () => {
    try {
      const response = await getRequest("/roles/readAll");
      if (response.status === 200) {
        setRoles(response?.data || []);
      }
    } catch (error) {
      console.log("error", error);
      setRoles([]);
    }
  };

  const fetchAllObjects = async () => {
    try {
      const response = await getRequest("/objects/readAll");
      if (response.status === 200) {
        setObjects(response.data || []);
      } else {
        setObjects([]);
      }
    } catch (error) {
      console.error("Internal server error");
    }
  };

  useEffect(() => {
    getallRoles();
    fetchAllObjects();
  }, []);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Objects multi-select with "Select All" toggle
  const handleObjectChange = (value) => {
    if (value.includes("all")) {
      if (formData.objectId.length === objects.length) {
        setFormData((prev) => ({ ...prev, objectId: [] }));
        setIsAllSelected(false);
      } else {
        setFormData((prev) => ({
          ...prev,
          objectId: objects.map((obj) => obj.objectId),
        }));
        setIsAllSelected(true);
      }
    } else {
      setFormData((prev) => ({ ...prev, objectId: value }));
      setIsAllSelected(value.length === objects.length);
    }
  };

  // Roles multi-select
  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, roleId: value }));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (isEdit) {
        const payload = {
          groupName: formData.groupName,
          email: formData.email,
          authentication: formData.authentication,
          disabled: formData.disabled,
          objectId: formData.objectId,
          objects: formData.objectId,
          roleId: formData.roleId,
        };
        const response = await patchRequest(
          `/groups/${data.groupId}/update`,
          payload,
        );
        if (response.status === 200) {
          if (user?.groupName?.includes(data.groupName))
            window.location.reload();
          setUpdateData(true);
          onClose();
          toast.success(
            response?.data?.message || "Group updated successfully!",
          );
          handleClose();
        } else {
          toast.error("Failed to update group. Please try again.");
        }
      } else {
        const payload = {
          ...formData,
          // Add mode transforms disabled: "no" → "disabled", "yes" → "enabled"
          disabled: formData.disabled === "no" ? "disabled" : "enabled",
        };
        const response = await postApplicationJsonRequest(
          "/groups/add",
          payload,
        );
        if (response.status === 200) {
          setFormData(emptyForm);
          setIsAllSelected(false);
          setUpdateData(true);
          onClose();
          toast.success(response?.data?.message || "Group added successfully!");
          handleClose();
        }
      }
    } catch (error) {
      console.error("Error saving group", error);
      toast.error(error?.response?.data?.message || "Internal Server Error");
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled =
    !formData.disabled ||
    !formData.groupName ||
    formData.objectId.length === 0 ||
    formData.roleId.length === 0;

  return (
    <>
      <InputField
        label="Group Name"
        name="groupName"
        required
        value={formData.groupName}
        onChange={handleInputChange}
        className="mb-5"
      />
      <MultiSelect
        label="Objects"
        required
        className="mb-5"
        options={objects}
        value={formData.objectId || []}
        onChange={(val) => handleObjectChange(val)}
        getOptionValue={(o) => o.objectId}
        getOptionLabel={(o) => o.objectName}
      />
      <MultiSelect
        label="Role"
        required
        className="mb-5"
        options={roles}
        value={formData.roleId}
        onChange={(val) => handleRoleChange(val)}
        getOptionValue={(o) => o.roleId}
        getOptionLabel={(o) => o.roleName}
      />
      <SelectField
        label="Disabled"
        required
        name="disabled"
        value={formData.disabled || ""}
        onChange={handleInputChange}
        className="mb-8"
      >
        <option value="" disabled>
          Select authentication…
        </option>
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </SelectField>
      <SubmitBtn
        text={isEdit ? "Update Group" : "Add Group"}
        type="submit"
        onClick={handleSubmit}
        disabled={isDisabled}
        isLoading={isLoading}
      />
    </>
  );
};

export default AddUpdateGroup;
