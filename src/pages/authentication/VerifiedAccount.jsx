import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { Check, X } from 'lucide-react';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { STEPS, arePreviousStepsCompleted, getFirstIncompleteStep, clearAllSteps } from '../../utils/stepValidation';

const VerifiedAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, stepToComplete, rejectedDocuments } = useSelector((state) => state.auth);
  const formData = location.state?.formData || {};
  const licenseData = location.state?.licenseData || {};
  const vehicleData = location.state?.vehicleData || {};
  const insuranceData = location.state?.insuranceData || {};
  const vehicleDetails = location.state?.vehicleDetails || {};
  const statusFromState = location.state?.status; // Get status from navigation state

  // Check if all documents are pending
  const allDocumentsPending = React.useMemo(() => {
    if (!user) return false;

    const driverLicenseStatus = user?.driverLicense?.status;
    const vehicleRegistrationStatus = user?.vehicleRegistration?.status;
    const insuranceStatus = user?.insurance?.status;
    const vehicleDetailsStatus = user?.vehicleDetails?.status;

    // Check if all documents exist and are pending
    return (
      driverLicenseStatus === 'pending' &&
      vehicleRegistrationStatus === 'pending' &&
      insuranceStatus === 'pending' &&
      vehicleDetailsStatus === 'pending'
    );
  }, [user]);

  // State to control which view to show: 'submitted', 'approved', 'rejected'
  // Default to 'submitted', but can be overridden by status from location state
  const [accountStatus, setAccountStatus] = useState(() => {
    // If status is provided in location state, use it
    if (statusFromState) {
      return statusFromState;
    }
    // Otherwise default to 'submitted'
    return 'submitted';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Ensure status stays as 'submitted' if all documents are pending
  React.useEffect(() => {
    // IMPORTANT: If all documents are pending, ALWAYS keep status as 'submitted'
    if (allDocumentsPending) {
      // Force status to 'submitted' if it's not already
      if (accountStatus !== 'submitted') {
        setAccountStatus('submitted');
      }
      return; // Don't change status
    }
  }, [accountStatus, allDocumentsPending]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    // Dispatch logout action to clear Redux state
    dispatch({ type: 'auth/logout' });
    // Clear localStorage
    localStorage.removeItem('verifiedPhone');
    // Clear completed steps
    clearAllSteps();
    // Clear cookies
    Cookies.remove('token');
    Cookies.remove('user');
    setShowLogoutModal(false);
    navigate('/');
  };

 const handlenext = () => {
    navigate("/subscription", {
      state: {
        formData,
        licenseData,
        vehicleData,
        insuranceData,
        vehicleDetails
      }
    });
  }

  const handleResubmit = () => {
    // Navigate to the step that needs to be completed based on stepToComplete
    if (stepToComplete) {
      const routeMap = {
        'driverLicense': '/license-information',
        'vehicleRegistration': '/vehicle-details',
        'insurance': '/insurance-information',
        'vehicleDetails': '/add-vehicle-details'
      };

      const route = routeMap[stepToComplete] || '/signup';
      navigate(route, {
        state: {
          formData,
          licenseData,
          vehicleData,
          insuranceData,
          vehicleDetails
        }
      });
    } else {
      // Fallback to signup if stepToComplete is not available
      navigate('/signup');
    }
  };

  // Helper function to get rejected reasons
  const getRejectedReasons = () => {
    if (rejectedDocuments && rejectedDocuments.length > 0) {
      return rejectedDocuments.map((rejectedDoc, index) => (
        <p key={index} className="font-poppins font-normal text-sm text-white m-0">
          {index + 1}. {rejectedDoc.rejectReason || `${rejectedDoc.key} document is rejected`}
        </p>
      ));
    }

    if (user) {
      const rejectedReasons = [];
      if (user?.driverLicense?.status === 'rejected' && user?.driverLicense?.rejectReason) {
        rejectedReasons.push(`Driver License: ${user.driverLicense.rejectReason}`);
      }
      if (user?.vehicleRegistration?.status === 'rejected' && user?.vehicleRegistration?.rejectReason) {
        rejectedReasons.push(`Vehicle Registration: ${user.vehicleRegistration.rejectReason}`);
      }
      if (user?.insurance?.status === 'rejected' && user?.insurance?.rejectReason) {
        rejectedReasons.push(`Insurance: ${user.insurance.rejectReason}`);
      }
      if (user?.vehicleDetails?.status === 'rejected' && user?.vehicleDetails?.rejectReason) {
        rejectedReasons.push(`Vehicle Details: ${user.vehicleDetails.rejectReason}`);
      }

      if (rejectedReasons.length > 0) {
        return rejectedReasons.map((reason, index) => (
          <p key={index} className="font-poppins font-normal text-sm text-white m-0">
            {index + 1}. {reason}
          </p>
        ));
      }
    }

    // Default fallback reasons
    return (
      <>
        <p className="font-poppins font-normal text-sm text-white m-0">
          1. Your profile picture is blurry.
        </p>
        <p className="font-poppins font-normal text-sm text-white m-0">
          2. Number Plate cannot be readable.
        </p>
      </>
    );
  };

  // Update account status based on user documents status
  React.useEffect(() => {
    // PRIORITY 1: If rejectedDocuments exist, set status to 'rejected'
    if (rejectedDocuments && rejectedDocuments.length > 0) {
      setAccountStatus('rejected');
      return;
    }

    // If status is provided in location state, don't override it (unless all documents are pending or rejected)
    if (statusFromState && !allDocumentsPending && (!rejectedDocuments || rejectedDocuments.length === 0)) {
      return;
    }

    // PRIORITY 2: If all documents are pending, ALWAYS ensure status is 'submitted'
    // This takes precedence over any other status (except rejected)
    if (allDocumentsPending) {
      setAccountStatus('submitted');
      return;
    }

    // If user exists but not all documents are pending, check individual statuses
    if (user) {
      const driverLicenseStatus = user?.driverLicense?.status;
      const vehicleRegistrationStatus = user?.vehicleRegistration?.status;
      const insuranceStatus = user?.insurance?.status;
      const vehicleDetailsStatus = user?.vehicleDetails?.status;

      // Check if any document is rejected
      if (
        driverLicenseStatus === 'rejected' ||
        vehicleRegistrationStatus === 'rejected' ||
        insuranceStatus === 'rejected' ||
        vehicleDetailsStatus === 'rejected'
      ) {
        setAccountStatus('rejected');
        return;
      }

      // Check if all documents are approved (and none are pending)
      if (
        driverLicenseStatus === 'approved' &&
        vehicleRegistrationStatus === 'approved' &&
        insuranceStatus === 'approved' &&
        vehicleDetailsStatus === 'approved' &&
        !allDocumentsPending
      ) {
        setAccountStatus('approved');
        return;
      }
    }
  }, [allDocumentsPending, user, statusFromState, rejectedDocuments]);

  // Redirect logic: Check step validation and user authentication
  React.useEffect(() => {
    // Priority 1: If user is null, redirect to signup immediately
    if (!user) {
      navigate('/signup');
      return;
    }

    // Priority 2: If stepToComplete is null/empty, allow access to verified-account
    // This handles the case where all steps are completed and user should see verified account
    if (stepToComplete === null || stepToComplete === undefined || stepToComplete === "" || !stepToComplete) {
      // Allow access if stepToComplete is null/empty (all steps completed)
      return;
    }

    // Priority 3: Check if previous steps (Step 1, 2, 3, 4, 5) are completed
    if (!arePreviousStepsCompleted(STEPS.VERIFIED_ACCOUNT)) {
      // Redirect to first incomplete step
      navigate(getFirstIncompleteStep());
      return;
    }

    // If user exists in Redux (from verify OTP), allow access
    if (user) {
      // User is authenticated, allow access
      return;
    }
  }, [user, stepToComplete, formData, navigate]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={4} />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-end overflow-y-auto max-h-[50em]">
        <div className="!w-[75em] flex flex-col items-center justify-center pr-[0em] py-8">
          {/* Request Submitted State */}
          {accountStatus === 'submitted' && (
            <div className="flex flex-col items-center justify-center gap-8">
              {/* Spinner */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div
                  className="absolute inset-0 border-4 rounded-full animate-spin"
                  style={{
                    borderColor: '#61CB08',
                    borderTopColor: 'transparent'
                  }}
                ></div>
              </div>

              {/* Heading */}
              <h1 className="font-poppins font-bold text-4xl text-center text-white m-0">
                Request Submitted
              </h1>

              {/* Message */}
              <p className="font-poppins font-normal text-base text-center text-white m-0 px-4 max-w-md">
                Your profile is under review. You will receive an email once your profile has been approved.
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#113D00] text-white hover:bg-[#016606]"
              >
                Logout
              </button>


            </div>
          )}

          {/* Profile Approved State */}
          {accountStatus === 'approved' && !allDocumentsPending && (
            <div className="flex flex-col items-center justify-center gap-5">
              {/* Success Icon - Green Square with Checkmark */}
              <div className="w-24 h-24 rounded-xl bg-[#61CB08] flex items-center justify-center shadow-lg">
                <Check size={48} color="#000B00" strokeWidth={3} />
              </div>

              {/* Heading */}
              <h1 className="font-poppins font-bold text-4xl text-center text-white m-0">
                Profile Approved
              </h1>

              {/* Message */}
              <p className="font-poppins font-normal text-base text-center text-[#E6E6E6] m-0 px-4 max-w-md">
                Your Profile has been approved successfully.
              </p>

              <button
                type="button"
                onClick={handlenext}
                className="w-full py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#113D00] text-white hover:bg-[#016606]"
              >
                Next
              </button>


            </div>
          )}

          {/* Profile Rejected State */}
          {accountStatus === 'rejected' && (
            <div className="flex flex-col items-center justify-center gap-8">
              {/* Error Icon - Red Square with X */}
              <div className="w-24 h-24 rounded-xl bg-[#EF4444] flex items-center justify-center shadow-lg">
                <X size={48} color="#FFFFFF" strokeWidth={3} />
              </div>

              {/* Heading */}
              <h1 className="font-poppins font-bold text-4xl text-center text-white m-0">
                Profile Rejected
              </h1>

              {/* Message */}
              <div className="flex flex-col items-center gap-4 max-w-md">
                <p className="font-poppins font-normal text-base text-center text-white m-0">
                  Your profile has been rejected due to the following reasons:
                </p>
                <div className="flex flex-col items-center gap-2 w-full">
                  {getRejectedReasons()}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-4" style={{ width: '360px' }}>
                <button
                  onClick={handleResubmit}
                  className="w-full py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-white hover:bg-[#55b307]"
                >
                  Resubmit
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#113D00] text-white hover:bg-[#016606]"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default VerifiedAccount;

