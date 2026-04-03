const navItems = [
  "SSO Configuration",
  "SMTP Configuration",
  "Object",
  "Scheduled Emails",
];

const aiNavItems = ["AI Prompts", "AI Model"];

const itemButtonClass = (isActive) =>
  `text-left px-3 py-2 rounded-md text-sm font-medium transition w-full ${
    isActive
      ? "bg-accent-muted text-text-primary"
      : "text-text-sub hover:bg-accent-dim hover:text-text-primary"
  }`;

export default function SettingsSidebar({ active, onChange }) {
  return (
    <nav className="flex flex-col gap-0.5 w-44 shrink-0">
      {navItems.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={itemButtonClass(active === item)}
        >
          {item}
        </button>
      ))}
      <div className="mt-3 pt-3 border-t border-border-theme">
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          AI
        </p>
        {aiNavItems.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={itemButtonClass(active === item)}
          >
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}
