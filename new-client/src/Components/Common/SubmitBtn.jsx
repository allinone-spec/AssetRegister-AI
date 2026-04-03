const SubmitBtn = ({
  text = "Submit",
  isLoading = false,
  onClick,
  className = "",
  type = "submit",
  disabled = false,
}) => {
  return (
    <button
      className={`w-full py-2 text-white rounded-md ${className} ${disabled ? "bg-accent-glow" : "bg-accent"}`}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : (
        text
      )}
    </button>
  );
};

export default SubmitBtn;
