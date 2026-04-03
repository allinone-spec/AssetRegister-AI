import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  permissionList: [],
  permissionDetails: {},
  user: {},
};

const PermissionSlice = createSlice({
  name: "permission",
  initialState,
  reducers: {
    getAllRoles: (state, { payload }) => {
      const { allPermissions, user } = payload;
      // const userRoles =
      //   roles?.filter((role) => user?.rolesName?.includes(role.roleName)) || [];

      // if (userRoles.length > 0) {
      // Collect all permissions from all user roles
      // const allPermissions = [];
      // userRoles.forEach((role) => {
      //   if (
      //     role?.permissions?.length &&
      //     role.permissions[0].permissions?.length
      //   ) {
      //     allPermissions.push(...role.permissions[0].permissions);
      //   }
      // });

      if (allPermissions.length > 0) {
        // Merge permissions by module name - combine permission types
        const mergedPermissions = {};

        allPermissions.forEach((module) => {
          if (module.permissionTypes?.length) {
            const moduleName =
              module.moduleName === "AR Mapping"
                ? "AR Mapping"
                : module.moduleName === "AR Rules"
                  ? "AR Rules"
                  : module.moduleName;

            if (!mergedPermissions[moduleName]) {
              mergedPermissions[moduleName] = {
                moduleId: module.moduleId,
                moduleName: moduleName,
                permissionTypes: new Set(),
              };
            }

            module.permissionTypes.forEach((type) => {
              if (type !== "API") {
                mergedPermissions[moduleName].permissionTypes.add(type);
              }
            });
          }
        });

        // Convert merged permissions to final format
        const moduleNames = [];
        const permissionDetails = {};

        Object.values(mergedPermissions).forEach((module) => {
          const permissionTypesArray = Array.from(module.permissionTypes);

          // Only add to final result if permissionTypes array has length > 0
          if (permissionTypesArray.length > 0) {
            moduleNames.push(module.moduleName);
            permissionDetails[module.moduleName] = {
              moduleId: module.moduleId,
              permissionTypes: permissionTypesArray,
              hasReadOnly: permissionTypesArray.includes("ReadOnly"),
              hasWriteOnly: permissionTypesArray.includes("WriteOnly"),
            };
          }
        });

        state.permissionList = moduleNames;
        state.permissionDetails = permissionDetails;
      } else {
        // No permissions found in any role
        state.permissionList = [];
        state.permissionDetails = {};
      }
      // } else {
      //   state.permissionList = [
      // "Dashboard",
      // "Register",
      // "Security",
      // "Reports",
      // "Settings",
      // "Import Status",
      // "Add Jobs",
      // "Saved Jobs",
      // "AR Mapping/ Saved Jobs",
      // "AR Mapping",
      // "AR Rules",
      // "Logs",
      //   ];
      //   state.permissionDetails = {};
      // }
      state.user = user;
      // state.allRole = roles;
    },
  },
});

export const { getAllRoles } = PermissionSlice.actions;
export default PermissionSlice.reducer;
