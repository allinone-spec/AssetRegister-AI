import { useState } from "react";
import { Spark, STATUS_META, StatusPill, TYPE_ICONS } from "./utils";
import { ResizableDrawer } from "./ResizableDrawer";

export function ImportStatusDrawer({
  job,
  D,
  accent,
  aDim,
  rgb,
  isDark,
  onClose,
  showNotif,
  open,
  deleteActionHandler,
}) {
  const [tab, setTab] = useState("info");
  const m = STATUS_META["success"];

  return (
    <ResizableDrawer
      open={open}
      onClose={onClose}
      title="Job Detail"
      defaultWidth="320px"
      minWidth={280}
      maxWidth="480px"
      showCloseButton={false}
    >
      {/* Hero */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: aDim,
          border: `1px solid rgba(${rgb},0.1)`,
        }}
      >
        <div className="flex items-center mb-3 gap-2">
          <div
            className="w-9 h-38 rounded-lg flex items-center justify-center text-lg"
            style={{
              background: D.surface,
              border: `1px solid ${D.border}`,
            }}
          >
            {TYPE_ICONS[job.type] || "📦"}
          </div>
          <StatusPill status={job.status || "Success"} />
        </div>
        <div className="text-lg font-extrabold mb-1" style={{ color: D.text }}>
          {job.jobName}
        </div>
        <div className="text-xs" style={{ color: D.faint }}>
          {job.id}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-lg p-1 gap-1 mb-3"
        style={{ background: D.inputBg }}
      >
        {["info", "history", "config"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-[6px] rounded-lg border-none text-xs font-bold cursor-pointer capitalize"
            style={{
              background: tab === t ? accent : "transparent",
              color: tab === t ? "#fff" : D.faint,
              transition: "all .15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <>
          {/* Spark */}
          <div
            className="rounded-lg py-3 px-4 mb-3"
            style={{
              background: D.card,
              border: `1px solid ${D.border}`,
            }}
          >
            <div
              className="text-xs font-bold uppercase mb-2"
              style={{
                color: D.faint,
                letterSpacing: "1px",
              }}
            >
              7-day trend
            </div>
            <Spark
              data={[60, 72, 68, 80, 75, 90, 88]}
              color={m.fg}
              w={260}
              h={44}
            />
            <div
              className="flex justify-between mt-1 text-xs"
              style={{ color: D.faint }}
            >
              <span>7d ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              ["Assets", job.assets > 0 ? job.assets.toLocaleString() : "—"],
              ["Duration", job.duration],
              ["Type", job.jobType],
              ["Last Run", job.lastExecutionDate],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg py-3 px-3"
                style={{
                  background: D.inputBg,
                  border: `1px solid ${D.border}`,
                }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.8px] mb-1"
                  style={{ color: D.faint }}
                >
                  {k}
                </div>
                <div
                  className={`text-[13.5px] font-bold ${k !== "Type" ? "font-mono" : ""}`}
                  style={{ color: D.text }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px]"
              style={{ background: D.inputBg, border: `1px solid ${D.border}` }}
            >
              <div
                className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                  i === 2 ? "bg-red-600" : "bg-emerald-600"
                }`}
              />
              <div className="flex-1">
                <div
                  className="text-xs font-semibold"
                  style={{ color: D.text }}
                >
                  Run #{String(5 - i).padStart(3, "0")}
                </div>
                <div
                  className="text-[10.5px] font-mono mt-0.5"
                  style={{ color: D.faint }}
                >
                  2025-02-{27 - i}
                </div>
              </div>
              <StatusPill status={i === 2 ? "Failed" : "Success"} />
            </div>
          ))}
        </div>
      )}

      {tab === "config" && (
        <div className="flex flex-col gap-[9px]">
          {[
            ["Schedule", "Every 6 hours"],
            ["Timeout", "30 minutes"],
            ["Retry attempts", "3"],
            ["Notification", "admin@company.com"],
            ["Last modified", "2025-02-20"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-[9px] px-3 py-[11px]"
              style={{ background: D.inputBg, border: `1px solid ${D.border}` }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-[0.8px] mb-[3px]"
                style={{ color: D.faint }}
              >
                {k}
              </div>
              <div
                className="text-[13px] font-semibold"
                style={{ color: D.text }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={() => showNotif(`Running ${job.name}…`)}
          className="py-2.5 rounded-[10px] text-white text-[13.5px] font-bold cursor-pointer border-none"
          style={{
            background: `linear-gradient(135deg,${accent},${accent}cc)`,
            boxShadow: `0 4px 14px rgba(${rgb},0.3)`,
          }}
        >
          ▶ Run Job Now
        </button>
        <button
          onClick={() => setEditJob(true)}
          className="py-2.5 rounded-[10px] bg-transparent text-[13.5px] font-semibold cursor-pointer"
          style={{ border: `1.5px solid ${D.border}`, color: D.sub }}
        >
          ✎ Edit Configuration
        </button>
        <button
          onClick={() => deleteActionHandler && deleteActionHandler(job.id)}
          className="py-2.5 rounded-[10px] bg-transparent border-[1.5px] border-red-100 text-red-600 text-[13.5px] font-semibold cursor-pointer"
        >
          ✕ Delete Job
        </button>
      </div>
    </ResizableDrawer>
  );
}
