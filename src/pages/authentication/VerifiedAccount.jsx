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
  const rejectedDocsFromState = location.state?.rejectedDocuments; // Get rejectedDocuments from state

  console.log('=== VerifiedAccount Component ===');
  console.log('statusFromState:', statusFromState);
  console.log('rejectedDocsFromState:', rejectedDocsFromState);
  console.log('user:', user);
  console.log('rejectedDocuments from Redux:', rejectedDocuments);

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
      console.log('✅ Using statusFromState:', statusFromState);
      return statusFromState;
    }
    // Otherwise default to 'submitted'
    return 'submitted';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Auto-redirect to subscription after 2 seconds when approved
  React.useEffect(() => {
    if (accountStatus === 'approved' && !allDocumentsPending) {
      console.log('✅ Account approved, redirecting to /subscription in 2 seconds');
      const timer = setTimeout(() => {
        navigate('/subscription', {
          state: {
            formData,
            licenseData,
            vehicleData,
            insuranceData,
            vehicleDetails
          }
        });
      }, 2000); // 2 seconds delay

      // Cleanup timer on component unmount or if status changes
      return () => clearTimeout(timer);
    }
  }, [accountStatus, allDocumentsPending, navigate, formData, licenseData, vehicleData, insuranceData, vehicleDetails]);

  // Ensure status stays as 'submitted' if all documents are pending
  React.useEffect(() => {
    // IMPORTANT: If all documents are pending, ALWAYS keep status as 'submitted'
    if (allDocumentsPending) {
      // Force status to 'submitted' if it's not already
      if (accountStatus !== 'submitted') {
        console.log('⚠️ Setting status to submitted (all documents pending)');
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
    // Determine all rejected steps in the correct order
    const orderedKeys = ['driverLicense', 'vehicleRegistration', 'insurance', 'vehicleDetails'];

    // Source of rejected docs: location state, Redux, or user object
    const rejectedSet = new Set();

    if (rejectedDocsFromState && Array.isArray(rejectedDocsFromState)) {
      rejectedDocsFromState.forEach((doc) => doc.key && rejectedSet.add(doc.key));
    }
    if (rejectedDocuments && Array.isArray(rejectedDocuments)) {
      rejectedDocuments.forEach((doc) => doc.key && rejectedSet.add(doc.key));
    }
    if (user) {
      if (user?.driverLicense?.status === 'rejected') rejectedSet.add('driverLicense');
      if (user?.vehicleRegistration?.status === 'rejected') rejectedSet.add('vehicleRegistration');
      if (user?.insurance?.status === 'rejected') rejectedSet.add('insurance');
      if (user?.vehicleDetails?.status === 'rejected') rejectedSet.add('vehicleDetails');
    }

    const rejectedFlow = orderedKeys.filter((key) => rejectedSet.has(key));

    if (rejectedFlow.length === 0) {
      // No rejected steps found, fallback
      navigate('/signup');
      return;
    }

    const routeMap = {
      driverLicense: '/license-information',
      vehicleRegistration: '/vehicle-details',
      insurance: '/insurance-information',
      vehicleDetails: '/add-vehicle-details',
    };

    const firstKey = rejectedFlow[0];
    const route = routeMap[firstKey] || '/signup';

    navigate(route, {
      state: {
        formData,
        licenseData,
        vehicleData,
        insuranceData,
        vehicleDetails,
        fromVerifiedAccount: true,
        rejectedFlow,
        currentIndex: 0,
      },
    });
  };

  // Helper function to get rejected reasons
  const getRejectedReasons = () => {
    console.log('getRejectedReasons called');
    console.log('rejectedDocsFromState:', rejectedDocsFromState);
    console.log('rejectedDocuments from Redux:', rejectedDocuments);
    
    // PRIORITY 1: Use rejectedDocuments from location state (passed from Verification.jsx)
    if (rejectedDocsFromState && Array.isArray(rejectedDocsFromState) && rejectedDocsFromState.length > 0) {
      console.log('✅ Using rejectedDocsFromState');
      return rejectedDocsFromState.map((rejectedDoc, index) => (
        <p key={index} className="font-poppins font-normal text-sm text-white m-0">
          {index + 1}. {rejectedDoc.rejectReason || `${rejectedDoc.key} document is rejected`}
        </p>
      ));
    }

    // PRIORITY 2: Use rejectedDocuments from Redux
    if (rejectedDocuments && Array.isArray(rejectedDocuments) && rejectedDocuments.length > 0) {
      console.log('✅ Using rejectedDocuments from Redux');
      return rejectedDocuments.map((rejectedDoc, index) => (
        <p key={index} className="font-poppins font-normal text-sm text-white m-0">
          {index + 1}. {rejectedDoc.rejectReason || `${rejectedDoc.key} document is rejected`}
        </p>
      ));
    }

    // PRIORITY 3: Check user object for rejected documents
    if (user) {
      console.log('Checking user object for rejected docs');
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
        console.log('✅ Using rejectedReasons from user object');
        return rejectedReasons.map((reason, index) => (
          <p key={index} className="font-poppins font-normal text-sm text-white m-0">
            {index + 1}. {reason}
          </p>
        ));
      }
    }

    // Default fallback reasons
    console.log('⚠️ Using default fallback reasons');
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
    console.log('=== useEffect: Update account status ===');
    
    // PRIORITY 0: If statusFromState is 'submitted', always show Request Submitted
    if (statusFromState === 'submitted') {
      console.log('✅ PRIORITY 0: statusFromState is submitted, setting status to submitted');
      setAccountStatus('submitted');
      return;
    }
    
    // PRIORITY 1: If statusFromState is 'rejected', keep it as rejected
    if (statusFromState === 'rejected') {
      console.log('✅ PRIORITY 1: statusFromState is rejected, keeping status as rejected');
      setAccountStatus('rejected');
      return;
    }

    // PRIORITY 2: If rejectedDocuments exist (from location state or Redux), set status to 'rejected'
    const hasRejectedDocs = 
      (rejectedDocsFromState && Array.isArray(rejectedDocsFromState) && rejectedDocsFromState.length > 0) ||
      (rejectedDocuments && Array.isArray(rejectedDocuments) && rejectedDocuments.length > 0);
    
    if (hasRejectedDocs) {
      console.log('✅ PRIORITY 2: rejectedDocuments found, setting status to rejected');
      setAccountStatus('rejected');
      return;
    }

    // PRIORITY 3: If all documents are pending, ALWAYS ensure status is 'submitted'
    if (allDocumentsPending) {
      console.log('✅ PRIORITY 3: All documents pending, setting status to submitted');
      setAccountStatus('submitted');
      return;
    }

    // If user exists but not all documents are pending, check individual statuses
    if (user) {
      console.log('Checking user object for document statuses');
      const driverLicenseStatus = user?.driverLicense?.status;
      const vehicleRegistrationStatus = user?.vehicleRegistration?.status;
      const insuranceStatus = user?.insurance?.status;
      const vehicleDetailsStatus = user?.vehicleDetails?.status;

      console.log('Document statuses:', {
        driverLicenseStatus,
        vehicleRegistrationStatus,
        insuranceStatus,
        vehicleDetailsStatus
      });

      // Check if any document is rejected
      if (
        driverLicenseStatus === 'rejected' ||
        vehicleRegistrationStatus === 'rejected' ||
        insuranceStatus === 'rejected' ||
        vehicleDetailsStatus === 'rejected'
      ) {
        console.log('✅ PRIORITY 4: Found rejected document in user object, setting status to rejected');
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
        console.log('✅ PRIORITY 5: All documents approved, setting status to approved');
        setAccountStatus('approved');
        return;
      }
    }

    console.log('⚠️ No condition matched, keeping current status');
  }, [allDocumentsPending, user, statusFromState, rejectedDocuments, rejectedDocsFromState]);

  // Redirect logic: Check step validation and user authentication
  React.useEffect(() => {
    console.log('=== useEffect: Redirect logic ===');
    
    // IMPORTANT: Do NOT redirect if statusFromState is 'rejected'
    // When user comes from Verification.jsx with rejected status, allow them to see the rejected page
    if (statusFromState === 'rejected') {
      console.log('✅ statusFromState is rejected, ALLOWING ACCESS (no redirect)');
      return; // ALLOW ACCESS - don't redirect
    }

    // Priority 1: If user is null AND statusFromState is not 'rejected', redirect to signup
    if (!user && statusFromState !== 'rejected') {
      console.log('❌ PRIORITY 1: No user and statusFromState is not rejected, redirecting to /signup');
      navigate('/signup');
      return;
    }

    // Priority 2: If stepToComplete is null/empty, allow access to verified-account
    if (stepToComplete === null || stepToComplete === undefined || stepToComplete === "" || !stepToComplete) {
      console.log('✅ PRIORITY 2: stepToComplete is null/empty, ALLOWING ACCESS');
      return;
    }

    // Determine if we have navigation state from previous steps in this session
    const hasFlowState =
      (formData && Object.keys(formData).length > 0) ||
      (licenseData && Object.keys(licenseData).length > 0) ||
      (vehicleData && Object.keys(vehicleData).length > 0) ||
      (insuranceData && Object.keys(insuranceData).length > 0) ||
      (vehicleDetails && Object.keys(vehicleDetails).length > 0);

    // Priority 3: Only use step validation redirect when we DON'T have in-memory flow state
    if (!hasFlowState && !arePreviousStepsCompleted(STEPS.VERIFIED_ACCOUNT)) {
      console.log('❌ PRIORITY 3: Previous steps not completed and no flow state, redirecting to first incomplete step');
      navigate(getFirstIncompleteStep());
      return;
    }

    console.log('✅ All redirect checks passed, allowing access');
  }, [user, stepToComplete, formData, licenseData, vehicleData, insuranceData, vehicleDetails, navigate, statusFromState]);

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
                className="w-[26em] py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#113D00] text-white hover:bg-[#016606]"
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
                  resubmit
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