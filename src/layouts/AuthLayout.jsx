import React from "react";
import { Outlet } from "react-router";

const AuthLayout = () => {
  return (
    <div className="w-screen min-h-screen  flex justify-center items-center auth_bg p-3 md:py-8">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
