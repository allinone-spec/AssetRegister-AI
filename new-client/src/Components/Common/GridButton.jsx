export default function GridButton({ setView, view }) {
  return (
    <div className="flex bg-accent-muted rounded-xl overflow-hidden p-[2px] gap-1 h-9 border border-input-bg">
      {[
        ["☰", "table"],
        ["⊞", "grid"],
      ].map(([ic, v]) => (
        <button
          key={v}
          onClick={() => setView(v)}
          style={{
            padding: "1px 13px",
          }}
          className={`${view === v ? "bg-accent text-white" : "transparent text-accent"} border-none rounded-lg text-sm cursor-pointer `}
        >
          {ic}
        </button>
      ))}
    </div>
  );
}
