import React from 'react';
import { LogOut } from 'lucide-react';

const TopRightLogoutButton = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Logout"
      title="Logout"
      className="fixed top-4 right-4 md:top-6 md:right-6 z-40 w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#EF4444] hover:bg-[#DC2626] active:scale-95 text-white flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer border border-white/10"
      style={{
        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
      }}
    >
      <LogOut size={18} color="#FFFFFF" strokeWidth={2.2} className="md:w-5 md:h-5 ml-0.5" />
    </button>
  );
};

export default TopRightLogoutButton;
