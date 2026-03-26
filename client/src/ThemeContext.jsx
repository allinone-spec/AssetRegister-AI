import React, { createContext, useContext, useEffect, useState } from "react";
import colorPalette from "./color.json";
import {
  createTheme,
  getReadAllTheme,
  getRequest,
  patchMultipartFormRequest,
} from "./Service/api.service";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { pathname } = useLocation();
  const currentConsole = pathname?.includes("admin-console") ? "admin" : "data";
  const savedTheme = JSON.parse(localStorage.getItem("theme"));
  const [bgColor, setBgColor] = useState(
    savedTheme?.bgColor || {
      backgroundColor: "#6F2FE1",
      textColor: savedTheme?.bgColor?.textColor || "#000000",
      layoutTextColor: savedTheme?.bgColor?.layoutTextColor || "#FFFFFF",
    }
  );

  const [selectedColor, setSelectedColor] = useState(
    savedTheme?.selectedColor || "purple"
  );
  const [selectedShade, setSelectedShade] = useState(
    savedTheme?.selectedShade || "400"
  );
  const [isCustom, setIsCustom] = useState(savedTheme?.isCustom || "");
  const [textWhiteColor, setTextWhiteColor] = useState("#FFFFFF");
  const [textBlackColor, setTextBlackColor] = useState("#000000");
  const [textChoice, setTextChoice] = useState(
    savedTheme?.textChoice || "textWhite"
  );
  const [consoleType, setConsoleType] = useState(currentConsole);
  const [logoPath, setLogoPath] = useState("");
  const [logoReset, setLogoReset] = useState(false);

  const [previewTheme, setPreviewTheme] = useState({
    bgColor,
    selectedColor: savedTheme?.selectedColor || "purple",
    selectedShade: savedTheme?.selectedShade || "400",
    isCustom: savedTheme?.isCustom || "",
    console: currentConsole,
  });

  useEffect(() => {
    if (currentConsole.length) {
      setPreviewTheme((pre) => ({ ...pre, console: currentConsole }));
      setConsoleType(currentConsole);
    }
  }, [currentConsole]);

  const fetchThemeFromAPI = async (themeId) => {
    try {
      // const response = await fetch(`${baseUrl}/theme/3/read`);
      const response = await getRequest(`/theme/${themeId}/read`, false);
      const result = response?.data;
      const { bgColor, selectedColor, selectedShade, isCustom } = result;
      if (result) {
        const newBgColor = {
          backgroundColor: bgColor.backgroundColor || "#6F2FE1",
          textColor: bgColor.textColor || "#000000",
          layoutTextColor: bgColor.layoutTextColor || "#FFFFFF",
        };

        setBgColor(newBgColor);
        setSelectedColor(selectedColor || "purple");
        setSelectedShade(selectedShade || "400");
        setIsCustom(isCustom || "");
        console.log("get theme", {
          bgColor: newBgColor,
          selectedColor: result.selectedColor,
          selectedShade: result.selectedShade,
          isCustom: result.isCustom,
        });
        localStorage.setItem(
          "theme",
          JSON.stringify({
            bgColor: newBgColor,
            selectedColor: result.selectedColor,
            selectedShade: result.selectedShade,
            isCustom: result.isCustom,
            console: consoleType,
          })
        );
      }
    } catch (error) {
      console.error("Failed to fetch theme from API:", error);
    }
  };

  const updateThemeAPI = async (themeData, selectLogo) => {
    // try {
    //   const response = await (applyThemeId ? patchRequest(`/theme/${applyThemeId}/update`, themeData) : createTheme(`/theme/add`, themeData))
    //   console.log(response)
    //   if (response.status !== 200) {
    //     throw new Error(`Error: ${response?.data?.message}`);
    //   }
    //   fetchThemeFromAPI(applyThemeId || response.data?.id);
    //   const result = await response.data;
    //   console.log('Theme updated successfully:', result);
    //   toast.success(response?.data?.message || "Theme Update successfully")
    //   return result;
    // } catch (error) {
    //   console.error('Failed to update theme:', error);
    //   toast.error(`Failed to update theme. ${error.response?.data?.message}` || "Failed To update theme")
    //   fetchThemeFromAPI(applyThemeId || response.data?.id);
    //   throw error;
    // }
    let themeIdToUse;
    try {
      const themesResponse = await getReadAllTheme(`/theme/readAll`);
      const themes = themesResponse.data;

      const completeThemeData = {
        ...themeData,
        // logoPath: typeof selectLogo === "string" ? selectLogo : null,
        console: themeData?.console || currentConsole,
      };

      let response;
      const existingThemeForConsole = themes.filter(
        (theme) =>
          theme.console === currentConsole ||
          theme.console === "both" ||
          themeData?.console === "both"
      );

      // Only send file: null if logoReset is true and selectLogo is null
      const filePayload =
        logoReset && (selectLogo === null || selectLogo === "")
          ? { file: null }
          : typeof selectLogo !== "string" && selectLogo
          ? { file: selectLogo }
          : {};
      console.log("filePayload", filePayload, logoReset, selectLogo);
      if (existingThemeForConsole.length) {
        for (const existingTheme of existingThemeForConsole) {
          response = await patchMultipartFormRequest(
            `/theme/${existingTheme.id}/update`,
            {
              themeRequest: JSON.stringify(completeThemeData),
              ...filePayload,
            }
          );
          if (logoReset && selectLogo === null) {
            setLogoPath(""); // Clear logo path for default logo
          } else if (selectLogo) {
            const themesResponse = await getReadAllTheme(
              `/theme/${existingTheme.id}/read`
            );
            setLogoPath(themesResponse.data?.logoPath);
          }
          themeIdToUse = existingThemeForConsole.id;
        }
      } else if (themes.length >= 2) {
        const themeToUpdate =
          themes.find((theme) => theme.console === currentConsole) || themes[0];
        response = await patchMultipartFormRequest(
          `/theme/${themeToUpdate.id}/update`,
          {
            themeRequest: JSON.stringify(completeThemeData),
            ...filePayload,
          }
        );
        if (selectLogo) {
          const themesResponse = await getReadAllTheme(
            `/theme/${themeToUpdate.id}/read`
          );
          setLogoPath(themesResponse.data?.logoPath);
        }
        themeIdToUse = themeToUpdate.id;
      } else {
        const response = await createTheme("/theme/add", {
          themeRequest: JSON.stringify(completeThemeData),
          ...filePayload,
        });
        if (selectLogo) setLogoPath(selectLogo || logoPath);
        if (response?.data && response.data.id) {
          themeIdToUse = response.data.id;
        }
      }

      if (themeIdToUse) {
        localStorage.setItem("isTheme", JSON.stringify(themeIdToUse));
      }

      if (themeIdToUse) fetchThemeFromAPI(themeIdToUse);

      toast.success(response?.data?.message || "Theme updated successfully");
      return response?.data;
    } catch (error) {
      console.error("Failed to update theme:", error);
      toast.error(error.response?.data?.message || "Failed to update theme");
      if (themeIdToUse) {
        fetchThemeFromAPI(themeIdToUse);
      }
      throw error;
    }
  };

  // useEffect(() => {
  //   if (!savedTheme) {
  //     fetchThemeFromAPI();
  //   }
  // }, []);

  // useEffect(() => {
  // fetchThemeFromAPI();
  // }, []);

  const handleDefaultTheme = (theme) => {
    if (theme) {
      const selectedBackgroundColor = theme?.isCustom
        ? theme?.isCustom
        : theme?.bgColor?.backgroundColor;
      const textColor = theme?.bgColor?.textColor || "#000000";
      const newBgColor = {
        backgroundColor: selectedBackgroundColor,
        textColor: textColor,
        textWhite: theme?.bgColor?.textWhite || "#FFFFFF",
        textBlack: theme?.bgColor?.textBlack || "#000000",
        layoutTextColor: theme?.bgColor?.layoutTextColor || "#FFFFFF",
      };
      setBgColor(newBgColor);
      setSelectedColor(theme?.selectedColor || "purple");
      setSelectedShade(theme?.selectedShade || "400");
      setTextBlackColor("#FFFFFF");
      setTextWhiteColor("#000000");

      localStorage.setItem(
        "theme",
        JSON.stringify({
          bgColor: newBgColor,
          selectedColor: theme?.selectedColor || "purple",
          selectedShade: theme?.selectedShade || "400",
          isCustom: "",
          console: consoleType,
        })
      );
      const newPreviewTheme = {
        bgColor: newBgColor,
        selectedColor: "purple",
        selectedShade: "400",
        isCustom: "",
        console: consoleType,
      };
      setPreviewTheme(newPreviewTheme);
    } else {
      const selectedBackgroundColor = isCustom
        ? isCustom
        : colorPalette["purple"]["400"];
      const textColor = "#000000";
      const newBgColor = {
        backgroundColor: selectedBackgroundColor,
        textColor: textColor,
        textWhite: "#FFFFFF",
        textBlack: "#000000",
        layoutTextColor: "#FFFFFF",
      };
      setBgColor(newBgColor);
      setSelectedColor("purple");
      setSelectedShade("400");
      setTextBlackColor("#FFFFFF");
      setTextWhiteColor("#000000");
      setLogoReset(true);

      localStorage.setItem(
        "theme",
        JSON.stringify({
          bgColor: newBgColor,
          selectedColor: "purple",
          selectedShade: "400",
          isCustom: "",
          console: consoleType,
        })
      );
      const newPreviewTheme = {
        bgColor: newBgColor,
        selectedColor: "purple",
        selectedShade: "400",
        isCustom: "",
        console: consoleType,
      };

      setPreviewTheme(newPreviewTheme);
    }
    // updateThemeAPI({ bgColor: newBgColor, selectedColor: "purple", selectedShade: "400", isCustom:"" })
  };

  const handleColorChange = (color, shade = "400", isCustom) => {
    const selectedBackgroundColor = isCustom
      ? isCustom
      : colorPalette[color][shade];
    const textColor = savedTheme?.bgColor?.textColor || "#000000";
    const newBgColor = {
      backgroundColor: selectedBackgroundColor,
      textColor: textColor,
      layoutTextColor: savedTheme?.bgColor?.layoutTextColor || "#FFFFFFF",
      textWhite: "#FFFFFF",
      textBlack: "#000000",
    };
    setBgColor(newBgColor);
    setSelectedColor(color);
    setSelectedShade(shade);
    setTextBlackColor(textBlackColor);
    setTextWhiteColor(textWhiteColor);

    const newPreviewTheme = {
      bgColor: newBgColor,
      selectedColor: color,
      selectedShade: shade,
      isCustom: isCustom || "",
      console: consoleType,
    };

    setPreviewTheme(newPreviewTheme);

    // localStorage.setItem("theme", JSON.stringify({ bgColor: newBgColor, selectedColor: color, selectedShade: shade, isCustom: isCustom }));
    // updateThemeAPI({ bgColor: newBgColor, selectedColor: color, selectedShade: shade, isCustom: isCustom })
  };

  const handleCustomColorChange = (customColor, isCustom = true) => {
    const newBgColor = {
      backgroundColor: customColor,
      textColor: savedTheme?.bgColor?.textColor || "#000000",
      layoutTextColor: savedTheme?.bgColor?.layoutTextColor || "#FFFFFF",
      textWhite: "#FFFFFF",
      textBlack: "#000000",
    };
    setBgColor(newBgColor);
    setTextBlackColor(textBlackColor);
    setTextWhiteColor(textWhiteColor);

    const newPreviewTheme = {
      bgColor: newBgColor,
      // isCustom: isCustom || "",
      isCustom: isCustom ? customColor : "",
      console: consoleType,
    };

    setPreviewTheme((prev) => ({ ...prev, ...newPreviewTheme }));

    // localStorage.setItem("theme", JSON.stringify({ bgColor: newBgColor, isCustom: customColor }));
    // updateThemeAPI({ bgColor: newBgColor, isCustom: customColor })
  };

  const handleTextChoiceChange = (color, shade = "") => {
    const newTextColor = shade ? colorPalette[color][shade] : color;
    setTextChoice(color);
    setBgColor((prevBgColor) => ({
      ...prevBgColor,
      textColor: newTextColor,
    }));

    const newPreviewTheme = {
      bgColor: {
        ...bgColor,
        textColor: newTextColor,
      },
      selectedColor,
      selectedShade,
      // textChoice: color,
      isCustom,
      console: consoleType,
    };

    setPreviewTheme(newPreviewTheme);

    // localStorage.setItem("theme", JSON.stringify({ bgColor:{
    //   ...bgColor,
    //   textColor: newTextColor
    // }, selectedColor, selectedShade, textChoice: color,isCustom }));
    // updateThemeAPI({ bgColor:{
    //   ...bgColor,
    //   textColor: newTextColor
    // }, selectedColor, selectedShade, textChoice: color,isCustom })
  };

  const handleLayoutTextChoiceChange = (color, shade = "") => {
    // console.log("layout text color",color)
    // console.log("layout text shade",shade)
    const newTextColor = shade ? colorPalette[color][shade] : color;
    setTextChoice(color);
    setBgColor((prevBgColor) => ({
      ...prevBgColor,
      layoutTextColor: newTextColor,
    }));

    const newPreviewTheme = {
      bgColor: {
        ...bgColor,
        layoutTextColor: newTextColor,
      },
      selectedColor,
      selectedShade,
      // textChoice: color,
      isCustom,
      console: consoleType,
    };

    setPreviewTheme(newPreviewTheme);

    // localStorage.setItem("theme", JSON.stringify({ bgColor:{
    //   ...bgColor,
    //   layoutTextColor: newTextColor
    // }, selectedColor, selectedShade, textChoice: color,isCustom }));
  };
  useEffect(() => {
    if (savedTheme) {
      const isCustom = savedTheme?.isCustom;
      handleColorChange(
        savedTheme?.selectedColor,
        savedTheme?.selectedShade,
        isCustom
      );
    }
  }, []);

  const handleApplyTheme = (selectLogo) => {
    setBgColor(previewTheme.bgColor);
    getReadAllTheme(`/theme/readAll`).then((res) => {
      localStorage.setItem("isTheme", JSON.stringify(res.data[0]?.id));
    });
    localStorage.setItem("theme", JSON.stringify(previewTheme));
    updateThemeAPI(previewTheme, selectLogo);
  };

  const handleConsoleTypeChange = (type) => {
    setConsoleType(type);

    const newPreviewTheme = {
      ...previewTheme,
      console: type,
    };

    setPreviewTheme(newPreviewTheme);
  };

  const handleCancelTheme = () => {
    setBgColor(
      savedTheme?.bgColor || {
        backgroundColor: "#6F2FE1",
        textColor: "#000000",
        layoutTextColor: "#FFFFFF",
      }
    );

    setSelectedColor(savedTheme?.selectedColor || "purple");
    setSelectedShade(savedTheme?.selectedShade || "400");
    setIsCustom(savedTheme?.isCustom || "");
    setTextChoice(savedTheme?.textChoice || "textWhite");

    setPreviewTheme({
      bgColor: savedTheme?.bgColor,
      selectedColor: savedTheme?.selectedColor || "purple",
      selectedShade: savedTheme?.selectedShade || "400",
      isCustom: savedTheme?.isCustom || "",
      console: consoleType,
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        bgColor,
        handleColorChange,
        selectedColor,
        selectedShade,
        isCustom,
        setSelectedColor,
        setSelectedShade,
        handleCustomColorChange,
        handleTextChoiceChange,
        handleLayoutTextChoiceChange,
        handleDefaultTheme,
        handleApplyTheme,
        handleCancelTheme,
        colorPalette,
        textBlackColor,
        textWhiteColor,
        textChoice,
        handleConsoleTypeChange,
        consoleType,
        logoPath,
        setLogoPath,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
