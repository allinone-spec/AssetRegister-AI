import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { BiSave } from "react-icons/bi";
import {
  patchRequest,
  postApplicationJsonRequest,
} from "../../../Service/api.service";
import { setHeadingTitle } from "../../../redux/Slices/HeadingTitle";
// import { useTheme } from "../../ThemeContext";

const modules = [
  "Dashboard",
  "Reports",
  "Register",
  "Settings",
  "Security",
  "Import Status",
  "Logs",
  "Saved Jobs",
  "AR Mapping",
  "AR Rules",
  "Add Jobs",
];

const permissionTypes = ["ReadOnly", "WriteOnly", "API"];

// Stable moduleId map — index-based for Add, explicit map for Edit
const moduleIdMap = {
  Dashboard: 1,
  Reports: 2,
  Register: 3,
  Settings: 4,
  Security: 5,
  "Import Status": 6,
  Logs: 7,
  "Saved Jobs": 8,
  "AR Mapping": 9,
  "AR Rules": 10,
  "Add Jobs": 11,
};

const buildEmptyPermissions = () => {
  const perms = {};
  modules.forEach((module) => {
    perms[module] = {};
    permissionTypes.forEach((type) => {
      perms[module][type] = false;
    });
  });
  return perms;
};

const AddUpdatePermission = ({ onClose, data, setUpdateData }) => {
  const dispatch = useDispatch();
  const permissionData = data;
  const isEdit = Boolean(permissionData?.permissionId);

  const [formData, setFormData] = useState({
    permissionName: "",
    permissions: buildEmptyPermissions(),
  });
  const [isLoading, setIsLoading] = useState(false);

  // Set heading title based on mode
  useEffect(() => {
    dispatch(setHeadingTitle("Permissions"));
  }, []);

  // Populate/reset form whenever incoming drawer data changes
  useEffect(() => {
    if (isEdit) {
      const permissions = buildEmptyPermissions();

      if (Array.isArray(permissionData.permissions)) {
        permissionData.permissions.forEach(
          ({ moduleName, permissionTypes: modulePermTypes }) => {
            const matchingModule = modules.find(
              (m) => m.toLowerCase() === moduleName.toLowerCase(),
            );
            if (matchingModule && Array.isArray(modulePermTypes)) {
              modulePermTypes.forEach((type) => {
                if (permissionTypes.includes(type)) {
                  permissions[matchingModule][type] = true;
                }
              });
            }
          },
        );
      }

      setFormData({
        permissionName: permissionData.permissionName || "",
        permissions,
        permissionId: permissionData.permissionId,
      });
      return;
    }

    setFormData({
      permissionName: "",
      permissions: buildEmptyPermissions(),
    });
  }, [isEdit, permissionData]);

  const handlePermissionNameChange = (e) => {
    setFormData((prev) => ({ ...prev, permissionName: e.target.value }));
  };

  const handlePermissionChange = (module, type) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [type]: !prev.permissions[module][type],
        },
      },
    }));
  };

  const isValid = () => {
    if (!formData.permissionName.trim()) return false;
    return Object.values(formData.permissions).some((modulePerms) =>
      Object.values(modulePerms).some(Boolean),
    );
  };

  const buildPermissionsPayload = () =>
    Object.entries(formData.permissions).reduce(
      (acc, [moduleName, typePerms]) => {
        const selectedTypes = Object.entries(typePerms)
          .filter(([, isSelected]) => isSelected)
          .map(([type]) => type);

        // Add: skip empty modules | Edit: include all modules
        if (isEdit || selectedTypes.length > 0) {
          acc.push({
            moduleId: moduleIdMap[moduleName] ?? modules.indexOf(moduleName),
            moduleName,
            permissionTypes: selectedTypes,
          });
        }
        return acc;
      },
      [],
    );

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const payload = {
        permissionName: formData.permissionName,
        permissions: buildPermissionsPayload(),
        ...(isEdit && { permissionId: formData.permissionId }),
      };

      if (isEdit) {
        const response = await patchRequest(
          `/permission/${formData.permissionId}/update`,
          payload,
        );
        if (response.status === 200) {
          toast.success("Permissions updated successfully!");
          setUpdateData(true);
          onClose();
        } else {
          toast.error("Failed to update permissions. Please try again.");
        }
      } else {
        await postApplicationJsonRequest("/permission/add", payload);
        setUpdateData(true);
        onClose();
        toast.success("Permission added successfully!");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "An error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-lg">
        <div className="flex justify-end gap-4 mb-2">
          <button
            onClick={handleSave}
            disabled={!isValid() || isLoading}
            // style={{ backgroundColor: !isValid() || isLoading ? '#9ca3af' : backgroundColor }}
            className="bg-accent flex items-center gap-2 px-3 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <BiSave size={16} />
            {isLoading
              ? isEdit
                ? "Updating..."
                : "Adding..."
              : isEdit
                ? "Update Permission"
                : "Add Permission"}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-text-sub mb-2">
            Permission Name
          </label>
          <input
            type="text"
            value={formData.permissionName}
            onChange={handlePermissionNameChange}
            placeholder="Enter permission name"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-200 bg-input-bg ${
              isEdit && !formData.permissionName.trim()
                ? "border-red-500 bg-red-50"
                : "border-gray-300"
            }`}
          />
          {isEdit && !formData.permissionName.trim() && (
            <p className="mt-1 text-sm text-red-600">
              Permission name is required
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-6 py-4 font-bold text-sm sm:px-6 pl-4">
                Module
              </th>
              {permissionTypes.map((type) => (
                <th
                  key={type}
                  className={`text-center font-bold text-sm  py-4 ${
                    isEdit ? "sm:px-6 px-2" : "sm:px-4 px-2"
                  }`}
                >
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((module, index) => (
              <tr
                key={module}
                className={`transition-colors duration-150 ${
                  index !== modules.length - 1
                    ? "border-b border-[var(--border)]"
                    : ""
                }`}
              >
                <td
                  className={`font-medium py-2 text-sm ${
                    isEdit ? "sm:px-6 pl-4" : "sm:px-4 pl-4"
                  }`}
                >
                  {module}
                </td>
                {permissionTypes.map((type) => (
                  <td
                    key={`${module}-${type}`}
                    className={`text-center py-2 ${
                      isEdit ? "sm:px-6 px-2" : "sm:px-4 px-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.permissions[module]?.[type] || false}
                      onChange={() => handlePermissionChange(module, type)}
                      // style={{ accentColor: backgroundColor }}
                      className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddUpdatePermission;
