import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  "SSO Configuration",
  "SMTP Configuration",
  "Object",
  "Scheduled Emails",
];

const linkClass = ({ isActive }) =>
  `text-left px-3 py-2 rounded-md text-sm font-medium transition block w-full ${
    isActive
      ? "bg-accent-muted text-text-primary"
      : "text-text-sub hover:bg-accent-dim hover:text-text-primary"
  }`;

export default function SettingsSidebar({ active, onChange }) {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin-console")
    ? "/admin-console"
    : "/data-console";

  return (
    <nav className="flex flex-col gap-0.5 w-44 shrink-0">
      {navItems.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`text-left px-3 py-2 rounded-md text-sm font-medium transition
            ${
              active === item
                ? "bg-accent-muted text-text-primary"
                : "text-text-sub hover:bg-accent-dim hover:text-text-primary"
            }`}
        >
          {item}
        </button>
      ))}
      <div className="mt-3 pt-3 border-t border-border-theme">
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">AI</p>
        <NavLink to={`${base}/settings/ai-prompts`} className={linkClass} end>
          AI Prompts
        </NavLink>
        <NavLink to={`${base}/settings/ai-model`} className={linkClass} end>
          AI Model
        </NavLink>
      </div>
    </nav>
  );
}
