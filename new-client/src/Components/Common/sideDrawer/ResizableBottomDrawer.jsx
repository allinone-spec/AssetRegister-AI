import { useEffect, useState } from "react";
import { Resizable } from "re-resizable";
/* ─── Top Drag Handle (horizontal grip) ────────────────────────────────── */
const TopDragHandle = () => (
  <div
    className="
      w-full h-[10px]
      flex items-center justify-center
      cursor-row-resize
      transition-all duration-200
      hover:bg-accent-muted
    "
    title="Drag to resize"
  >
    <div className="flex gap-[3px] pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="w-[2px] h-[2px] rounded-full bg-border bg-accent opacity-100 transition-all duration-200"
        />
      ))}
    </div>
  </div>
);

/* ─── Reusable Resizable Bottom Drawer ─────────────────────────────────── */
export function ResizableBottomDrawer({
  open,
  onClose,
  children,
  title = "Detail",
  defaultHeight = 350,
  minHeight = 150,
  maxHeight = 600,
  className = "",
  showCloseButton = true,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div
        className={`
          transform transition-transform duration-300 ease-out
          ${visible ? "translate-y-0" : "translate-y-full"}
        `}
      >
        <Resizable
          defaultSize={{ width: "100%", height: defaultHeight }}
          minHeight={minHeight}
          maxHeight={maxHeight}
          enable={{ top: true }}
          handleComponent={{ top: <TopDragHandle /> }}
          handleStyles={{ top: { top: 0, height: 10, cursor: "row-resize" } }}
          className={`
            w-full border-t border-accent-muted
            bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
            overflow-hidden
            ${className}
          `}
          style={{ width: "100%" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-border">
            <span className="text-xs font-bold text-text-sub uppercase tracking-wide">
              {title}
            </span>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  w-7 h-7 rounded-lg border border-border-theme
                  bg-transparent cursor-pointer text-text-sub
                  text-sm flex items-center justify-center
                  transition-all duration-150
                  hover:border-accent hover:text-accent hover:bg-accent/5
                "
                title="Close"
              >
                ✕
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-auto h-[calc(100%-44px)] px-5 pb-5">
            {children}
          </div>
        </Resizable>
      </div>
    </div>
  );
}
