export function TextInput({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  accent,
  D,
  focus,
  onFocus,
  onBlur,
  rightSlot,
}) {
  return (
    <div>
      <label
        htmlFor={label}
        className="block text-xs font-bold uppercase mb-2"
        style={{ color: D.sub }}
      >
        {label}
      </label>

      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg border transition"
        style={{
          background: D.inputBg,
          borderColor: focus ? accent : D.border,
          boxShadow: focus ? `0 0 0 3px ${accent}1A` : "none",
        }}
      >
        <span>{icon}</span>
        <input
          id={label}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: D.text }}
        />
        {rightSlot}
      </div>
    </div>
  );
}
