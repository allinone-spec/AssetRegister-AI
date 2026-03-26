const PageLayout = ({ children, className = "" }) => {
  // Destructuring the props here
  return (
    <div
      className={`bg-white rounded-lg overflow-y-auto h-[100%] ${className}`}
      // style={{ scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
};

export default PageLayout;
