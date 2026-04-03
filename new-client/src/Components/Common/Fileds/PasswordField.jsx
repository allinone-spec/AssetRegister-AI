import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const PasswordField = ({
  label,
  required,
  value,
  onChange,
  name,
  visible,
  onToggle,
  disabled = false,
  className = "",
  helperText,
  error = false,
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-xs font-semibold uppercase tracking-widest text-text-sub">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border-theme text-sm bg-input-bg text-text-primary outline-none transition-all duration-150
          hover:border-accent focus:ring-2 focus:ring-accent-glow focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {visible ? (
          <AiOutlineEyeInvisible size={18} />
        ) : (
          <AiOutlineEye size={18} />
        )}
      </button>
    </div>
    {helperText && (
      <span
        className={`text-xs ${error ? "text-rose-500" : "text-text-faint"}`}
      >
        {helperText}
      </span>
    )}
  </div>
);

export default PasswordField;
