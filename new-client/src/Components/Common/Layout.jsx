// src/layouts/Layout.jsx
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { adminBaseUrl } from "../../Utility/baseUrl";
import { Header } from "../../Components/Header/Header";
import { useTheme } from "../../context/ThemeContext";
import GlobalChatbot from "./GlobalChatbot";

const Layout = ({ setIsLogin }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const showGlobalChatbot =
    location.pathname.startsWith("/data-console") ||
    location.pathname.startsWith("/admin-console");
  const headingTitle = useSelector((state) => state.title.headingTitle);
  const { user } = useSelector((state) => state.permission);

  // useTheme() — accent / dark state now live in ThemeContext, not here
  const { isDark } = useTheme();

  const handleLogout = async () => {
    axios
      .get(`${adminBaseUrl}/authenticate/logout`, { withCredentials: true })
      .catch((err) => console.error("Logout error:", err));
    setIsLogin(false);
    localStorage.clear();
    navigate("/login");
  };

  // Update document title
  useEffect(() => {
    if (headingTitle?.length) {
      document.title = `ITAMExperts - ${headingTitle}`;
    } else {
      const path = location.pathname.replace(/^\//, "");
      const parts = path.split("/").filter(Boolean);
      let base = parts.join(" - ") || "Home";
      base = base.charAt(0).toUpperCase() + base.slice(1);
      document.title = `ITAMExperts - ${base}`;
    }
  }, [location.pathname, headingTitle]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg text-text-primary">
      <Header
        user={user}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      {showGlobalChatbot && <GlobalChatbot />}
    </div>
  );
};

export default Layout;
