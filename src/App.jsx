import React, { useEffect } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import "./App.css";
import DashboardLayout from "./layouts/DashboardLayout";
import DummyHome from "./pages/app/DummyHome";
import DummyLogin from "./pages/authentication/DummyLogin";
import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/authentication/Login";
import Signup from "./pages/authentication/Signup";
import LicenseInformation from "./pages/authentication/LicenseInformation";
import VehicleDetails from "./pages/authentication/VehicleDetails";
import InsuranceInformation from "./pages/authentication/InsuranceInformation";
import AddVehicleDetails from "./pages/authentication/AddVehicleDetails";
import VerifiedAccount from "./pages/authentication/VerifiedAccount";
import Subscription from "./pages/authentication/Subscription";
import Verification from "./pages/authentication/Verification";
import ShareTracking from "./pages/tracking/ShareTracking";
import RideNotFound from "./pages/tracking/RideNotFound";
import RideEnded from "./pages/tracking/RideEnded";
import RideCancelled from "./pages/tracking/RideCancelled";
import Paymentsuccessfully from "./pages/authentication/Completesetup";
import Completedetup from "./pages/authentication/Completesetup";
import NotFound from "./pages/NotFound";
import { getAccountStatus, hydrateAuthFromCookies } from "./redux/slices/auth.slice";

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAccountStatusInitialized, accountStatus } = useSelector((state) => state.auth);
  const token = Cookies.get("token");

  // Initial load: Hydrate auth and fetch account status ONCE on application start / reload
  useEffect(() => {
    dispatch(hydrateAuthFromCookies());
    const authToken = Cookies.get("token");
    if (authToken) {
      dispatch(getAccountStatus());
    }
  }, [dispatch]);

  // Scoped background polling: ONLY active on /subscription and /verified-account, and ONLY if NOT approved
  useEffect(() => {
    const authToken = Cookies.get("token");
    const isPollingRoute =
      location.pathname === "/subscription" ||
      location.pathname === "/verified-account";

    if (authToken && isPollingRoute && accountStatus !== "approved") {
      const intervalId = setInterval(() => {
        dispatch(getAccountStatus());
      }, 10000);
      return () => clearInterval(intervalId);
    }
  }, [dispatch, location.pathname, accountStatus]);

  // Show full-screen loading spinner on initial load when token exists until status resolves
  if (token && !isAccountStatusInitialized) {
    return (
      <div className="relative w-full min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div
            className="absolute inset-0 border-4 rounded-full animate-spin"
            style={{
              borderColor: "#61CB08",
              borderTopColor: "transparent",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Login />}
      />

      {/* STEP 1 */}
      <Route
        path="signup"
        element={<Signup />}
      />

      {/* STEP 2 */}
      <Route
        path="license-information"
        element={<LicenseInformation />}
      />

      {/* STEP 3 */}
      <Route
        path="vehicle-details"
        element={<VehicleDetails />}
      />

      {/* STEP 4 */}
      <Route
        path="insurance-information"  
        element={<InsuranceInformation />}
      />

      {/* STEP 5 */}
      <Route
        path="add-vehicle-details"
        element={<AddVehicleDetails />}
      />

{/* STEP 6 */}
      <Route
        path="verified-account"
        element={<VerifiedAccount />}
      />

 {/* STEP 7 */}
      <Route
        path="subscription"
        element={<Subscription />}
      />

      <Route
        path="verification"
        element={<Verification />}
      />


      <Route path="share" element={<ShareTracking />} />
      {/* Test: http://localhost:5173/share/demo-carpool */}
      <Route
        path="share/demo-carpool"
        element={
          <Navigate
            replace
            to="/share?carpool=NjljZjkzYmJmYmNhYzI0YzAwZjMxZGMz&passengerId=NjljZjkzYmJmYmNhYzI0YzAwZjMxZGMz"
          />
        }
      />
      <Route path="ride-not-found" element={<RideNotFound />} />
      <Route path="ride-ended" element={<RideEnded />} />
      <Route path="ride-cancelled" element={<RideCancelled />} />

      <Route path="app" element={<DashboardLayout />}>
        <Route path="dashboard" element={<DummyHome />} />
      </Route>

      <Route path="complete-setup" element={<Completedetup/>}/>

      <Route path="auth" element={<AuthLayout />}>
        <Route path="login" element={<DummyLogin />} />
      </Route>

      <Route
        path="*"
        element={<NotFound />}
      />
    </Routes>
  );
}

export default App;
