import { Outlet } from "react-router";
import DummyNavbar from "../components/layout/DummyNavbar";
import DummySidebaar from "../components/layout/DummySidebaar";
import { useEffect, useState } from "react";
import NoInternetModal from "../components/global/NoInternet";
import { NoInternetImage } from "../assets/export";

const DashboardLayout = () => {
  const [openNoInternet, setOpenNoInternet] = useState(false);

  useEffect(() => {
    if (!navigator.onLine) {
      // Handle no internet connection
      setOpenNoInternet(true);
    }
  }, []);
  return (
    <div className="w-full h-screen flex flex-col justify-start items-start">
      <div className="w-full bg-[#1c1c1c] h-10 ">
        <DummyNavbar />
      </div>
      <img src={NoInternetImage} alt="" className="hidden" />
      <div className="w-full h-screen flex justify-start items-start">
        <div className="w-60 h-[calc(100%-2.5rem)] bg-gray-50 ">
          <DummySidebaar />
        </div>
        <div className="w-[calc(100%-15rem)] h-[calc(100%-2.5rem)] p-4 ">
          <NoInternetModal isOpen={openNoInternet} />
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
