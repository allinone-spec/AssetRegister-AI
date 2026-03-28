// src/Components/Header/Header.jsx
import { useEffect, useRef, useState } from "react";
import { Box, Check } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { SettingsBar } from "./SettingsBar";
import { UserMenu } from "./UserMenu";
import HeaderNav from "./HeaderNav";
import MobileSidebar from "./MobileSidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedObject,
  setSelectedObjectName,
} from "../../redux/Slices/ObjectSelection";
import { getRequest } from "../../Service/api.service";

export function Header({ user, onLogout }) {
  const { isDark, setIsDark, settingsOpen, openSettings, closeSettings } =
    useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [objectData, setObjectData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [objectDropdownOpen, setObjectDropdownOpen] = useState(false);
  const objectDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const isAdminConsole = location.pathname.includes("admin-console");

  const goToConsole = (type) => {
    if (type === "admin" && !isAdminConsole) navigate("admin-console");
    if (type === "data" && isAdminConsole) navigate("data-console");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        objectDropdownRef.current &&
        !objectDropdownRef.current.contains(e.target)
      ) {
        setObjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleObjectSelect = (objectId) => {
    const objectName =
      objectData.find((item) => String(item.objectId) === objectId)
        ?.objectName || "";
    dispatch(setSelectedObject(objectId));
    dispatch(setSelectedObjectName(objectName));
    localStorage.setItem("selectedObject", objectId);
    localStorage.setItem("selectedObjectName", objectName);
    setObjectDropdownOpen(false);
  };

  const selectedObjectName = objectData.find(
    (item) => String(item.objectId) === selectedObject,
  )?.objectName;

  useEffect(() => {
    const fetchAllObjects = async () => {
      setLoading(true);
      try {
        const response = await getRequest("/objects/readAll");
        setObjectData(response?.data || []);
        const savedObject = localStorage.getItem("selectedObject");
        const selectedObjectName = localStorage.getItem("selectedObjectName");
        if (savedObject) {
          dispatch(setSelectedObject(savedObject));
          dispatch(setSelectedObjectName(selectedObjectName));
        }
      } catch (error) {
        console.log("Error fetchAllObjects", error);
        setObjectData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllObjects();
  }, []);

  return (
    <>
      <nav className="h-14 flex items-center px-4 lg:px-6 border-b border-border-theme bg-nav-bg shadow-theme z-20">
        {/* ── Brand ─────────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0 bg-accent shadow-accent">
            AR
          </div>
          <div className="leading-tight truncate">
            <div className="text-sm font-bold truncate text-text-primary">
              Asset<span className="text-accent">Register</span>
            </div>
            <div className="hidden sm:block text-[10px] uppercase tracking-widest font-semibold text-text-faint">
              Enterprise Suite
            </div>
          </div>
        </div>

        {/* ── Desktop Nav ───────────────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-1">
          <HeaderNav />
        </div>

        {/* ── Right-side controls ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Console toggle */}
          <div className="hidden md:flex items-center p-1 rounded-full border border-border-theme bg-input-bg">
            <button
              onClick={() => goToConsole("data")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                !isAdminConsole
                  ? "bg-accent-muted text-text-primary"
                  : "text-text-faint hover:text-text-primary"
              }`}
            >
              Data
            </button>
            <button
              onClick={() => goToConsole("admin")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                isAdminConsole
                  ? "bg-accent-muted text-text-primary"
                  : "text-text-faint hover:text-text-primary"
              }`}
            >
              Admin
            </button>
          </div>
          {/* Notifications */}
          {/* <button
            className="w-9 h-9 rounded-lg border border-border-theme bg-input-bg
                             flex items-center justify-center relative
                             hover:border-accent focus:outline-none transition-colors"
            aria-label="Notifications"
          >
            🔔
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button> */}
          {/* Object selector */}
          <div className="hidden md:block relative" ref={objectDropdownRef}>
            <button
              onClick={() => setObjectDropdownOpen((prev) => !prev)}
              className="group w-9 h-9 rounded-lg border border-border-theme bg-input-bg
                         flex items-center justify-center relative
                         hover:border-accent focus:outline-none transition-colors"
              aria-label="Select object"
            >
              <Box
                size={16}
                className="text-text-sub group-hover:text-accent transition-colors"
              />
              {selectedObject && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
              )}
              <span
                className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                               rounded bg-gray-800 px-2 py-1 text-[11px] text-white
                               opacity-0 group-hover:opacity-100 transition-opacity z-50"
              >
                {selectedObjectName || "Select Object"}
              </span>
            </button>

            {objectDropdownOpen && (
              <div className="absolute right-0 top-11 w-56 rounded-lg border border-border-theme bg-nav-bg shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border-theme">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                    Select Object
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <button
                    onClick={() => handleObjectSelect("")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left
                      ${!selectedObject ? "bg-accent/10 text-accent font-medium" : "text-text-primary hover:bg-input-bg"}`}
                  >
                    {!selectedObject && (
                      <Check size={14} className="text-accent shrink-0" />
                    )}
                    <span className={!selectedObject ? "" : "pl-[22px]"}>
                      All Object
                    </span>
                  </button>
                  {loading ? (
                    <div className="px-3 py-3 text-sm text-text-faint text-center">
                      Loading...
                    </div>
                  ) : objectData.length ? (
                    objectData.map((obj) => {
                      const isSelected =
                        String(obj.objectId) === selectedObject;
                      return (
                        <button
                          key={obj.objectId}
                          onClick={() =>
                            handleObjectSelect(String(obj.objectId))
                          }
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left
                            ${isSelected ? "bg-accent/10 text-accent font-medium" : "text-text-primary hover:bg-input-bg"}`}
                        >
                          {isSelected && (
                            <Check size={14} className="text-accent shrink-0" />
                          )}
                          <span className={isSelected ? "" : "pl-[22px]"}>
                            {obj.objectName}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-sm text-text-faint text-center">
                      No Object Found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Settings */}
          <UserMenu
            user={user}
            onLogout={onLogout}
            isDark={isDark}
            setIsDark={setIsDark}
            onOpenTheme={() => {
              if (settingsOpen) closeSettings();
              else openSettings();
            }}
            onOpenProfile={() =>
              navigate(
                isAdminConsole
                  ? "admin-console/profile"
                  : "data-console/profile",
              )
            }
            settingsOpen={settingsOpen}
          />
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg border border-border-theme bg-input-bg
                       flex items-center justify-center hover:border-accent focus:outline-none transition-colors"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </nav>

      <MobileSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {settingsOpen && <SettingsBar />}
    </>
  );
}
