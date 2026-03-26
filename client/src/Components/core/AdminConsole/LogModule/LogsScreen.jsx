import { useEffect, useState } from "react";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { getAdminRequest } from "../../../../Service/admin.save";

const API_OPTIONS = [
  "admin",
  "data",
  "scheduler",
  "login",

  // Admin Console ->
  // "Import Status",
  // "Saved Jobs",
  // "Register",
  // "Job Forms",
  // "AR Mapping",
  // "AR Rule",
  // "Schedule job",
  // "schedule merge",

  // // Data Console ->
  // "dashboard",
  // "reports",
  // "users",
  // "folders",
  // "security session",
  // "SSO configuration",
  // "SMTP configuration",
  // "object creation",
  // "theme",
];

export default function LogsScreen() {
  const dispatch = useDispatch();
  const [api, setApi] = useState(API_OPTIONS[0]);
  const [date, setDate] = useState(""); // empty means today's logs per requirement
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(setHeadingTitle("Logs"));
  }, []);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const query = `api=${encodeURIComponent(api)}${
        date ? `&date=${encodeURIComponent(date)}` : ""
      }`;

      // Request as blob so we can download files
      const response = await getAdminRequest(`/api/admin/logs/download?${query}`, {
        responseType: "blob",
      });

      const disposition =
        response.headers["content-disposition"] ||
        response.headers["Content-Disposition"];
      let filename = `${api}_${date || "today"}.log`;
      if (disposition) {
        const match =
          disposition.match(/filename\*=UTF-8''([^;\n]+)/) ||
          disposition.match(/filename="?([^;\n"]+)"?/);
        if (match) filename = decodeURIComponent(match[1]);
      }

      const blob = new Blob([response.data], {
        type: response.data?.type || "application/octet-stream",
      });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
      toast.success("Download started");
    } catch (err) {
      console.error("Log download error:", err);
      // Try to parse JSON/text error if server returned it inside a blob or plain body
      try {
        const respData = err?.response?.data;
        let text = null;
        if (respData instanceof Blob) {
          text = await respData.text();
        } else if (respData) {
          text =
            typeof respData === "string" ? respData : JSON.stringify(respData);
        }
        const json = text ? JSON.parse(text) : null;
        if (json?.message) toast.error(json.message);
        else if (text) toast.error(text);
        else toast.error("Failed to download logs");
      } catch (_) {
        toast.error("Failed to download logs");
      }
    } finally {
      setLoading(false);
    }
  };
  const filenamePreview = `${api}_${date || "today"}.log`;

  function Spinner() {
    return (
      <svg
        className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
    );
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 min-h-[calc(90vh-140px)]">
        <div className="max-w-5xl w-full bg-white shadow-md rounded-lg border border-gray-200 min-h-[50vh] flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Download Logs
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Select the API and date to download the corresponding log file.
            </p>
          </div>

          <div className="px-6 py-6 flex-1 overflow-auto">
            <div className="text-[12px] text-gray-500">
              Select <span className="font-bold">admin</span> option to download
              logs for{" "}
              <span className="italic">
                Import Status, Saved Jobs, Register, Job Forms, AR Mapping, AR
                Rule, Schedule job and Schedule merge
              </span>
            </div>
            <div className="text-[12px] mb-4 text-gray-500">
              Select <span className="font-bold">data</span> option to download
              logs for{" "}
              <span className="italic">
                Dashboard, Reports, Users, Folders, Security session, SSO
                configuration, SMTP configuration, Object creation and Theme
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700">
                  API
                </label>
                <select
                  value={api}
                  onChange={(e) => setApi(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-slate-100 shadow-sm text-sm px-2 h-[38px]"
                >
                  {API_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date (optional)
                </label>
                <input
                  type="date"
                  value={date}
                  min={(() => {
                    const date = new Date();
                    date.setDate(date.getDate() - 14);
                    return date.toISOString().split("T")[0];
                  })()}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-slate-100 shadow-sm py-2 px-3 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  limit selection to the last 15 days
                </p>
              </div>
            </div>

            {/* <div className="mt-6 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-600">File preview:</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-50 text-sm text-gray-700 border border-gray-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-500 dark:text-gray-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 2a2 2 0 00-2 2v2H5a3 3 0 00-3 3v4a3 3 0 003 3h10a3 3 0 003-3v-4a3 3 0 00-3-3h-1V4a2 2 0 00-2-2H8zm2 7a1 1 0 012 0v3a1 1 0 11-2 0V9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-mono">{filenamePreview}</span>
              </div>
            </div> */}
          </div>
          <div className="m-5">
            <button
              onClick={handleDownload}
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50`}
            >
              {loading && <Spinner />}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M3 3a1 1 0 011-1h4a1 1 0 110 2H6v12h8V4h-2a1 1 0 110-2h4a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" />
                <path d="M9 7a1 1 0 012 0v4.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 11.586V7z" />
              </svg>
              <span>{loading ? "Downloading" : "Download"}</span>
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
