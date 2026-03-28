import { useEffect, useRef, useState } from "react";

export function UserMenu({
  user,
  onLogout,
  isDark,
  setIsDark,
  onOpenTheme,
  onOpenProfile,
  settingsOpen,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", onClickOutside);
    }

    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const userInitials =
    (user?.firstName?.charAt(0)?.toUpperCase() || "") +
    (user?.lastName?.charAt(0)?.toUpperCase() || "");

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2 py-1 rounded-full border border-border-theme bg-input-bg cursor-pointer"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-accent">
          {user?.firstName && user?.firstName.charAt(0).toUpperCase()}
          {user?.lastName && user?.lastName.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight text-left">
          <div className="text-xs font-bold text-text">
            {user?.firstName && user?.firstName}
            {/* {user?.lastName && user?.lastName.charAt(0).toUpperCase()} */}
          </div>
          <div className="text-[10px] text-text">
            {user?.rolesName?.length && user?.rolesName[0]}
          </div>
        </div>
        <span className="text-xs text-text">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border-theme bg-surface shadow-theme z-30 p-1">
          <button
            onClick={() => {
              setOpen(false);
              onOpenProfile?.();
            }}
            className="w-full text-left text-xs px-3 py-2 rounded-md text-text-sub hover:bg-accent-dim hover:text-text-primary"
          >
            Profile
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDark?.((p) => !p);
            }}
            className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-md text-text-sub hover:bg-accent-dim hover:text-text-primary"
            aria-label="Toggle dark mode"
          >
            <span>Dark Mode</span>
            <span className="text-sm">{isDark ? "☀️" : "🌙"}</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onOpenTheme?.();
            }}
            className={`w-full text-left text-xs px-3 py-2 rounded-md text-text-sub hover:bg-accent-dim hover:text-text-primary
                        ${
                          settingsOpen
                            ? "bg-accent-muted border-accent text-accent"
                            : "bg-input-bg border-border-theme text-text-faint hover:border-accent"
                        }`}
            aria-label="Settings"
          >
            Theme
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className="w-full text-left text-xs px-3 py-2 rounded-md text-text-sub hover:bg-accent-dim hover:text-text-primary"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
