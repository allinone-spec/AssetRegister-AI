export const userData = [
  {
    id: 1,
    name: "Scooby",
    email: "scooby123@gmail.com",
    mobile: "9897101340",
    role: "Admin",
  },
  {
    id: 2,
    name: "Rashmi",
    email: "rashmi123@gmail.com",
    mobile: "9898070670",
    role: "User",
  },
  {
    id: 3,
    name: "Aishwarya",
    email: "aishwarya123@gmail.com",
    mobile: "9697101340",
    role: "HR",
  },
  {
    id: 4,
    name: "Shaggy",
    email: "shaggy123@gmail.com",
    mobile: "9999901340",
    role: "User",
  },
  {
    id: 5,
    name: "Velma",
    email: "velma123@gmail.com",
    mobile: "9787601340",
    role: "HR",
  },
  {
    id: 6,
    name: "Fred",
    email: "fred123@gmail.com",
    mobile: "9117101340",
    role: "Admin",
  },
  {
    id: 7,
    name: "Daphne",
    email: "daphne123@gmail.com",
    mobile: "9447101340",
    role: "User",
  },
];

export const roleData = [
  { id: 1, role: "Admin" },
  { id: 2, role: "User" },
  { id: 3, role: "HR" },
  { id: 4, role: "Accountant" },
  { id: 5, role: "Manager" },
  { id: 6, role: "Developer" },
  { id: 7, role: "Tester" },
  { id: 8, role: "Designer" },
  { id: 9, role: "Support" },
  { id: 10, role: "Sales" },
  { id: 11, role: "Marketing" },
  { id: 12, role: "Intern" },
  { id: 13, role: "Trainee" },
  { id: 14, role: "Consultant" },
  { id: 15, role: "Analyst" },
  { id: 16, role: "Architect" },
  { id: 17, role: "Lead" },
  { id: 18, role: "Director" },
  { id: 19, role: "VP" },
  { id: 20, role: "CEO" },
];

export const permissionTypeData = [
  { id: 1, type: "ViewOnly", permissions: ["view"] },
  { id: 2, type: "ReadOnlyDC", permissions: ["view", "read"] },
  { id: 3, type: "ReadOnlyAC", permissions: ["view", "read"] },
  { id: 4, type: "AdminDC", permissions: ["view", "read", "write", "delete"] },
  { id: 5, type: "AdminAC", permissions: ["view", "read", "write", "delete"] },
  { id: 6, type: "Custom", permissions: [] },
];

export const groupsData = [
  { id: 1, name: "Scooby", email: "scooby123@gmail.com", mobile: "9897101340" },
  { id: 2, name: "Rashmi", email: "rashmi123@gmail.com", mobile: "9898070670" },
  {
    id: 3,
    name: "Aishwarya",
    email: "aishwarya123@gmail.com",
    mobile: "9697101340",
  },
  { id: 4, name: "Shaggy", email: "shaggy123@gmail.com", mobile: "9999901340" },
  { id: 5, name: "Velma", email: "velma123@gmail.com", mobile: "9787601340" },
  { id: 6, name: "Fred", email: "fred123@gmail.com", mobile: "9117101340" },
  { id: 7, name: "Daphne", email: "daphne123@gmail.com", mobile: "9447101340" },
];

export const filterKey = {
  REGISTER: "Register",
  SUMMARY: "summary",
  IMPORTSTATUS: "importStatus",
  REPORT: "report",
  SAVEDJOBS: "savedJobs",
  ARMAPPING: "ARMapping",
  ARRULES: "ARRules",
  FOLDERLISTVIEW: "view",
};

export const tableNameEnum = {
  SAVEDJOBS: "JobSchedule",
  IMPORTSTATUS: "ImportStatus",
  USER: "Users",
  GROUP: "Groups",
  ROLE: "Role",
  PERMISSION: "PermissionGroup",
  OBJECT: "ObjectEntity",
};

export const scheduleTypeEnum = {
  EMAIL: "email",
  JOB: "job",
  ASSETREGISTER: "AssetRegister",
};
