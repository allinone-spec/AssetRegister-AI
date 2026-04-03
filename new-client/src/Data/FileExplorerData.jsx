import { FaCogs, FaShieldVirus } from "react-icons/fa";
import { IoStatsChartSharp } from "react-icons/io5";
import { BiSolidReport } from "react-icons/bi";
import { MdOutlineCreateNewFolder } from "react-icons/md";

const sidebarData = [
  {
    title: "Dashboard",
    icon: <IoStatsChartSharp className="text-lg" />,
    path: "/data-console/dashboard",
    Folder: true,
    Links: [
      {
        title: "Create New Dashboard",
        path: "/data-console/dashboard/new-create",
      },
      {
        id: "1",
        isFolder: true,
        name: "Root Folder",
        nav: "/data-console/dash-folder",
        Links: [
          {
            id: "1.1",
            isFolder: true,
            name: "Sub Folder 1",
            Links: [
              {
                id: "1.1.1",
                isFolder: true,
                name: "Nested Folder 1",
                Links: [],
              },
              {
                id: "1.1.2",
                isFolder: true,
                name: "Nested Folder 2",
                Links: [
                  {
                    id: "1.1.2.1",
                    isFolder: true,
                    name: "Deeply Nested Folder",
                    Links: [],
                  },
                ],
              },
            ],
          },
          {
            id: "1.2",
            isFolder: true,
            name: "Sub Folder 2",
            Links: [
              { isFolder: false, name: "File9.txt" },
              { isFolder: false, name: "File10.txt" },
            ],
          },
        ],
      },

      { title: "Create Folder", icon: <MdOutlineCreateNewFolder /> },
    ],
  },
  {
    title: "Reports",
    icon: <BiSolidReport className="text-lg" />,
    Folder: true,
    path: "/data-console/reports",
    Links: [
      {
        title: "Original Source",
        path: "/data-console/reports/original-source",
      },
      { title: "By AR Source", path: "/data-console/reports/by-ar-resource" },
      { title: "", path: "" },
      { title: "Create Folder", icon: <MdOutlineCreateNewFolder /> },
    ],
  },

  {
    title: "Register",
    icon: <FaShieldVirus className="text-lg" />,
    Folder: false,
    path: "/data-console/register",
    Links: [
      { title: "Summary", path: "/data-console/register/summary" },
      { title: "Detailed", path: "/data-console/register?tab=detailed" },
    ],
  },
  {
    title: "Settings",
    icon: <FaCogs className="text-lg" />,
    path: "/data-console/settings",
    Links: [
      {
        title: "SSO Configuration",
        path: "/data-console/settings/sso/all-tables",
      },
      {
        title: "SMTP Configuration",
        path: "/data-console/settings/smtp-configuration",
      },
      {
        title: "Scheduled Emails",
        path: "/data-console/settings/scheduled-emails",
      },
      { title: "Object", path: "/data-console/settings/object-configuration" },
      { title: "AI Prompts", path: "/data-console/settings?tab=ai-prompts" },
      { title: "AI Model", path: "/data-console/settings?tab=ai-model" },
    ],
    button: { title: "Theme" },
  },
  {
    title: "Security",
    icon: <FaShieldVirus className="text-lg" />,
    Folder: false,
    path: "/data-console/security",
    Links: [
      { title: "Users", path: "/data-console/security?section=users" },
      { title: "Groups", path: "/data-console/security?section=groups" },
      { title: "Roles", path: "/data-console/security?section=roles" },
      { title: "Permissions", path: "/data-console/security?section=permissions" },
    ],
  },
];

export default sidebarData;

export const fieldsArray = [
  "numberID",
  "R2_26bfb4732dd28d64f03f9ddd73a3d3ed_InstallationToLicense_SoftwareLicenseID",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_IsServer",
  "ApplicationVersion",
  "R2_2bb12b6c952cf7f17c96da3dd3571933_InstallationToAllocation_SoftwareLicenseAllocationID",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_ComputerID",
  "R2_26bfb4732dd28d64f03f9ddd73a3d3ed_InstallationToLicense_LicenseType",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_ModelNo",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_ComputerStatus",
  "InstalledSoftwareID",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_ProcessorType",
  "R3_fb2c62a03b85cf679eddf564fe550367_ComputerToVirtualMachine_HostName",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_ServiceProvider",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_NumberOfCores",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_ComputerType",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_ComputerRole",
  "ApplicationName",
  "R2_26bfb4732dd28d64f03f9ddd73a3d3ed_InstallationToLicense_PublisherName",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_OperatingSystem",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_LocatedInCloud",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_InventoryDate",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_NumberOfProcessors",
  "R2_26bfb4732dd28d64f03f9ddd73a3d3ed_InstallationToLicense_Name",
  "ApplicationPublisher",
  "R2_5132ea92c263fdba5ec93940f2e3862c_InstallationToComputer_InventorySourceType",
  "R3_fb2c62a03b85cf679eddf564fe550367_ComputerToVirtualMachine_ComplianceComputerID",
  "R2_51a71253efbabf8e3d6d91e83e042599_InstallationToApplication_ProductName",
  "R2_26bfb4732dd28d64f03f9ddd73a3d3ed_InstallationToLicense_ParentLicenseID",
  "ComputerName",
  "R2_51a71253efbabf8e3d6d91e83e042599_InstallationToApplication_ApplicationID",
  "R2_51a71253efbabf8e3d6d91e83e042599_InstallationToApplication_Classification",
  "R2_2bb12b6c952cf7f17c96da3dd3571933_InstallationToAllocation_ExemptionReason",
];
