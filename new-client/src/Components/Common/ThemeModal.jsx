import React, { useState } from "react";
import { useTheme } from "../../ThemeContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { closeModal } from "../../redux/Slices/ThemeModalSclice";
import ColorSelector from "../../pages/ColorThemeSelector";
import { baseUrl } from "../../Utility/baseUrl";
import toast from "react-hot-toast";
import {
  createTheme,
  patchMultipartFormRequest,
} from "../../Service/api.service";

const ThemeModal = () => {
  const { handleApplyTheme, handleCancelTheme, setLogoPath } = useTheme();

  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.themeModal.isOpen);

  // const [selectLogoName, setSelectLogoName] = useState("");
  const [selectedLogo, setSelectedLogo] = useState(null);

  if (!isOpen) return null;

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    setSelectedLogo(file);
  };

  const handleUpdateLogo = async () => {
    console.log("selectedLogo", selectedLogo);
    if (!selectedLogo) {
      toast.error("Please select a logo first.");
      return;
    }

    if (!selectedLogo) {
      toast.error("Please provide a logo name.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedLogo);
    try {
      const themeId = JSON.parse(localStorage.getItem("isTheme")) || false;
      if (themeId && typeof selectedLogo === "string") {
        const logo = {
          logoPath: selectedLogo,
        };
        const response = await patchMultipartFormRequest(
          `/theme/${themeId}/update`,
          {
            themeRequest: JSON.stringify(logo),
            // file: typeof selectedLogo !== "string" && selectedLogo,
          }
        );
        if (response?.status === 404) {
          toast.error("Logo Id is Not Found");
        }

        if (response.status === 200) {
          setLogoPath(selectedLogo);
          toast.success("Logo updated successfully");
        }
      } else if (typeof selectedLogo === "string") {
        const logo = {
          logoPath: selectedLogo,
        };
        const response = await createTheme("/theme/add", {
          themeRequest: JSON.stringify(logo),
          // file: typeof selectedLogo !== "string" && selectedLogo,
        });
        if (response?.status === 404) {
          toast.error("Logo Id is Not Found");
        }

        if (response.status === 200) {
          setLogoPath(selectedLogo);
          toast.success("Logo updated successfully");
        }
      }
      // const response = await fetch(`${baseUrl}/logo/5/update?name=${encodeURIComponent(selectLogoName)}`, {
      //     method: "PATCH",
      //     body: formData,
      // });
      // const result = await response.json();
      // if (response?.status === 404) {
      //     toast.error("Logo Id is Not Found");
      // }

      // if (response.status === 200) {
      //     const savedTheme = JSON.parse(localStorage.getItem("theme")) || {};
      //     savedTheme.logo = result.logo;
      //     toast.success("Logo updated successfully");
      // }
    } catch (error) {
      console.error("Failed to update logo:", error.response);
      toast.error("Failed to update logo. Please try again.");
    }
  };
  const applyTheme = () => {
    handleApplyTheme(selectedLogo);
    dispatch(closeModal());
    setSelectedLogo(null);
  };

  return (
    <Dialog open={isOpen}>
      <DialogTitle>Set Theme</DialogTitle>
      <div style={{ margin: "20px" }}>
        <TextField
          type="file"
          onChange={handleLogoChange}
          inputProps={{ accept: "image/*" }}
          fullWidth
        />
      </div>
      <DialogContent sx={{ minWidth: "600px", minHeight: "50vh" }}>
        <ColorSelector />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            dispatch(closeModal());
            handleCancelTheme();
          }}
        >
          Cancel
        </Button>
        <Button onClick={applyTheme} variant="contained" color="primary">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ThemeModal;
