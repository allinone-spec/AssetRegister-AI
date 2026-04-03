import { Logs } from "lucide-react";
import { FaCogs } from "react-icons/fa";
import { FaMapMarkedAlt } from "react-icons/fa";
import { GrResources } from "react-icons/gr";
import { IoMdAdd } from "react-icons/io";
import { MdLabelImportant } from "react-icons/md";
import { TbFilterShare } from "react-icons/tb";
const adminConsoleSidebarData = [
  {
    title: "Import Status",
    icon: <MdLabelImportant className="text-lg" />,
    path: "/admin-console/import-status",
    isSearchBar: false,
  },
  {
    title: "Saved Jobs",
    icon: <GrResources className="text-lg" />,
    path: "/admin-console/saved-jobs",
    isSearchBar: false,
  },
  {
    title: "AR Mapping",
    icon: <FaMapMarkedAlt className="text-lg" />,
    path: "/admin-console/ar-mapping",
    isSearchBar: false,
    // Links: [
    //     { title: "A R Table", path: "/admin-console/ar-mapping/table-data" },

    // ]
  },
  {
    title: "AR Rules",
    icon: <TbFilterShare className="text-lg" />,
    path: "/admin-console/ar-rules",
    isSearchBar: false,
  },
  {
    title: "Logs",
    icon: <Logs className="text-lg" />,
    path: "/admin-console/logs",
    isSearchBar: false,
  },

  {
    // title: "Add Jobs",
    icon: <IoMdAdd className="text-lg" />,
    path: "/admin-console/add-jobs",
    isSearchBar: true,
    Links: [
      {
        title: "Active Directory",
        path: "/admin-console/add-jobs/active-directory",
      },
      { title: "AWS EC2", path: "/admin-console/add-jobs/aws-vm" },
      { title: "Azure", path: "/admin-console/add-jobs/azure" },
      { title: "Flat File", path: "/admin-console/add-jobs/flat-file-csv" },
      { title: "FlexeraOne", path: "/admin-console/add-jobs/flexera" },
      { title: "Google Cloud", path: "/admin-console/add-jobs/google-cloud" },
      { title: "Intune", path: "/admin-console/add-jobs/itune" },
      {
        title: "Microsoft Defender",
        path: "/admin-console/add-jobs/ms-defender",
      },
      { title: "ServiceNow", path: "/admin-console/add-jobs/service-now" },
      { title: "Database SQL/MySQL", path: "/admin-console/add-jobs/sql" },
      { title: "Custom API", path: "/admin-console/add-jobs/custom-api" },
    ],
  },

  {
    title: "Settings",
    icon: <FaCogs className="text-lg" />,
    path: "/admin-console/settings",
    isSearchBar: false,
    Links: [
      {
        title: "SSO Configuration",
        path: "/admin-console/settings/sso/all-tables",
      },
      {
        title: "SMTP Configuration",
        path: "/admin-console/settings/smtp-configuration",
      },
      {
        title: "Scheduled Emails",
        path: "/admin-console/settings/scheduled-emails",
      },
      { title: "Object", path: "/admin-console/settings/object-configuration" },
      { title: "AI Prompts", path: "/admin-console/settings?tab=ai-prompts" },
      { title: "AI Model", path: "/admin-console/settings?tab=ai-model" },

      // { title: "Theme", path: "/admin-console/security/theme-selector" },
    ],
    button: { title: "Theme" },
  },
];

export default adminConsoleSidebarData;
