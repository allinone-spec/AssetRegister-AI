// src/Components/Header/HeaderNav.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTheme } from "../../context/ThemeContext";
import sidebarData from "../../Data/FileExplorerData";
import adminConsoleSidebarData from "../../Data/AdminConsole";

export default function HeaderNav() {
  const { accent } = useTheme();
  const { permissionList } = useSelector((s) => s.permission);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminConsole = location.pathname.includes("admin-console");
  const menuData = isAdminConsole ? adminConsoleSidebarData : sidebarData;

  return (
    <div className="flex items-center gap-1 ml-6">
      {menuData
        .filter((item) => permissionList?.includes(item.title))
        .map((item, i) => {
          const isActive = location.pathname.includes(item.path);
          return (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer border-none bg-transparent
                ${
                  isActive
                    ? "font-semibold bg-accent/10"
                    : "font-medium text-text-sub hover:text-text-primary hover:bg-input-bg"
                }`}
              style={{ color: isActive ? accent.hex : undefined }}
            >
              {/* {item.icon && (
                <span
                  className="text-[15px] flex items-center"
                  style={{ color: isActive ? accent.hex : undefined }}
                >
                  {item.icon}
                </span>
              )} */}
              {item.title}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full w-6 h-[2px]"
                  style={{ background: accent.hex }}
                />
              )}
            </button>
          );
        })}
    </div>
  );
}
