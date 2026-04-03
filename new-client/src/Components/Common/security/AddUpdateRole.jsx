import { useEffect, useState } from "react";
import {
  getRequest,
  patchRequest,
  postApplicationJsonRequest,
} from "../../../Service/api.service";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import SubmitBtn from "../SubmitBtn";
import SelectField from "../Fileds/SelectField";
import MultiSelect from "../Fileds/MultiSelect";
import InputField from "../Fileds/InputField";

const AddUpdateRole = ({ setUpdateData, onClose, data }) => {
  const isEdit = Boolean(data?.roleId);

  const emptyForm = { roleName: "", permissionId: [], disabled: "no" };

  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [formData, setFormData] = useState(emptyForm);

  const { user } = useSelector((state) => state.permission);

  const normaliseData = (raw) => ({
    roleName: raw?.roleName || "",
    disabled: raw?.disabled || "",
    permissionId: (raw?.permissions || []).map((p) =>
      typeof p === "object" ? p.permissionId : p,
    ),
  });

  // Sync form when `data` changes (e.g. opening edit for a different row)
  useEffect(() => {
    setFormData(isEdit ? normaliseData(data) : emptyForm);
  }, [data]);

  // Fetch permission list once on mount
  useEffect(() => {
    const fetchAllPermissions = async () => {
      try {
        const response = await getRequest("/permission/readAll");
        if (response.status === 200) setPermissions(response.data);
      } catch (error) {
        console.error("Error fetching permissions", error);
      }
    };
    fetchAllPermissions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      const payload = {
        roleName: formData.roleName,
        disabled: formData.disabled,
        permissionId: formData.permissionId,
      };

      const response = isEdit
        ? await patchRequest(`/roles/${data.roleId}/update`, payload)
        : await postApplicationJsonRequest("/roles/add", payload);

      if (response.status === 200) {
        toast.success(
          response?.data?.message ||
            (isEdit
              ? "Role updated successfully!"
              : "Role added successfully!"),
        );
        setFormData(emptyForm);
        setUpdateData(true);
        onClose();

        // Reload if the currently logged-in user's role was edited
        if (isEdit && user?.rolesName?.includes(data.roleName)) {
          window.location.reload();
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Error saving role", error);
      toast.error(error?.response?.data?.error || "Internal Server Error");
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !formData.roleName || !formData.disabled;

  return (
    <div className="flex flex-col gap-4">
      <InputField
        label="Role Name"
        name="roleName"
        required
        value={formData.roleName}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
      />

      <MultiSelect
        label="Permission"
        required
        // showSelectAll
        options={permissions}
        value={formData.permissionId || []}
        onChange={(val) =>
          setFormData((prev) => ({ ...prev, permissionId: val }))
        }
        getOptionValue={(o) => o.permissionId}
        getOptionLabel={(o) => o.permissionName}
      />

      <SelectField
        label="Disabled"
        required
        name="disabled"
        value={formData.disabled || ""}
        onChange={handleInputChange}
        // disabled={!isEdit}
      >
        <option value="" disabled>
          Select authentication…
        </option>
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </SelectField>
      <SubmitBtn
        text={isEdit ? "Update Role" : "Add Role"}
        type="submit"
        onClick={handleSubmit}
        disabled={isDisabled}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AddUpdateRole;
