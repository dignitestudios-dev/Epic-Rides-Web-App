import React, { useEffect } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import "./App.css";
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
import ProtectedRoute from "./components/global/ProtectedRoute";
import { getAccountStatus, hydrateAuthFromCookies } from "./redux/slices/auth.slice";
import { areAllDocumentsApproved } from "./utils/onboardingRedirect";
import { loginbackgroundimage } from "./assets/export";

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAccountStatusInitialized, accountStatus, user } = useSelector((state) => state.auth);
  const token = Cookies.get("token");

  // Fetch latest account status on initial mount and on every route change
  useEffect(() => {
    dispatch(hydrateAuthFromCookies());
    const authToken = Cookies.get("token");
    if (authToken) {
      dispatch(getAccountStatus());
    }
  }, [dispatch, location.pathname]);

  // Background polling: Active on /subscription and /verified-account every 10 seconds
  useEffect(() => {
    const isPollingRoute =
      location.pathname === "/subscription" ||
      location.pathname === "/verified-account";

    if (!isPollingRoute) return;

    const intervalId = setInterval(() => {
      const authToken = Cookies.get("token");
      if (authToken) {
        dispatch(getAccountStatus());
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [dispatch, location.pathname]);

  // Show branded loading screen on initial load when token exists until status resolves
  if (token && !isAccountStatusInitialized) {
    return (
      <div className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-poppins px-4">
        {/* Background Image with Car Watermark and Lights */}
        <div 
          className="fixed inset-0 w-full h-full bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${loginbackgroundimage})` }}
        />

        {/* Ambient Radial Glow */}
        <div
          className="absolute z-0 pointer-events-none animate-pulse"
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(97, 203, 8, 0.12)",
            filter: "blur(70px)",
          }}
        />

        {/* Glassmorphism Loading Card */}
        <div 
          className="relative z-10 flex flex-col items-center gap-5 p-8 sm:p-10 rounded-2xl bg-[rgba(239,239,239,0.06)] border border-[rgba(255,255,255,0.12)] backdrop-blur-[28px] shadow-2xl max-w-sm w-full"
          style={{
            WebkitBackdropFilter: "blur(28px)",
          }}
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <div
              className="absolute inset-0 border-4 rounded-full animate-spin"
              style={{
                borderColor: "#61CB08",
                borderTopColor: "transparent",
              }}
            />
          </div>
          <p className="font-poppins font-medium text-sm sm:text-base text-[#E6E6E6] m-0 text-center animate-pulse tracking-wide">
            Verifying account status...
          </p>
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

      {/* STEP 1 - Unprotected signup */}
      <Route
        path="signup"
        element={<Signup />}
      />

      {/* STEP 2 - Protected */}
      <Route
        path="license-information"
        element={
          <ProtectedRoute>
            <LicenseInformation />
          </ProtectedRoute>
        }
      />

      {/* STEP 3 - Protected */}
      <Route
        path="vehicle-details"
        element={
          <ProtectedRoute>
            <VehicleDetails />
          </ProtectedRoute>
        }
      />

      {/* STEP 4 - Protected */}
      <Route
        path="insurance-information"  
        element={
          <ProtectedRoute>
            <InsuranceInformation />
          </ProtectedRoute>
        }
      />

      {/* STEP 5 - Protected */}
      <Route
        path="add-vehicle-details"
        element={
          <ProtectedRoute>
            <AddVehicleDetails />
          </ProtectedRoute>
        }
      />

      {/* STEP 6 - Protected */}
      <Route
        path="verified-account"
        element={
          <ProtectedRoute>
            <VerifiedAccount />
          </ProtectedRoute>
        }
      />

      {/* STEP 7 - Protected */}
      <Route
        path="subscription"
        element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        }
      />

      {/* Unprotected OTP Verification */}
      <Route
        path="verification"
        element={<Verification />}
      />

      {/* Public Tracking Routes */}
      <Route path="share" element={<ShareTracking />} />
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

      <Route
        path="complete-setup"
        element={
          <ProtectedRoute>
            <Completedetup />
          </ProtectedRoute>
        }
      />

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
