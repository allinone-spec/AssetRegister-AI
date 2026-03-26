const PageLayout = ({ children, className = "", style }) => {
  return (
    <div className={`bg-white rounded-lg overflow-y-auto h-[100%] ${className}`} style={style}>
      {children}
    </div>
  );
};

export default PageLayout;
