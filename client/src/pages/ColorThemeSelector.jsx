import React, { useState, useRef, useEffect } from "react";
import { ChromePicker } from "react-color";
import { useTheme } from "../ThemeContext";
import colorPalette from "../color.json";
import { IoColorPalette } from "react-icons/io5";
import { FiPlusCircle } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../redux/Slices/HeadingTitle";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useLocation } from "react-router-dom";

const ColorSelector = () => {
  const {
    handleColorChange,
    handleCustomColorChange,
    handleTextChoiceChange,
    handleLayoutTextChoiceChange,
    handleDefaultTheme,
    selectedColor: themeColor,
    selectedShade,
    isCustom,
    handleConsoleTypeChange,
    consoleType,
  } = useTheme();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("purple");
  const [showColors, setShowColors] = useState(false);
  const [showTextColorOptions, setShowTextColorOptions] = useState(false);
  const [showSidebarColorOptions, setShowSidebarColorOptions] = useState(false);
  const [applyToBoth, setApplyToBoth] = useState(consoleType === "both");
  const [customColor, setCustomColor] = useState(isCustom);
  const [selectedTextColorShade, setSelectedTextColorShade] = useState({
    color: "black",
    shade: "500",
  });
  const [selectedLayout, setSelectedLayout] = useState({
    color: "white",
    shade: "500",
    isCustom: "",
  });
  const dispatch = useDispatch();
  const theme = JSON.parse(localStorage.getItem("theme")) || {};
  const [textColor, setTextColor] = useState(
    theme?.bgColor?.textColor || "#000000"
  );
  const [layoutTextColor, setLayoutTextColor] = useState(
    theme?.bgColor?.layoutTextColor || "#FFFFFF"
  );
  const shades = [
    "900",
    "800",
    "700",
    "600",
    "500",
    "400",
    "300",
    "200",
    "100",
  ];
  const { pathname } = useLocation();
  const currentConsole = pathname?.includes("admin-console") ? "admin" : "data";

  const colorPickerRef = useRef(null);
  const colorSectionRef = useRef(null);

  const handleConsoleChange = (event) => {
    const isChecked = event.target.checked;
    setApplyToBoth(isChecked);
    handleConsoleTypeChange(isChecked ? "both" : currentConsole);
  };

  useEffect(() => {
    setTextColor(theme?.bgColor?.textColor);
  }, []);

  useEffect(() => {
    setSelectedColor();
    dispatch(setHeadingTitle("Color"));
  }, []);

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    handleColorChange(color, "400");
    // setShowColorPicker(false);
    setCustomColor("");
  };

  const handleCustomColor = (customColor) => {
    setSelectedColor(customColor);
    handleCustomColorChange(customColor, true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colorSectionRef.current &&
        !colorSectionRef.current.contains(event.target)
      ) {
        setShowColors(false);
        setShowColorPicker(false);
        setShowTextColorOptions(false);
        setShowSidebarColorOptions(false);
      } else if (
        colorSectionRef.current &&
        colorSectionRef.current.contains(event.target) &&
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target)
      ) {
        // setShowColorPicker(false);
        setShowColors(false);
        setShowSidebarColorOptions(false);
      }
      // if (
      //   colorPickerRef.current &&
      //   colorPickerRef.current.contains(event.target)
      // ) {
      // setShowColorPicker(false);
      // }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Updated Text A color change handler
  const handleTextColorChange = (color, shade = null) => {
    setSelectedTextColorShade({ color, shade: shade ? shade : "400" });
    const actualColor = shade
      ? colorPalette[color][shade]
      : colorPalette[color]["400"];
    setTextColor(actualColor);
    handleTextChoiceChange(color, shade);
  };

  // Updated Layout Text color change handler
  const handleLayoutTextColorChange = (
    color,
    shade = null,
    isCustomColor = false
  ) => {
    if (isCustomColor) {
      setSelectedLayout({ color, shade: "", isCustom: true });
      setLayoutTextColor(color);
      handleLayoutTextChoiceChange(color, "", true);
    } else {
      setSelectedLayout({
        color,
        shade: shade ? shade : "400",
        isCustom: false,
      });
      const actualColor = shade
        ? colorPalette[color][shade]
        : colorPalette[color]["400"];
      setLayoutTextColor(actualColor);
      handleLayoutTextChoiceChange(color, shade, false);
    }
  };

  const handleOk = () => {
    setShowColorPicker(false);
    setShowColors(false);
  };

  const handleTextColor = () => {
    setShowTextColorOptions(!showTextColorOptions);
    setShowColors(false);
    setShowColorPicker(false);
    setShowSidebarColorOptions(false);
  };

  const handleSidebarColor = () => {
    setShowSidebarColorOptions((prev) => !prev);
    setShowColors(false);
    setShowColorPicker(false);
    setShowTextColorOptions(false);
  };

  return (
    <div className="p-4 relative" ref={colorSectionRef}>
      <div className="flex flex-col gap-3 cursor-pointer">
        <div
          className=" relative flex flex-col"
          onClick={() => handleTextColor()}
        >
          <span className="text-lg text-black font-bold">Text A</span>
          <span
            className="h-1 w-6 block"
            style={{ backgroundColor: textColor }}
          ></span>
          {showTextColorOptions && (
            <div className="absolute top-12 mt-1 ml-28 p-3 w-fit py-4 border rounded-md shadow-md bg-white">
              <div className="flex flex-col w-fit gap-2 overflow-x-auto">
                {Object.keys(colorPalette).map((color) => (
                  <div key={color} className="flex w-fit items-center gap-2">
                    <button
                      onClick={() => handleTextColorChange(color)}
                      className={`w-5 h-5 rounded-full border ${
                        selectedTextColorShade?.color === color &&
                        selectedTextColorShade?.shade === "400"
                          ? "ring-2 ring-black"
                          : ""
                      }`}
                      style={{ backgroundColor: colorPalette[color]["400"] }}
                    ></button>

                    <div className="flex gap-1">
                      {shades.map((shade) => (
                        <button
                          key={shade}
                          onClick={() => handleTextColorChange(color, shade)}
                          className={`w-5 h-5 rounded-full border ${
                            selectedTextColorShade?.color === color &&
                            selectedTextColorShade?.shade === shade
                              ? "ring-2 ring-black"
                              : ""
                          }`}
                          style={{
                            backgroundColor: colorPalette[color][shade],
                          }}
                        ></button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="flex gap-4">
          Layout
          <IoColorPalette
            onClick={() => {
              setShowColors(!showColors);
              setShowTextColorOptions(false);
              setShowSidebarColorOptions(false);
            }}
            className="text-black text-2xl cursor-pointer"
          />
        </button>

        <div>
          <button
            onClick={() => {
              handleDefaultTheme();
              setShowColors(false);
              setShowTextColorOptions(false);
              setShowSidebarColorOptions(false);
            }}
          >
            Default
          </button>
        </div>

        <div
          className=" relative flex flex-col"
          onClick={() => handleSidebarColor()}
        >
          <span className="text-lg text-black font-bold">Layout Text</span>
          <span
            className="h-1 w-full block"
            style={{ backgroundColor: layoutTextColor }}
          ></span>
          {showSidebarColorOptions && (
            <div className="absolute top-0 mt-1 ml-28 p-3 w-fit py-4 border rounded-md shadow-md bg-white">
              <div className="flex flex-col w-fit gap-2 overflow-x-auto p-1">
                {Object.keys(colorPalette).map((color) => (
                  <div key={color} className="flex w-fit items-center gap-2">
                    <button
                      onClick={() => handleLayoutTextColorChange(color)}
                      className={`w-5 h-5 rounded-full border ${
                        selectedLayout?.color === color &&
                        selectedLayout?.shade === "400" &&
                        !selectedLayout?.isCustom
                          ? "ring-2 ring-black"
                          : ""
                      }`}
                      style={{ backgroundColor: colorPalette[color]["400"] }}
                    ></button>

                    <div className="flex gap-1">
                      {shades.map((shade) => (
                        <button
                          key={shade}
                          onClick={() =>
                            handleLayoutTextColorChange(color, shade)
                          }
                          className={`w-5 h-5 rounded-full border ${
                            selectedLayout?.color === color &&
                            selectedLayout?.shade === shade &&
                            !selectedLayout?.isCustom
                              ? "ring-2 ring-black"
                              : ""
                          }`}
                          style={{
                            backgroundColor: colorPalette[color][shade],
                          }}
                        ></button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex text-black items-center gap-2">
                <p className="text-[0.6rem] font-bold">Custom Color:</p>
                <FiPlusCircle
                  className="cursor-pointer text-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColorPicker(!showColorPicker);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <FormControlLabel
        control={
          <Checkbox checked={applyToBoth} onChange={handleConsoleChange} />
        }
        label={`Also Apply ${
          currentConsole === "admin" ? "Data Console" : "Admin Console"
        }`}
      />
      {showColors && (
        <div className="absolute  top-5 mt-1 ml-28 p-3 w-fit py-4 border rounded-md shadow-md bg-white">
          <div className="flex flex-col w-fit gap-2 overflow-x-auto">
            {Object.keys(colorPalette).map((color) => (
              <div key={color} className="flex w-fit items-center gap-2">
                <button
                  onClick={() => handleColorSelect(color)}
                  className={`w-5 h-5 rounded-full border ${
                    themeColor === color && !customColor
                      ? "ring-2 ring-black"
                      : ""
                  }`}
                  style={{ backgroundColor: colorPalette[color]["400"] }}
                ></button>

                <div className="flex gap-1">
                  {shades.map((shade) => (
                    <button
                      key={shade}
                      onClick={() => {
                        handleColorChange(color, shade), setCustomColor("");
                      }}
                      className={`w-5 h-5 rounded-full border ${
                        themeColor === color &&
                        selectedShade === shade &&
                        !customColor
                          ? "ring-2 ring-black"
                          : ""
                      }`}
                      style={{ backgroundColor: colorPalette[color][shade] }}
                    ></button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex text-black items-center gap-2">
            <p className="text-[0.6rem] font-bold">Custom Color:</p>
            <FiPlusCircle
              className="cursor-pointer text-xl"
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
          </div>
        </div>
      )}

      {showColorPicker && (
        <div
          className="absolute left-1/2 top-16 shadow-lg rounded-lg z-50"
          ref={colorPickerRef}
        >
          <ChromePicker
            color={
              showSidebarColorOptions
                ? layoutTextColor
                : customColor || "#ffffff"
            }
            disableAlpha={false} // Explicitly enable alpha
            onChange={(updatedColor) => {
              const colorWithAlpha = `rgba(${updatedColor.rgb.r}, ${updatedColor.rgb.g}, ${updatedColor.rgb.b}, ${updatedColor.rgb.a})`;
              if (showSidebarColorOptions) {
                setLayoutTextColor(colorWithAlpha);
              } else {
                setCustomColor(colorWithAlpha);
              }
            }}
            onChangeComplete={(updatedColor) => {
              const colorWithAlpha = `rgba(${updatedColor.rgb.r}, ${updatedColor.rgb.g}, ${updatedColor.rgb.b}, ${updatedColor.rgb.a})`;
              if (showSidebarColorOptions) {
                handleLayoutTextChoiceChange(colorWithAlpha, "", true);
              } else {
                handleCustomColor(colorWithAlpha);
              }
            }}
          />
          <button onClick={handleOk} className="w-full p-2 shadow-md bg-white">
            Ok
          </button>
        </div>
      )}
    </div>
  );
};

export default ColorSelector;
