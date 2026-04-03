import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getCommonRegisterRequest } from "../Service/Console.service";
import { getRequest } from "../Service/admin.save";
import { getRequest as getRequestData } from "../Service/api.service";

export const getFullName = (user) => {
  const { firstName, middleName, lastName } = user;
  // return [firstName, middleName, lastName].filter(Boolean).join(" ");
  return [firstName, middleName, lastName]
    .filter(
      (name) =>
        name && name !== "null" && name !== "undefined" && name !== "string"
    )
    .join(" ");
};

export const groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] ??= []).push(x);
    return rv;
  }, {});
};

export const options = ["PDF", "CSV", "Excel"];

export const exportToExcel = (pathname, data) => {
  const fileName = pathname.split("/");
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Files");
  XLSX.writeFile(workbook, `${fileName[fileName.length - 1]}.xlsx`);
};

export const exportToPDF = (pathname, data) => {
  const fileName = pathname.split("/");
  const doc = new jsPDF();
  const keys = Object.keys(data[0] || {});
  const headers = [keys];
  const body = data?.map((item) =>
    keys.map((key) => {
      let value = item[key];
      if (typeof value === "string" && value.length > 200) {
        value = value.substring(0, 200) + "...";
      }
      return value;
    })
  );

  doc.autoTable({ head: headers, body: body, startY: 10 });
  doc.save(`${fileName[fileName.length - 1]}.pdf`);
};

export const exportToCSV = (pathname, data) => {
  const fileName = pathname.split("/");

  // Function to escape CSV values
  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) {
      return "";
    }

    let stringValue = String(value);

    // Replace newlines with spaces (or you could use " | " or another delimiter)
    stringValue = stringValue.replace(/\r?\n/g, " ").replace(/\r/g, " ");

    // If the value contains comma or double quote, wrap it in double quotes
    if (stringValue.includes(",") || stringValue.includes('"')) {
      // Escape any existing double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const csvContent = [
    // Header row
    Object.keys(data[0] || {})
      .map(escapeCSVValue)
      .join(","),
    // Data rows
    ...data?.map((row) => Object.values(row).map(escapeCSVValue).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `${fileName[fileName.length - 1]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const isEqual = (a, b) => {
  if (a === b) return true; // Strict equality check

  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false; // Not objects or null
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false; // Different number of keys

  for (let i = 0; i < keysA.length; i++) {
    if (!b.hasOwnProperty(keysA[i]) || !isEqual(a[keysA[i]], b[keysA[i]])) {
      return false; // Key not in B or values not equal
    }
  }

  return true;
};

export const getUniqueColumnValueList = async (
  pathname,
  columnId,
  selectedObject,
  tableDataSource,
  jobName
) => {
  switch (pathname) {
    case "/data-console/register":
    case "/data-console/register/detailed":
      const registerRes = await getCommonRegisterRequest(
        `/AssetRegister/${columnId}/columnValues/${selectedObject}/tableName/getUniqueColumnValues`
      );
      return [...new Set(registerRes.data.filter((v) => v))] || [];

    case pathname.includes("/data-console/reports/original-source/jobs")
      ? pathname
      : false:
    case pathname.includes("/data-console/reports/by-ar-resource/jobs")
      ? pathname
      : false:
      const jobsRes = await getRequest(
        `/table/${columnId}/columnValues/${tableDataSource}/datasource/${jobName}/getUniqueColumnValues`
      );
      return [...new Set(jobsRes.data.filter((v) => v))] || [];

    case "/admin-console/import-status":
      const importRes = await getRequest(
        `/jobSchedule/${columnId}/columnValues/getUniqueColumnValues`
      );
      return [...new Set(importRes.data.filter((v) => v))] || [];

    case "/admin-console/saved-jobs":
    case "/admin-console/ar-mapping":
    case "/admin-console/ar-rules":
      const statusRes = await getRequest(
        `/Status/${columnId}/columnValues/getUniqueColumnValues`
      );
      return [...new Set(statusRes.data.filter((v) => v))] || [];

    case pathname.includes("/data-console/reports/folder-list-filter")
      ? pathname
      : false:
      const viewRes = await getRequestData(
        `/view/${columnId}/columnValues/getUniqueColumnValues`
      );
      return [...new Set(viewRes.data.filter((v) => v))] || [];

    default:
      // uniqueValues = [
      //   ...new Set(
      //     sourceData.map((row) => String(row[columnId])).filter(Boolean)
      //   ),
      // ].sort();
      break;
  }
};
