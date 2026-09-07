import React from "react";
import { LogOut } from "lucide-react";

const TopRightLogoutButton = ({ onClick, className = "" }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Logout"
      title="Logout"
      className={`hidden lg:flex fixed top-6 right-6 z-40 w-11 h-11 rounded-full bg-[#EF4444] hover:bg-[#DC2626] active:scale-95 text-white items-center justify-center shadow-lg transition-all duration-200 cursor-pointer border border-white/10 ${className}`}
      style={{
        boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
      }}
    >
      <LogOut size={20} color="#FFFFFF" strokeWidth={2.2} className="ml-0.5" />
    </button>
  );
};

export default TopRightLogoutButton;
