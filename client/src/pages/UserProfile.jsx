import React, { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
  Box,
} from "@mui/material";
import { FiEdit, FiSave, FiX } from "react-icons/fi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../redux/Slices/HeadingTitle";
import { getUser, patchRequest } from "../Service/api.service";

const UserProfile = () => {
  // const userDetail = JSON.parse(localStorage.getItem("user-detail"));
  const dispatch = useDispatch();
  const [fetchingUser, setFetchingUser] = useState(true);
  const [user, setUser] = useState({
    userId: '',
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    // mobile: userDetail?.mobile || "",
    // address: "",
    // role: userDetail?.rolesName.join(", ") || "",
  });

  const [editMode, setEditMode] = useState(false);
  const [updatedUser, setUpdatedUser] = useState(user);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(setHeadingTitle("Profile"));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedUser((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    setFetchingUser(true)
    getUser(`/user/${localStorage.getItem("user-id")}/read`).then((res) => {
      const userData = {
        userId: res.data.userId,
        firstName: res.data.firstName || "",
        lastName: res.data.lastName || "",
        email: res.data.email || "",
        middleName: res.data.middleName || "",
        password: "",
      };
      setUser(userData);
      setUpdatedUser(userData);
    }).finally(() => setFetchingUser(false))
  }, [])

  const handleSave = () => {
    setLoading(true);
    patchRequest(`/user/${user?.userId}/update`, updatedUser)
      .then(() => {
        // getUser(`/user/${localStorage.getItem("user-id")}/read`).then((res) =>
        //   localStorage.setItem("user-detail", JSON.stringify(res.data))
        // );
        setUser(updatedUser);
        setEditMode(false);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (fetchingUser) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }


  return (
    <Card
      sx={{
        maxWidth: 500,
        margin: "auto",
        mt: 5,
        p: 3,
        boxShadow: 3,
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Typography
          variant="h5"
          sx={{ textAlign: "center", fontWeight: "bold", mb: 2 }}
        >
          User Profile
        </Typography>
        <TextField
          label="First Name"
          name="firstName"
          value={updatedUser.firstName}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!editMode}
        />
        <TextField
          label="Last Name"
          name="lastName"
          value={updatedUser.lastName}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!editMode}
        />
        <TextField
          label="Middle Name"
          name="middleName"
          value={updatedUser.middleName}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!editMode}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          value={updatedUser.email}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled
        />
        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={updatedUser.password}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!editMode}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {/* <TextField
          label="Mobile"
          name="mobile"
          value={updatedUser.mobile}
          fullWidth
          margin="normal"
          disabled={!editMode}
          onChange={handleChange}
        />
        <TextField
          label="Address"
          name="address"
          value={updatedUser.address}
          fullWidth
          margin="normal"
          disabled={!editMode}
          onChange={handleChange}
        />
        <TextField
          label="Role"
          value={user.role}
          fullWidth
          margin="normal"
          disabled
        /> */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          {editMode ? (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={loading}
                startIcon={<FiSave />}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setEditMode(false)}
                startIcon={<FiX />}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setEditMode(true)}
              startIcon={<FiEdit />}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
