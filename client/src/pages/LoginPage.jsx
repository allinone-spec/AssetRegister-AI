import React, { useState, useEffect } from "react";
import loginImg from "../assets/logo.png";
import curvedBackground from "../assets/curvedBackground.png";
import assetImage from "../assets/asset-managmenet.png";
import microsoftLogo from "../assets/Microsoft_Logo.png";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { adminBaseUrl, axiosDefaultHeader } from "../Utility/baseUrl.js";

export const LoginPage = ({ setIsLogin }) => {
  const [loginType, setLoginType] = useState(null);
  const [email, setEmail] = useState("");
  const [username, setUserName] = useState("");
  const [basicAuthPassword, setBasicAuthPassword] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const apiUrls = {
    sso: "/api/auth/sso-login",
    windows: "/api/auth/windows-login",
  };

  // set title for login route
  useEffect(() => {
    document.title = "ITAMExperts - Login";
  }, []);

  const handleSSOLogin = () =>
    window.open(`${adminBaseUrl}/authenticate/sso`, "_self");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = apiUrls[loginType];
    if (!endpoint) {
      toast.error("Invalid login method selected.");
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`${loginType.toUpperCase()} Login Successful`);
        navigate("/data-console");
      } else {
        toast.error(`Login failed: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login request failed.");
    }
  };

  const handleBasicAuth = async (e) => {
    setLoading(true);
    e.preventDefault();
    try {
      if (!username || !basicAuthPassword) {
        toast.error("Username and password required");
        return;
      }

      const encodedCredentials = btoa(`${username}:${basicAuthPassword}`);

      const response = await axios.get(`${adminBaseUrl}/authenticate/basic`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encodedCredentials}`,
        },
      });

      const data = await response.data;
      setIsLogin(data.token);
      localStorage.setItem("auth-token", data.token);
      localStorage.setItem("user-id", data.userId);
      localStorage.setItem("refresh-token", data.refreshToken);
      axiosDefaultHeader(data.token);
      navigate("/data-console");
      toast.success("Authenticated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500  relative overflow-hidden">
      {/* Subtle background decoration */}
      {/* <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div> */}

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
          {/* Left side - Welcome Card */}
          <div className="hidden lg:flex items-center justify-end mb-11">
            <div className="relative">
              {/* Background gradient blur */}
              {/* <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-l-3xl blur-2xl opacity-20"></div> */}

              {/* Main card */}
              <div className="relative rounded-l-3xl p-8 w-[560px] h-[600px] flex items-center justify-center shadow-2xl overflow-hidden">
                {/* Curved Background Image */}
                <img
                  src={curvedBackground}
                  alt="Curved Background"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />

                {/* Company logo (top-left) */}
                <div className="absolute top-0 left-[-10px] z-20">
                  <img
                    src={loginImg}
                    alt="Company Logo"
                    className="w-[330px] h-[120px] object-contain"
                  />
                </div>

                {/* Foreground image with glass (polymorphism) card */}
                <div className="relative z-10 w-full h-full">
                  {/* <div
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 w-[330px] h-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[44px] bg-white/10 backdrop-blur-md border border-white/30 ring-1 ring-white/20 shadow-xl"
                  /> */}

                  <img
                    src={assetImage}
                    alt="Asset Categorization"
                    className="absolute bottom-0 right-6 w-[410px] h-[400px] object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="flex items-center justify-start">
            <div className="w-full">
              {/* Card background */}
              <div className="bg-white bg-opacity-95 backdrop-blur-xl rounded-r-3xl shadow-2xl px-8 py-10 border border-white border-opacity-20 h-[600px] flex flex-col justify-center">
                {/* Logo/Brand area */}
                <div className="text-center mb-8">
                  {/* <div className="flex justify-center mb-4">
                    <img
                      src={loginImg}
                      alt="Login Visual"
                      className="h-16 w-16 object-contain"
                    />
                  </div> */}
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    AssetRegister
                  </h1>
                  <p className="text-slate-500 text-sm font-medium">
                    Unified Source of Truth for all your Assets.
                  </p>
                </div>

                {/* Login heading */}
                {loginType && (
                  <h2 className="text-xl font-bold text-slate-900 text-center mb-6">
                    {loginType === "basic"
                      ? "Email & Password"
                      : "Secure Login"}
                  </h2>
                )}

                {!loginType && (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 text-center mb-2"></h2>
                    <p className="text-slate-500 text-center text-sm mb-8">
                      Choose your authentication method
                    </p>

                    <div className="space-y-3">
                      {/* SSO Login Button */}
                      {/* <button
                        onClick={handleSSOLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                        </svg>
                        <span>
                          {loading ? "Connecting..." : "Single Sign-On (SSO)"}
                        </span>
                      </button> */}

                      {/* Basic Auth Button */}
                      <button
                        onClick={() => setLoginType("basic")}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Email & Password</span>
                      </button>
                    </div>

                    {/* Login with Others */}
                    <div className="mt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-px bg-slate-200 flex-1" />
                        <p className="text-sm  text-slate-700">
                          <span className="text-sm font-bold">Login </span>
                          with Others
                        </p>
                        <div className="h-px bg-slate-200 flex-1" />
                      </div>

                      <div className="mt-4 space-y-3">
                        <button
                          onClick={handleSSOLogin}
                          disabled={loading}
                          type="button"
                          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-slate-800 font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all duration-200 shadow-sm"
                        >
                          <img
                            src={microsoftLogo}
                            alt="Windows Logo"
                            className="w-5 h-5 object-contain"
                          />
                          <span>
                            {loading ? "Connecting..." : "Single Sign-On (SSO)"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Security note */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <div className="flex items-start gap-3 text-xs text-slate-600">
                        <svg
                          className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p>
                          Your connection is secure and encrypted. This platform
                          complies with enterprise security standards.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* SSO/Windows form */}
                {(loginType === "sso" || loginType === "windows") && (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="your.email@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                    >
                      Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => setLoginType(null)}
                      className="w-full px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all duration-200"
                    >
                      Back
                    </button>
                  </form>
                )}

                {/* Basic Auth form */}
                {loginType === "basic" && (
                  <form onSubmit={handleBasicAuth} className="mt-6 space-y-4">
                    <div className="relative">
                      <label className="sr-only">Username</label>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div className="relative">
                      <label className="sr-only">Password</label>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 11c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 11a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="password"
                        placeholder="Password"
                        value={basicAuthPassword}
                        onChange={(e) => setBasicAuthPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        disabled={loading}
                        type="submit"
                        className="w-44 mx-auto mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-full hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        {loading ? "Signing In..." : "Sign In"}
                      </button>
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setLoginType(null)}
                        className="px-6 py-2.5 bg-transparent text-slate-600 font-semibold hover:bg-slate-100 transition-all duration-200 rounded-full"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer text */}
              <p className="text-center text-sm text-white mt-6">
                © 2026 ITAMExperts. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};
