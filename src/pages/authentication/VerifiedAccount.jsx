import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { Check, X } from 'lucide-react';
import axios from '../../axios';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { STEPS, arePreviousStepsCompleted, getFirstIncompleteStep, clearAllSteps } from '../../utils/stepValidation';
import { mergeRejectedDocumentsForResubmit } from '../../utils/rejectedFlowPrefill';

const DOCUMENT_KEY_LABELS = {
  driverLicense: 'Driver License',
  vehicleRegistration: 'Vehicle Registration',
  insurance: 'Insurance',
  vehicleDetails: 'Vehicle Details',
};

const formatDocumentKeyLabel = (key) => {
  if (!key) return 'Document';
  return DOCUMENT_KEY_LABELS[key] || key;
};

/** Strips a leading technical key / label from API text so the line reads naturally (e.g. "are blurry"). */
const prettifyRejectReason = (reason, key) => {
  if (!reason || typeof reason !== 'string') return '';
  let s = reason.trim();
  if (!s) return s;
  if (key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(`^${escaped}\\s*[:\\-–—]?\\s*`, 'i'), '').trim();
    const label = formatDocumentKeyLabel(key);
    if (label !== key) {
      s = s.replace(new RegExp(`^${label.replace(/\s+/g, '\\s+')}\\s*[:\\-–—]?\\s*`, 'i'), '').trim();
    }
  }
  if (!s) return reason.trim();
  if (/^are\b/i.test(s)) {
    s = `Documents ${s}`;
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const VerifiedAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, stepToComplete, rejectedDocuments: rejectedDocumentsRedux } = useSelector(
    (state) => state.auth
  );
  const formData = location.state?.formData || {};
  const licenseData = location.state?.licenseData || {};
  const vehicleData = location.state?.vehicleData || {};
  const insuranceData = location.state?.insuranceData || {};
  const vehicleDetails = location.state?.vehicleDetails || {};
  const statusFromState = location.state?.status; // Get status from navigation state
  const rejectedDocsFromState = location.state?.rejectedDocuments; // Get rejectedDocuments from state
  const shouldShowResubmitButton =
    statusFromState === 'rejected' &&
    Array.isArray(rejectedDocsFromState) &&
    rejectedDocsFromState.length > 0;

  console.log('=== VerifiedAccount Component ===');
  console.log('statusFromState:', statusFromState);
  console.log('rejectedDocsFromState:', rejectedDocsFromState);
  console.log('user:', user);
  console.log('rejectedDocuments from Redux:', rejectedDocumentsRedux);

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

  React.useEffect(() => {
  window.history.pushState(null, '', window.location.href);
  const handlePopState = (event) => {
    window.history.pushState(null, '', window.location.href);
  };
  window.addEventListener('popstate', handlePopState);
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, []);

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
  const [apiAccountStatus, setApiAccountStatus] = useState(null);
  const [apiRejectedDocuments, setApiRejectedDocuments] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Check account status every 10 seconds from API.
  React.useEffect(() => {
    const userId = user?._id;
    if (!userId) return;

    const fetchAccountStatus = async () => {
      try {
        const response = await axios.get(`/api/auth/account-status/${userId}`);
        const apiAccountStatus = response?.data?.data?.accountStatus;
        const rejectedDocsFromApi = response?.data?.data?.rejectedDocuments;
        if (apiAccountStatus) {
          setApiAccountStatus(apiAccountStatus);
          setAccountStatus(apiAccountStatus);
        }
        if (Array.isArray(rejectedDocsFromApi)) {
          setApiRejectedDocuments(rejectedDocsFromApi);
        }
      } catch (error) {
        console.error('Failed to fetch account status', error);
      }
    };

    fetchAccountStatus();
    const intervalId = setInterval(fetchAccountStatus, 10000);

    return () => clearInterval(intervalId);
  }, [user?._id]);

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
    localStorage.removeItem('verifiedPhone');
    clearAllSteps();
    Cookies.remove('token');
    Cookies.remove('user');
    localStorage.removeItem('persist:root');
    window.location.replace('/');
  };

  const handleResubmit = () => {
    // Determine all rejected steps in the correct order
    const orderedKeys = ['driverLicense', 'vehicleRegistration', 'insurance', 'vehicleDetails'];

    // Source of rejected docs: location state, Redux, or user object
    const rejectedSet = new Set();

    if (rejectedDocsFromState && Array.isArray(rejectedDocsFromState)) {
      rejectedDocsFromState.forEach((doc) => doc.key && rejectedSet.add(doc.key));
    }
    if (rejectedDocumentsRedux && Array.isArray(rejectedDocumentsRedux)) {
      rejectedDocumentsRedux.forEach((doc) => doc.key && rejectedSet.add(doc.key));
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

    const mergedRejectedDocuments = mergeRejectedDocumentsForResubmit(rejectedFlow, {
      rejectedDocsFromState,
      rejectedDocumentsRedux,
      user,
    });

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
        rejectedDocuments: mergedRejectedDocuments,
      },
    });
  };

  // Helper function to get rejected reasons
  const getRejectedReasons = () => {
    const renderRejectedRow = (rejectedDoc, index) => {
      const key = rejectedDoc?.key;
      const title = formatDocumentKeyLabel(key);
      const rawReason =
        typeof rejectedDoc?.rejectReason === 'string' && rejectedDoc.rejectReason.trim()
          ? rejectedDoc.rejectReason.trim()
          : '';
      const displayReason = rawReason
        ? prettifyRejectReason(rawReason, key)
        : `${title} was rejected. Please upload again.`;
      const stableKey = key ? `${key}-${index}` : `reject-${index}`;

      return (
        <div
  key={stableKey}
  className="w-full  rounded-xl border-2 border-[#61CB08]/25 bg-[rgba(97,203,8,0.08)] px-4 py-3 text-left backdrop-blur-sm"
>
  <div className="font-poppins font-semibold text-sm text-[#61CB08] leading-snug">
    {title}
  </div>
  <p className="font-poppins font-normal text-sm text-[#E6E6E6] m-0 mt-2 leading-relaxed overflow-y-auto h-[3em] custom-scrollbar">
  {displayReason}
</p>
</div>
      );
    };

    // PRIORITY 1: rejectedDocuments from location state (e.g. Verification.jsx)
    if (apiRejectedDocuments && Array.isArray(apiRejectedDocuments) && apiRejectedDocuments.length > 0) {
      return apiRejectedDocuments.map((rejectedDoc, index) => renderRejectedRow(rejectedDoc, index));
    }

    // PRIORITY 1: rejectedDocuments from location state (e.g. Verification.jsx)
    if (rejectedDocsFromState && Array.isArray(rejectedDocsFromState) && rejectedDocsFromState.length > 0) {
      return rejectedDocsFromState.map((rejectedDoc, index) => renderRejectedRow(rejectedDoc, index));
    }

    // PRIORITY 2: rejectedDocuments from Redux
    if (
      rejectedDocumentsRedux &&
      Array.isArray(rejectedDocumentsRedux) &&
      rejectedDocumentsRedux.length > 0
    ) {
      return rejectedDocumentsRedux.map((rejectedDoc, index) => renderRejectedRow(rejectedDoc, index));
    }

    // PRIORITY 3: user object — same shape as API (key + rejectReason) for consistent UI
    if (user) {
      const fromUser = [];
      if (user?.driverLicense?.status === 'rejected') {
        fromUser.push({ key: 'driverLicense', rejectReason: user.driverLicense.rejectReason });
      }
      if (user?.vehicleRegistration?.status === 'rejected') {
        fromUser.push({ key: 'vehicleRegistration', rejectReason: user.vehicleRegistration.rejectReason });
      }
      if (user?.insurance?.status === 'rejected') {
        fromUser.push({ key: 'insurance', rejectReason: user.insurance.rejectReason });
      }
      if (user?.vehicleDetails?.status === 'rejected') {
        fromUser.push({ key: 'vehicleDetails', rejectReason: user.vehicleDetails.rejectReason });
      }

      if (fromUser.length > 0) {
        return fromUser.map((row, index) => renderRejectedRow(row, index));
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

    // API status is source of truth once available.
    if (apiAccountStatus) {
      setAccountStatus(apiAccountStatus);
      return;
    }
    
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
      (apiRejectedDocuments && Array.isArray(apiRejectedDocuments) && apiRejectedDocuments.length > 0) ||
      (rejectedDocsFromState && Array.isArray(rejectedDocsFromState) && rejectedDocsFromState.length > 0) ||
      (rejectedDocumentsRedux &&
        Array.isArray(rejectedDocumentsRedux) &&
        rejectedDocumentsRedux.length > 0);
    
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
  }, [allDocumentsPending, user, statusFromState, rejectedDocumentsRedux, rejectedDocsFromState, apiRejectedDocuments, apiAccountStatus]);

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
          {(accountStatus === 'submitted' || accountStatus === 'pending') && (
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
                Please relogin to buy a subscription.
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
              <div className="flex flex-col items-center gap-4 w-full max-w-lg px-3 ">
                <p className="font-poppins font-normal text-base text-center text-white m-0">
                  {/* Profile is rejected. For resubmit your profile, please relogin. */}
                  Your Profile Has Been Rejected. Please Submit Again By Logging In Again.
                </p>
                <div className="flex flex-col gap-3 w-full">{getRejectedReasons()}</div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-4" style={{ width: '360px' }}>
                {shouldShowResubmitButton && (
                  <button
                    onClick={handleResubmit}
                    className="w-full py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-white hover:bg-[#55b307]"
                  >
                    resubmit
                  </button>
                )}
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