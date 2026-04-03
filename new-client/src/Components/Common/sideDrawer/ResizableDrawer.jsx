import { Resizable } from "re-resizable";
import { useState } from "react";
import { Maximize2, Minimize2, ExternalLink } from "lucide-react";

/* ─── Drag Handle Component ────────────────────────────────────────────── */
const DragHandle = () => (
  <div
    className="
      absolute left-0 top-0 h-full w-[12px]
      flex items-center justify-center
      cursor-col-resize z-10
      transition-all duration-200
      hover:bg-accent-muted
      group
    "
    title="Drag to resize"
  >
    {/* Vertical grip dots - subtle but always visible */}
    <div className="flex flex-col items-center gap-[3px] pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="
            w-[2px] h-[2px] rounded-full
            bg-border 
            bg-accent opacity-100
            
            transition-all duration-200
          "
        />
      ))}
    </div>
  </div>
);

/* ─── Reusable Resizable Drawer ────────────────────────────────────────── */
export function ResizableDrawer({
  open,
  onClose,
  children,
  title = "Detail",
  defaultWidth = "50%",
  minWidth = 280,
  maxWidth = "80%",
  className = "",
  showCloseButton = true,
  onNewTab,
  Maximize = false,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!open) return <div style={{ width: 0 }} />;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-surface overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <span className="text-xs font-bold text-text-sub uppercase tracking-wide">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {onNewTab && (
              <button
                onClick={onNewTab}
                className="w-7 h-7 rounded-lg border border-border-theme bg-transparent cursor-pointer text-text-sub text-sm flex items-center justify-center transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent/5"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(false)}
              className="w-7 h-7 rounded-lg border border-border-theme bg-transparent cursor-pointer text-text-sub text-sm flex items-center justify-center transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent/5"
              title="Exit fullscreen"
            >
              <Minimize2 size={14} />
            </button>
            {showCloseButton && (
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  onClose();
                }}
                className="w-7 h-7 rounded-lg border border-border-theme bg-transparent cursor-pointer text-text-sub text-sm flex items-center justify-center transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent/5"
                title="Close drawer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {/* Content */}
        <div className="px-5 pb-5">{children}</div>
      </div>
    );
  }

  return (
    <Resizable
      defaultSize={{ width: defaultWidth, height: "92vh" }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      enable={{ left: true }}
      handleComponent={{ left: <DragHandle /> }}
      handleStyles={{ left: { left: 0, width: 12, cursor: "col-resize" } }}
      className={`
        relative ml-2 flex-shrink-0
        bg-surface border-l border-accent-muted
        h-[92vh] overflow-y-auto no-scrollbar
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-4">
        <span className="text-xs font-bold text-text-sub uppercase tracking-wide">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {onNewTab && (
            <button
              onClick={onNewTab}
              className="w-7 h-7 rounded-lg border border-border-theme bg-transparent cursor-pointer text-text-sub text-sm flex items-center justify-center transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent/5"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </button>
          )}
          {Maximize && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="w-7 h-7 rounded-lg border border-border-theme bg-transparent cursor-pointer text-text-sub text-sm flex items-center justify-center transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent/5"
              title="Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          )}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg border border-border-theme bg-transparent cursor-pointer text-text-sub text-sm flex items-center justify-center transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent/5"
              title="Close drawer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5">{children}</div>
    </Resizable>
  );
}
