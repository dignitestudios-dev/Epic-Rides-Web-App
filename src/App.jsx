import { Route, Routes } from "react-router";
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

function App() {
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

      <Route path="app" element={<DashboardLayout />}>
        <Route path="dashboard" element={<DummyHome />} />
      </Route>

      <Route path="auth" element={<AuthLayout />}>
        <Route path="login" element={<DummyLogin />} />
      </Route>

      {/* <Route
        path="*"
        element={<div className="text-7xl">Page Not Found</div>}
      /> */}
    </Routes>
  );
}

export default App;
