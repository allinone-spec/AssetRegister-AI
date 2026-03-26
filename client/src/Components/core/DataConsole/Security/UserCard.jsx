import React from "react";
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Avatar,
  Divider,
} from "@mui/material";
import {
  FaEdit,
  FaTrash,
  FaUserAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";
import { VscOpenPreview } from "react-icons/vsc";
import { TbSettingsSearch } from "react-icons/tb";

import { useTheme } from "../../../../ThemeContext";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { getFullName } from "../../../../Utility/utilityFunction";
import { useSelector } from "react-redux";

const UserCard = ({ user, onView, onEdit, onDelete, routeName }) => {
  const dispatch = useDispatch();
  const { colorPalette, selectedColor, bgColor } = useTheme();
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission
  );
  const { layoutTextColor, backgroundColor } = bgColor;
  const textColor = colorPalette[selectedColor]["900"];
  const actionColor = colorPalette[selectedColor]["300"];

  return (
    <Card
      style={{
        maxWidth: "100%",
        width: "300px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        borderRadius: "10px",
        padding: "0px",
        zIndex: 1,
      }}
    >
      <CardContent style={{ textAlign: "center", padding: "0px" }}>
        <Typography
          variant="h6"
          style={{
            marginBottom: "10px",
            color: layoutTextColor,
            backgroundColor: backgroundColor,
            padding: "5px 0px",
            borderRadius: "5px 5px 0px 0px",
          }}
        >
          User Card
        </Typography>

        <Avatar
          alt={user.name}
          src={user.profileImage}
          style={{
            margin: "10px auto",
            width: "60px",
            height: "60px",
            backgroundColor: backgroundColor,
            color: layoutTextColor,
            fontSize: "1.5rem",
          }}
        >
          {/* {user.profileImage ? null : user.name[0].toUpperCase()} */}
        </Avatar>

        <Divider style={{ margin: "10px 0" }} />

        <div
          style={{
            textAlign: "left",
            margin: "0 auto",
            width: "fit-content",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <FaUserAlt style={{ color: textColor, marginRight: "8px" }} />
            <Typography variant="body1" style={{ color: textColor }}>
              {/* {user.firstName} */}
              {getFullName(user)}
            </Typography>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <FaPhoneAlt style={{ color: textColor, marginRight: "8px" }} />
            <Typography variant="body2" style={{ color: textColor }}>
              {user.mobile}
            </Typography>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <FaEnvelope style={{ color: textColor, marginRight: "8px" }} />
            <Typography variant="body2" style={{ color: textColor }}>
              {user.email}
            </Typography>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <TbSettingsSearch
              style={{ color: textColor, marginRight: "8px" }}
            />
            <Typography variant="body2" style={{ color: textColor }}>
              {user?.roles?.length
                ? user.roles
                    .slice(0, 2)
                    .map((item) => item.roleName)
                    .join(", ")
                : "No Role Assigned"}
            </Typography>
          </div>
        </div>
      </CardContent>

      {/* Action Buttons */}
      <CardActions
        style={{ justifyContent: "space-evenly", padding: "20px 10px" }}
      >
        <div className="bg-gray-200 p-2 rounded-full">
          <IconButton
            onClick={() => onView(user.id)}
            style={{
              color: backgroundColor,
            }}
          >
            <VscOpenPreview />
          </IconButton>
        </div>
        {permissionList?.includes(routeName) &&
          permissionDetails[routeName]?.hasWriteOnly && (
            <div className="bg-gray-200 p-2 rounded-full">
              <IconButton
                onClick={() => onEdit(user)}
                style={{
                  color: backgroundColor,
                }}
              >
                <FaEdit />
              </IconButton>
            </div>
          )}
        {permissionList?.includes(routeName) &&
          permissionDetails[routeName]?.hasWriteOnly && (
            <div className="bg-gray-200 p-2 rounded-full">
              <IconButton
                onClick={() => onDelete(user)}
                style={{
                  color: backgroundColor,
                }}
              >
                <FaTrash />
              </IconButton>
            </div>
          )}
      </CardActions>
    </Card>
  );
};

export default UserCard;
