import sidebarData from "../../Data/FileExplorerData";
import { Link } from "react-router-dom";

export default function MobileSidebar({ mobileOpen, setMobileOpen }) {
  if (!mobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden animate-slideIn">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <div className="relative w-64 h-full shadow-lg p-4 bg-nav-bg">
        <h3 className="font-bold mb-4 text-accent">Menu</h3>

        {sidebarData.map((item, i) => (
          <Link
            key={i}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-text"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
