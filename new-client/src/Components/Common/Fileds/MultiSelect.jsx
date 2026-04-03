import { useEffect, useRef, useState } from "react";
import { MdCheck, MdKeyboardArrowDown } from "react-icons/md";

const MultiSelect = ({
  label,
  required,
  options,
  value = [],
  onChange,
  getOptionValue,
  getOptionLabel,
  showSelectAll = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (optVal) => {
    const next = value.includes(optVal)
      ? value.filter((v) => v !== optVal)
      : [...value, optVal];
    onChange(next);
  };

  const toggleAll = () => {
    if (value.length === options.length) onChange([]);
    else onChange(options.map(getOptionValue));
  };

  const selectedLabels = value
    .map((v) => {
      const opt = options.find((o) => getOptionValue(o) === v);
      return opt ? getOptionLabel(opt) : null;
    })
    .filter(Boolean);

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={ref}>
      <label className="text-xs font-semibold uppercase tracking-widest text-text-sub">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm bg-input-bg text-text-primary outline-none
          hover:border-slate-300 focus:ring-2 focus:ring-accent-glow focus:border-accent-glow
          flex items-center justify-between gap-2 transition-all duration-150"
      >
        <div className="flex flex-wrap gap-1 min-h-[20px]">
          {selectedLabels.length === 0 ? (
            <span className="text-slate-400">Select {label}…</span>
          ) : selectedLabels.length === options.length && showSelectAll ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium">
              All
            </span>
          ) : (
            selectedLabels.map((lbl) => (
              <span
                key={lbl}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent-dim text-accent text-xs font-medium"
              >
                {lbl}
              </span>
            ))
          )}
        </div>
        <MdKeyboardArrowDown
          size={18}
          className={`text-slate-400 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-input-bg border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
            {showSelectAll && (
              <button
                type="button"
                onClick={toggleAll}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                  ${value.length === options.length ? "bg-accent border-accent" : "border-slate-300"}`}
                >
                  {value.length === options.length && (
                    <MdCheck size={12} className="text-white" />
                  )}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  Select All
                </span>
              </button>
            )}
            {options.map((opt) => {
              const val = getOptionValue(opt);
              const checked = value.includes(val);
              return (
                <button
                  type="button"
                  key={val}
                  onClick={() => toggle(val)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent-dim transition-colors text-left"
                >
                  <span
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    ${checked ? "bg-accent border-accent" : "border-slate-300"}`}
                  >
                    {checked && <MdCheck size={12} className="text-white" />}
                  </span>
                  <span className="text-sm text-text-sub">
                    {getOptionLabel(opt)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
