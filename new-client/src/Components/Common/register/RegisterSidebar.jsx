const navItems = ["Summary", "Detailed"];

export default function RegisterSidebar({ active, onChange }) {
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
    </nav>
  );
}
