import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { TextInput } from "./TextInput";
import { adminBaseUrl, axiosDefaultHeader } from "../../Utility/baseUrl";
import microsoftLogo from "../../assets/Microsoft_Logo.png";

export function LoginForm({ onLogin, accent, rgb, D }) {
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSSOLogin = () =>
    window.open(`${adminBaseUrl}/authenticate/sso`, "_self");

  const handleBasicAuth = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username and password required.");
      toast.error("Username and password required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const encodedCredentials = btoa(`${username}:${password}`);

      const response = await axios.get(`${adminBaseUrl}/authenticate/basic`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encodedCredentials}`,
        },
      });

      const data = response.data;
      onLogin(data.token);
      localStorage.setItem("auth-token", data.token);
      localStorage.setItem("user-id", data.userId);
      localStorage.setItem("refresh-token", data.refreshToken);
      axiosDefaultHeader(data.token);
      navigate("/data-console");
      toast.success("Authenticated successfully!");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to authenticate";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: accent || "#6f2fe1" }}
          >
            Welcome
          </p>
          <h1
            className="text-3xl font-extrabold mb-2 mt-2"
            style={{ color: D.text }}
          >
            Sign in to your account
          </h1>
          <p className="text-sm" style={{ color: D.faint }}>
            Enter your credentials to access the dashboard.
          </p>
        </div>
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
            ⚠ {error}
          </div>
        )}
        <form onSubmit={handleBasicAuth} className="flex flex-col gap-4">
          <TextInput
            label="Username"
            icon="✉"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Username"
            accent={accent}
            D={D}
            focus={focus === "username"}
            onFocus={() => setFocus("username")}
            onBlur={() => setFocus(null)}
          />
          <div className="relative">
            <TextInput
              label="Password"
              icon="🔒"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              accent={accent}
              D={D}
              focus={focus === "password"}
              onFocus={() => setFocus("password")}
              onBlur={() => setFocus(null)}
              rightSlot={
                <button type="button" onClick={() => setShowPw((p) => !p)}>
                  {showPw ? "🙈" : "👁"}
                </button>
              }
            />
          </div>
          {/* Remember me */}
          <label
            className="flex items-center gap-2 text-sm my-1"
            style={{ color: D.sub }}
          >
            <input
              type="checkbox"
              className="w-4 h-4"
              style={{ accentColor: accent }}
            />
            Keep me signed in
          </label>

          <button
            type="submit"
            disabled={loading}
            className="py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition text-sm mx-3"
            style={{
              background: loading
                ? `rgba(${rgb},0.6)`
                : `linear-gradient(135deg,${accent},${accent}cc)`,
              boxShadow: `0 4px 16px rgba(${rgb},0.3)`,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>
        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: D.border }} />
          <span className="text-[11px]" style={{ color: D.faint }}>
            OR CONTINUE WITH
          </span>
          <div className="flex-1 h-px" style={{ background: D.border }} />
        </div>
        <div className="mt-4 space-y-3">
          <button
            onClick={handleSSOLogin}
            type="button"
            disabled={loading}
            style={{
              background: D.inputBg,
              border: `1.5px solid ${D.border}`,
              color: D.sub,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.color = accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = D.border;
              e.currentTarget.style.color = D.sub;
            }}
            className="w-full flex items-center justify-center gap-3 px-6 py-3  text-slate-800 font-semibold rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src={microsoftLogo}
              alt="Windows Logo"
              className="w-5 h-5 object-contain"
            />
            <span>{loading ? "Connecting…" : "Single Sign-On (SSO)"}</span>
          </button>
        </div>
        <p className="text-center mt-6 text-xs" style={{ color: D.faint }}>
          Don't have an account?{" "}
          <span style={{ color: "#6f2fe1" }} className="font-semibold ">
            {" "}
            Contact your admin
          </span>
        </p>
      </div>
    </div>
  );
}
