import { useEffect } from "react";
import { LeftPanel } from "../Components/LoginPage/LeftPanel";
import { LoginForm } from "../Components/LoginPage/LoginForm";

export function hexToRgb(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ].join(",");
}
export const rgb = hexToRgb("#6f2fe1");
export const D =
  //  false
  //   ? {
  //       bg: "#0e0e14",
  //       surface: "#17171f",
  //       border: `rgba(${rgb},0.16)`,
  //       text: "#f1f5f9",
  //       sub: "#94a3b8",
  //       faint: "#475569",
  //       card: "#1c1c27",
  //       navBg: "#13131a",
  //       inputBg: "#22222c",
  //       shadow: "0 2px 12px rgba(0,0,0,0.5)",
  //     }
  //   :
  {
    bg: "#f7f5ff",
    surface: "#ffffff",
    border: `rgba(${rgb},0.12)`,
    text: "#1a1028",
    sub: "#6b7280",
    faint: "#9ca3af",
    card: "#ffffff",
    navBg: "#ffffff",
    inputBg: "#f8f6ff",
    shadow: `0 2px 16px rgba(${rgb},0.07)`,
  };
export function LoginPage({ setIsLogin }) {
  // set title for login route
  useEffect(() => {
    document.title = "ITAMExperts - Login";
  }, []);

  return (
    <div
      className={`min-h-screen flex font-['DM Sans'] transition-colors
  ${
    // isDark ? "bg-[#0a0a12]" :
    "bg-[#f7f5ff]"
  }
  flex-col lg:flex-row`}
    >
      <LeftPanel accent={"#6f2fe1"} />
      <LoginForm onLogin={setIsLogin} accent={"#6f2fe1"} rgb={rgb} D={D} />
    </div>
  );
}
