import { useEffect, useState } from "react";
import { FiEdit, FiSave, FiX } from "react-icons/fi";
import {
  HiOutlineMail,
  HiOutlineShieldCheck,
  HiOutlineUser,
} from "react-icons/hi";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../redux/Slices/HeadingTitle";
import { getUser, patchRequest } from "../Service/api.service";
import InputField from "../Components/Common/Fileds/InputField";
import PasswordField from "../Components/Common/Fileds/PasswordField";

const UserProfile = () => {
  const dispatch = useDispatch();
  const [fetchingUser, setFetchingUser] = useState(true);
  const [user, setUser] = useState({
    userId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [updatedUser, setUpdatedUser] = useState(user);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(setHeadingTitle("Profile"));
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedUser((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    setFetchingUser(true);
    getUser(`/user/${localStorage.getItem("user-id")}/read`)
      .then((res) => {
        const userData = {
          userId: res.data.userId,
          firstName: res.data.firstName || "",
          lastName: res.data.lastName || "",
          email: res.data.email || "",
          middleName: res.data.middleName || "",
          password: "",
        };
        setUser(userData);
        setUpdatedUser(userData);
      })
      .finally(() => setFetchingUser(false));
  }, []);

  const handleCancel = () => {
    setUpdatedUser({ ...user, password: "" });
    setEditMode(false);
    setShowPassword(false);
  };

  const handleSave = () => {
    setLoading(true);
    const payload = {
      ...updatedUser,
      ...(updatedUser.password ? {} : { password: undefined }),
    };

    patchRequest(`/user/${user?.userId}/update`, payload)
      .then(() => {
        const nextUser = { ...updatedUser, password: "" };
        setUser(nextUser);
        setUpdatedUser(nextUser);
        setEditMode(false);
        setShowPassword(false);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (fetchingUser) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border-theme bg-surface px-5 py-4 shadow-theme">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-text-sub">Loading profile...</span>
        </div>
      </div>
    );
  }

  const profileInitials =
    `${updatedUser.firstName?.[0] || ""}${updatedUser.lastName?.[0] || ""}`.toUpperCase() ||
    "AR";
  const fullName = [
    updatedUser.firstName,
    updatedUser.middleName,
    updatedUser.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-border-theme bg-surface shadow-theme">
        <div className="relative overflow-hidden border-b border-border-theme bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.22),rgba(var(--accent-rgb),0.06)_45%,transparent_100%)] px-6 py-8 sm:px-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(var(--accent-rgb),0.16)] blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-2xl font-black text-white shadow-accent">
                {profileInitials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-faint">
                  Account Settings
                </p>
                <h1 className="mt-2 text-3xl font-black text-text-primary">
                  {fullName || "User Profile"}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-sub">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border-theme bg-input-bg px-3 py-1.5">
                    <HiOutlineMail className="text-base text-accent" />
                    {updatedUser.email || "No email address"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border-theme bg-input-bg px-3 py-1.5">
                    <HiOutlineShieldCheck className="text-base text-accent" />
                    {editMode ? "Editing enabled" : "Read only mode"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiSave />
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-border-theme bg-input-bg px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiX />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  <FiEdit />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.95fr)]">
          <div className="rounded-3xl border border-border-theme bg-input-bg/40 p-5 sm:p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-faint">
                Personal Details
              </p>
              <h2 className="mt-2 text-xl font-bold text-text-primary">
                Keep your profile information current
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="First Name"
                name="firstName"
                value={updatedUser.firstName}
                onChange={handleChange}
                disabled={!editMode}
              />
              <InputField
                label="Last Name"
                name="lastName"
                value={updatedUser.lastName}
                onChange={handleChange}
                disabled={!editMode}
              />
              <InputField
                label="Middle Name"
                name="middleName"
                value={updatedUser.middleName}
                onChange={handleChange}
                disabled={!editMode}
                className="md:col-span-2"
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                value={updatedUser.email}
                onChange={handleChange}
                disabled
                helperText="Email is managed by your account configuration."
                className="md:col-span-2"
              />
              <PasswordField
                label="Password"
                name="password"
                value={updatedUser.password}
                onChange={handleChange}
                visible={showPassword}
                onToggle={() => setShowPassword((prev) => !prev)}
                disabled={!editMode}
                helperText={
                  editMode
                    ? "Leave blank to keep your current password."
                    : "Enable edit mode to update your password."
                }
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border-theme bg-input-bg/40 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-faint">
                Profile Summary
              </p>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-border-theme bg-surface px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-text-sub">
                    <HiOutlineUser className="text-lg text-accent" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-text-faint">
                        Display Name
                      </p>
                      <p className="font-semibold text-text-primary">
                        {fullName || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border-theme bg-surface px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-text-faint">
                    Account Email
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-primary break-all">
                    {updatedUser.email || "No email address"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-theme bg-surface px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-text-faint">
                    Security
                  </p>
                  <p className="mt-1 text-sm text-text-sub">
                    Use edit mode to update your name details, and optionally
                    set a new password before saving.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
