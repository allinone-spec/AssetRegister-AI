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
import { postApplicationJsonRequest } from "../../Service/api.service";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { BiArrowBack, BiSave } from "react-icons/bi";
import { setHeadingTitle } from "../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { useTheme } from "../../ThemeContext";

const AddPermissionPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;

  const [formData, setFormData] = useState({
    permissionName: "",
    permissions: {},
  });
  const [isLoading, setIsLoading] = useState(false);

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
    dispatch(setHeadingTitle("Add Permission"));

    // Initialize empty permissions object
    const initialPermissions = {};
    modules.forEach((module) => {
      initialPermissions[module] = {};
      permissionTypes.forEach((type) => {
        initialPermissions[module][type] = false;
      });
    });

    setFormData((prev) => ({
      ...prev,
      permissions: initialPermissions,
    }));
  }, []);

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

      const permissions = [];

      Object.entries(formData.permissions).forEach(
        ([moduleName, typePerms]) => {
          const selectedTypes = [];

          Object.entries(typePerms).forEach(([type, isSelected]) => {
            if (isSelected) {
              selectedTypes.push(type);
            }
          });

          // Only add module if it has at least one selected permission
          if (selectedTypes.length > 0) {
            permissions.push({
              moduleId: modules.indexOf(moduleName), // Using array index as moduleId
              moduleName: moduleName,
              permissionTypes: selectedTypes,
            });
          }
        }
      );

      const payload = {
        permissionName: formData.permissionName,
        permissions: permissions,
      };

      const response = await postApplicationJsonRequest(
        "/permission/add",
        payload
      );

      toast.success("Permission added successfully!");
      navigate(-1);
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 0.5 }} style={{ padding: 0 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            onClick={handleCancel}
            sx={{ mr: 2, color: "primary.main" }}
          >
            <BiArrowBack />
          </IconButton>
          <div className="sm:text-4xl text-2xl font-bold">Add Permission</div>
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
                {isLoading ? "Adding..." : "Add Permission"}
              </Button>
            </Box>

            <TextField
              label="Permission Name"
              fullWidth
              value={formData.permissionName}
              onChange={handlePermissionNameChange}
              variant="outlined"
              sx={{ mb: 3 }}
              // error={!formData.permissionName.trim()}
              // helperText={
              //   !formData.permissionName.trim()
              //     ? "Permission name is required"
              //     : ""
              // }
              placeholder="Enter permission name"
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
                      key={type}
                      align="center"
                      className="sm:!px-4 !px-1"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "text.primary",
                        py: 1.5,
                        // minWidth: 120,
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
                      className="sm:!px-4 !pl-2"
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
                        className="sm:!px-4 !px-1"
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

export default AddPermissionPage;
