import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import {
  getRequest,
  patchRequest,
  postApplicationJsonRequest,
} from "../../../Service/api.service";
import SubmitBtn from "../SubmitBtn";
import InputField from "../Fileds/InputField";
import MultiSelect from "../Fileds/MultiSelect";
import SelectField from "../Fileds/SelectField";
import PasswordField from "../Fileds/PasswordField";

const UserAddUpdateForm = ({ data = {}, setUpdateData, onClose }) => {
  const isEdit = Object.keys(data).length > 0;
  const { user: currentUser } = useSelector((state) => state.permission);
  const [roles, setRoles] = useState([]);
  const [objects, setObjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const emptyForm = {
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
  };

  const [formData, setFormData] = useState(emptyForm);

  // Sync edit data once lists are loaded
  useEffect(() => {
    if (isEdit) {
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
    } else setFormData(emptyForm);
  }, [data, objects, roles, groups, isEdit]);

  // Fetch reference data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [rolesRes, groupsRes, objectsRes] = await Promise.all([
          getRequest("/roles/readAll"),
          getRequest("/groups/readAll"),
          getRequest("/objects/readAll"),
        ]);
        if (rolesRes.status === 200) setRoles(rolesRes.data);
        if (groupsRes.status === 200) setGroups(groupsRes.data);
        if (objectsRes.status === 200) setObjects(objectsRes.data);
      } catch (err) {
        console.error("Error fetching reference data", err);
      }
    };
    fetchAll();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setPasswordError(value !== formData.password);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (isEdit) {
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
          setUpdateData(true);
          onClose();
          if (currentUser?.userId == data?.id) window.location.reload();
        } else {
          toast.error("Failed to update user. Please try again.");
        }
      } else {
        const response = await postApplicationJsonRequest(
          "/user/add",
          formData,
        );
        if (response?.status === 200) {
          toast.success("User added successfully!");
          setFormData(emptyForm);
          setUpdateData(true);
          onClose();
        }
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const isInvalid = isEdit
    ? !formData?.firstName ||
      !formData?.lastName ||
      !formData?.email ||
      !formData?.objectId?.length ||
      !formData?.authentication ||
      !formData?.disabled
    : formData.authentication === "Basic"
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

  return (
    <div className="flex flex-col gap-4">
      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="First Name"
          required
          name="firstName"
          value={formData.firstName || ""}
          onChange={handleInputChange}
          placeholder="Jane"
        />
        <InputField
          label="Last Name"
          required
          name="lastName"
          value={formData.lastName || ""}
          onChange={handleInputChange}
          placeholder="Doe"
        />
      </div>

      <InputField
        label="Middle Name"
        name="middleName"
        value={formData.middleName || ""}
        onChange={handleInputChange}
        placeholder="(optional)"
      />

      <InputField
        label="Email"
        required
        name="email"
        type="email"
        value={formData.email || ""}
        onChange={handleInputChange}
        placeholder="jane@example.com"
      />

      <MultiSelect
        label="Groups"
        options={groups}
        value={formData.groupId || []}
        onChange={(val) => setFormData((prev) => ({ ...prev, groupId: val }))}
        getOptionValue={(o) => o.groupId}
        getOptionLabel={(o) => o.groupName}
      />

      <MultiSelect
        label="Roles"
        options={roles}
        value={formData.roleId || []}
        onChange={(val) => setFormData((prev) => ({ ...prev, roleId: val }))}
        getOptionValue={(o) => o.roleId}
        getOptionLabel={(o) => o.roleName}
      />

      <MultiSelect
        label="Objects"
        required
        showSelectAll
        options={objects}
        value={formData.objectId || []}
        onChange={(val) => setFormData((prev) => ({ ...prev, objectId: val }))}
        getOptionValue={(o) => o.objectId}
        getOptionLabel={(o) => o.objectName}
      />

      <SelectField
        label="Authentication"
        required
        name="authentication"
        value={formData.authentication || ""}
        onChange={handleInputChange}
        disabled={isEdit}
      >
        <option value="" disabled>
          Select authentication…
        </option>
        <option value="Windows">Windows</option>
        <option value="Basic">Basic</option>
        <option value="SSO">SSO</option>
      </SelectField>

      {/* Password fields – add mode + Basic auth only */}
      {!isEdit && formData.authentication === "Basic" && (
        <>
          <PasswordField
            label="Password"
            required
            name="password"
            value={formData.password || ""}
            onChange={handleInputChange}
            visible={showPassword}
            onToggle={() => setShowPassword((p) => !p)}
          />
          <div className="flex flex-col gap-1">
            <PasswordField
              label="Confirm Password"
              required
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((p) => !p)}
            />
            {passwordError && (
              <span className="text-xs text-rose-500">
                Passwords do not match
              </span>
            )}
          </div>
        </>
      )}

      <SelectField
        label="Disabled"
        required
        name="disabled"
        value={formData.disabled || "no"}
        onChange={handleInputChange}
      >
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </SelectField>

      {/* Footer */}
      <div className="pt-2">
        {isEdit ? (
          <button
            onClick={handleSubmit}
            disabled={isInvalid || isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-accent text-white text-sm font-semibold
                hover:bg-accent-glow active:bg-indigo-800 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        ) : (
          <SubmitBtn
            text="Add User"
            type="submit"
            onClick={handleSubmit}
            disabled={isInvalid}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default UserAddUpdateForm;
