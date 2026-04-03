const PageLayout = ({ children, className = "" }) => {
  // Destructuring the props here
  return (
    <div
      className={`rounded-lg overflow-y-auto h-[100%] overflow-x-hidden ${className}`}
      // style={{ scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
};

export default PageLayout;
