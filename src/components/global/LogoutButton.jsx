import React from "react";

/**
 * Reusable Logout Button for onboarding screens and forms.
 * Follows the exact size and design structure of the "Next" button,
 * styled exclusively with Tailwind CSS utility classes.
 */
const LogoutButton = ({
  onClick,
  className = "",
  label = "Log Out",
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full lg:hidden py-2.5 md:py-3 mb-4 rounded-xl font-poppins font-semibold text-sm capitalize transition-colors duration-200 cursor-pointer bg-red-500 hover:bg-red-600 text-white active:scale-[0.99] ${className}`}
    >
      {label}
    </button>
  );
};

export default LogoutButton;
