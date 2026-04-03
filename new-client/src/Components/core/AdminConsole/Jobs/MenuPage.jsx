import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { useEffect } from "react";

const menuItems = [
  {
    title: "Active Directory",
    path: "/admin-console/add-jobs/active-directory",
    type: "active-directory",
    icon: "🏢",
    description: "Import users and devices from Active Directory",
  },
  {
    title: "AWS EC2",
    path: "/admin-console/add-jobs/aws-vm",
    type: "aws-vm",
    icon: "☁️",
    description: "Connect to Amazon Web Services EC2 instances",
  },
  {
    title: "Azure",
    path: "/admin-console/add-jobs/azure",
    type: "azure",
    icon: "🌐",
    description: "Import data from Microsoft Azure services",
  },
  {
    title: "Flat File",
    path: "/admin-console/add-jobs/flat-file-csv",
    type: "flat-file-csv",
    icon: "📄",
    description: "Import data from CSV, Excel and other files",
  },
  {
    title: "FlexeraOne",
    path: "/admin-console/add-jobs/flexera",
    type: "flexera",
    icon: "⚡",
    description: "Connect to FlexeraOne platform",
  },
  {
    title: "Google Cloud",
    path: "/admin-console/add-jobs/google-cloud",
    type: "google-cloud",
    icon: "🌥️",
    description: "Import resources from Google Cloud Platform",
  },
  {
    title: "Intune",
    path: "/admin-console/add-jobs/itune",
    type: "itune",
    icon: "📱",
    description: "Microsoft Intune mobile device management",
  },
  {
    title: "Microsoft Defender",
    path: "/admin-console/add-jobs/ms-defender",
    type: "ms-defender",
    icon: "🛡️",
    description: "Import security data from Microsoft Defender",
  },
  {
    title: "ServiceNow",
    path: "/admin-console/add-jobs/service-now",
    type: "service-now",
    icon: "🔧",
    description: "Connect to ServiceNow platform",
  },
  {
    title: "Database SQL/MySQL",
    path: "/admin-console/add-jobs/sql",
    type: "sql",
    icon: "🗄️",
    description: "Connect to SQL databases and run custom queries",
  },
  {
    title: "Custom API",
    path: "/admin-console/add-jobs/custom-api",
    type: "custom-api",
    icon: "🔌",
    description: "Connect to any REST API endpoint",
  },
];

const ApplicationMenu = ({ routeName, onJobTypeSelect }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { permissionType, permissionList } = useSelector(
    (state) => state.permission,
  );

  const handleItemClick = (item) => {
    if (onJobTypeSelect) {
      // When used in drawer, call the callback
      onJobTypeSelect(item.type);
    } else {
      // When used normally, navigate
      navigate(item.path);
    }
  };

  useEffect(() => {
    if (!onJobTypeSelect) {
      dispatch(setHeadingTitle("Add Job"));
    }
  }, [onJobTypeSelect]);

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleItemClick(item)}
            className="group flex w-full rounded-2xl p-4 items-center transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
              style={{
                backgroundColor: "var(--input-bg)",
                border: "1px solid var(--border)",
              }}
            >
              {item.icon}
            </div>
            <div className="flex-1 ml-4 text-left">
              <h3
                className="font-semibold text-base leading-tight mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {item.title}
              </h3>
              <p
                className="text-sm leading-tight"
                style={{ color: "var(--text-sub)" }}
              >
                {item.description}
              </p>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2"
              style={{
                backgroundColor: "var(--accent)",
                color: "white",
              }}
            >
              →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ApplicationMenu;
