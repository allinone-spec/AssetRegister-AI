import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Card,
  Grid,
  Container,
  IconButton,
} from "@mui/material";
import { patchRequest } from "../../Service/api.service";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { BiArrowBack, BiSave } from "react-icons/bi";
import { setHeadingTitle } from "../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { useTheme } from "../../ThemeContext";
import { useSelector } from "react-redux";

const EditPermissionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;
  const [formData, setFormData] = useState({
    permissionName: "",
    permissions: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const { permissionId } = useSelector((state) => state.permission?.user);

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

  useEffect(() => {
    dispatch(setHeadingTitle("Edit Permission"));
  }, []);

  useEffect(() => {
    let permissionData = location.state?.permissionData;

    if (permissionData) {
      const permissions = {};
      modules.forEach((module) => {
        permissions[module] = {};
        permissionTypes.forEach((type) => {
          permissions[module][type] = false;
        });
      });

      // Map the received data format to our internal format
      if (
        permissionData.permissions &&
        Array.isArray(permissionData.permissions)
      ) {
        permissionData.permissions.forEach((permission) => {
          const { moduleName, permissionTypes: modulePermTypes } = permission;

          // Find matching module (case-insensitive)
          const matchingModule = modules.find(
            (module) => module.toLowerCase() === moduleName.toLowerCase()
          );

          if (matchingModule && Array.isArray(modulePermTypes)) {
            // Iterate through the permission types array
            modulePermTypes.forEach((type) => {
              // Direct mapping since the permission types now match exactly
              if (permissionTypes.includes(type)) {
                permissions[matchingModule][type] = true;
              }
            });
          }
        });
      }

      setFormData({
        permissionName: permissionData.permissionName || "",
        permissions,
        permissionId: permissionData.permissionId,
      });
    }
  }, [location.state]);

  const handlePermissionNameChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      permissionName: e.target.value,
    }));
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

    const hasAnyPermission = Object.values(formData.permissions).some(
      (modulePerms) => Object.values(modulePerms).some(Boolean)
    );

    return hasAnyPermission;
  };
  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Build the permissions array in the expected format
      const permissions = [];

      Object.entries(formData.permissions).forEach(([module, typePerms]) => {
        const selectedTypes = [];

        // Get all selected permission types for this module
        Object.entries(typePerms).forEach(([type, isSelected]) => {
          if (isSelected) {
            selectedTypes.push(type);
          }
        });

        // Only add the module if it has at least one selected permission
        // if (selectedTypes.length > 0) {
        // Find the moduleId if you have it stored, otherwise you might need to map it
        // For now, I'll use a placeholder - you'll need to adjust this based on your data
        const moduleId = getModuleId(module); // You'll need to implement this function

        permissions.push({
          moduleId: moduleId,
          moduleName: module,
          permissionTypes: selectedTypes || [],
        });
        // }
      });

      const payload = {
        permissionName: formData.permissionName,
        permissions: permissions,
        permissionId: formData.permissionId,
      };

      const response = await patchRequest(
        `/permission/${formData.permissionId}/update`,
        payload
      );

      if (response.status === 200) {
        if (permissionId?.includes(formData?.permissionId))
          navigate("/data-console/security/permission", {
            state: true,
          });
        else navigate("/data-console/security/permission");

        toast.success("Permissions updated successfully!");
      } else {
        toast.error("Failed to update permissions. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get moduleId - you'll need to implement this based on your data
  const getModuleId = (moduleName) => {
    // You can either:
    // 1. Store moduleIds when parsing the initial data
    // 2. Have a mapping object
    // 3. Use the original data to find the moduleId

    // Option 1: Mapping object (if you have consistent moduleIds)
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

    return moduleIdMap[moduleName] || 0;
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // if (!formData.permissionId) {
  //   return (
  //     <Container maxWidth="lg" sx={{ py: 4 }}>
  //       <Typography variant="h6" color="error">
  //         Permission data not found. Please go back and try again.
  //       </Typography>
  //       <Button onClick={handleCancel} sx={{ mt: 2 }}>
  //         Go Back
  //       </Button>
  //     </Container>
  //   );
  // }

  return (
    <Container maxWidth="lg" sx={{ py: 0.5 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            onClick={handleCancel}
            sx={{ mr: 2, color: "primary.main" }}
          >
            <BiArrowBack />
          </IconButton>
          <div className="sm:text-4xl text-2xl font-bold">Edit Permission</div>
        </Box>
      </Box>

      <Grid item xs={12} md={8}>
        <Card elevation={2}>
          <Box sx={{ p: 3, pb: 2 }}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "flex-end",
                mb: 1,
              }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<BiSave />}
                onClick={handleSave}
                disabled={!isValid() || isLoading}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: "none",
                  mb: 2,
                  backgroundColor,
                }}
              >
                {isLoading ? "Updating..." : "Update Permission"}
              </Button>
            </Box>
            <TextField
              label="Permission Name"
              fullWidth
              value={formData.permissionName}
              onChange={handlePermissionNameChange}
              variant="outlined"
              sx={{ mb: 3 }}
              error={!formData.permissionName.trim()}
              helperText={
                !formData.permissionName.trim()
                  ? "Permission name is required"
                  : ""
              }
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell
                    className="sm:!px-6 !pl-2"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "text.primary",
                      py: 1.5,
                    }}
                  >
                    Module
                  </TableCell>
                  {permissionTypes.map((type) => (
                    <TableCell
                      className="sm:!px-6 !px-1"
                      key={type}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "text.primary",
                        py: 1.5,
                      }}
                    >
                      {type}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {modules.map((module, index) => (
                  <TableRow
                    key={module}
                    hover
                    sx={{
                      "&:hover": { backgroundColor: "#f8fafc" },
                      borderBottom:
                        index === modules.length - 1
                          ? "none"
                          : "1px solid #e2e8f0",
                    }}
                  >
                    <TableCell
                      className="sm:!px-6 !pl-2"
                      sx={{
                        fontWeight: 500,
                        py: 0.5,
                        fontSize: "0.875rem",
                      }}
                    >
                      {module}
                    </TableCell>
                    {permissionTypes.map((type) => (
                      <TableCell
                        className="sm:!px-6 !px-1"
                        key={`${module}-${type}`}
                        align="center"
                        sx={{ py: 0.5 }}
                      >
                        <Checkbox
                          checked={
                            formData.permissions[module]?.[type] || false
                          }
                          onChange={() => handlePermissionChange(module, type)}
                          color="primary"
                          sx={{
                            "&.Mui-checked": {
                              color: backgroundColor,
                            },
                            "&:hover": {
                              backgroundColor: "rgba(25, 118, 210, 0.04)",
                            },
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </Container>
  );
};

export default EditPermissionPage;
