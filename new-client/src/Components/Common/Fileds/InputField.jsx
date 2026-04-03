const InputField = ({
  label,
  required,
  error,
  helperText,
  className = "",
  ...props
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-xs font-semibold uppercase tracking-widest text-text-sub">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-input-bg text-text-primary outline-none transition-all duration-150 border-[var(--border)]
        focus:ring-2 focus:ring-accent-glow focus:border-accent-glow        
        disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
    />
    {helperText && (
      <span className={`text-xs ${error ? "text-rose-500" : "text-slate-400"}`}>
        {helperText}
      </span>
    )}
  </div>
);

export default InputField;
