import { Route, Routes, Navigate } from "react-router";
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
import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <>
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
      <Analytics />
    </>
  );
}

export default App;
