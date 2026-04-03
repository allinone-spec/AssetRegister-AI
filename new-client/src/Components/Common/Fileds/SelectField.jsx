import { MdKeyboardArrowDown } from "react-icons/md";

const SelectField = ({
  label,
  required,
  value,
  onChange,
  name,
  disabled,
  children,
  className,
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-xs font-semibold uppercase tracking-widest text-text-sub">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg border border-[var(--border)] text-sm bg-input-bg text-text-primary outline-none transition-all duration-150
          hover:border-slate-300 focus:ring-2 focus:ring-accent-glow focus:border-accent-glow
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        {children}
      </select>
      <MdKeyboardArrowDown
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        size={18}
      />
    </div>
  </div>
);

export default SelectField;
