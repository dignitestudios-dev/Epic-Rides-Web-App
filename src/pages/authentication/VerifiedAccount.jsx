import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { Check, X } from 'lucide-react';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import LogoutButton from '../../components/global/LogoutButton';
import TopRightLogoutButton from '../../components/global/TopRightLogoutButton';
import {
  getFirstIncompleteStep,
  clearAllSteps,
} from '../../utils/stepValidation';
import {
  hasActiveSubscription,
  isDocumentRoute,
  areAllDocumentsApproved,
  hasRejectedDocuments,
  buildRejectedDocumentsPayload,
} from '../../utils/onboardingRedirect';
import { clearSubscriptionCheckoutSession } from '../../utils/subscriptionCheckout';
import { getAccountStatus } from '../../redux/slices/auth.slice';

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
  const {
    user,
    accountStatus: reduxAccountStatus,
    rejectedDocuments: rejectedDocumentsRedux,
  } = useSelector((state) => state.auth);
  const formData = location.state?.formData || {};
  const licenseData = location.state?.licenseData || {};
  const vehicleData = location.state?.vehicleData || {};
  const insuranceData = location.state?.insuranceData || {};
  const vehicleDetails = location.state?.vehicleDetails || {};
  const rejectedDocsFromState = location.state?.rejectedDocuments;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch latest account status immediately on mount
  useEffect(() => {
    const currentToken = Cookies.get('token');
    if (currentToken) {
      dispatch(getAccountStatus());
    }
  }, [dispatch]);

  // Dynamic resolved rejected documents list from Redux polling + user object + route state
  const resolvedRejectedDocs = React.useMemo(() => {
    const combinedList = [
      ...(Array.isArray(rejectedDocumentsRedux) ? rejectedDocumentsRedux : []),
      ...(Array.isArray(rejectedDocsFromState) ? rejectedDocsFromState : []),
    ];
    return buildRejectedDocumentsPayload(user, combinedList);
  }, [user, rejectedDocumentsRedux, rejectedDocsFromState]);

  // Directly derive account state from Redux (kept fresh by global polling & upload thunks)
  const hasRejectedDocs =
    reduxAccountStatus === 'rejected' ||
    user?.accountStatus === 'rejected' ||
    hasRejectedDocuments(user, rejectedDocumentsRedux) ||
    resolvedRejectedDocs.length > 0;

  const isApproved =
    !hasRejectedDocs &&
    (reduxAccountStatus === 'approved' ||
      user?.accountStatus === 'approved' ||
      (user && areAllDocumentsApproved(user)));

  const currentStatus = isApproved ? 'approved' : hasRejectedDocs ? 'rejected' : 'submitted';

  const shouldShowResubmitButton = currentStatus === 'rejected';

  React.useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Redirect guard: Check step validation and subscription
  React.useEffect(() => {
    // If rejected, ALWAYS allow access to view rejection reasons & resubmit
    if (hasRejectedDocs) {
      return;
    }

    // If user is null and not logged in, redirect to signup
    if (!user && !Cookies.get('token')) {
      navigate('/signup');
      return;
    }

    // Documents come before payment: if any wizard step is still outstanding, go finish it
    const nextRoute = getFirstIncompleteStep();
    if (isDocumentRoute(nextRoute)) {
      navigate(nextRoute, { replace: true });
      return;
    }
  }, [user, hasRejectedDocs, navigate]);

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
    if (resolvedRejectedDocs.length === 0) {
      navigate('/signup');
      return;
    }

    const rejectedFlow = resolvedRejectedDocs.map((d) => d.key);
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
        rejectedDocuments: resolvedRejectedDocs,
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

    if (resolvedRejectedDocs.length > 0) {
      return resolvedRejectedDocs.map((rejectedDoc, index) => renderRejectedRow(rejectedDoc, index));
    }

    // Default fallback reasons
    return (
      <p className="font-poppins font-normal text-sm text-white m-0">
        Your document was rejected. Please click resubmit to upload updated documents.
      </p>
    );
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden overflow-y-hidden">
      {/* Top Right Logout Button */}
      <TopRightLogoutButton onClick={handleLogout} />

      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={5} />

      {/* Main Content */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden flex justify-center lg:justify-end custom-scrollbar">
        <div className="w-full min-h-full flex flex-col items-center justify-start pt-24 sm:pt-28 lg:pt-10 pb-16 px-4 md:px-8 lg:w-[calc(100%-420px)] lg:mr-8 xl:mr-16 2xl:mr-24">
          <div className="w-full max-w-lg my-auto flex flex-col items-center">
            {/* Request Submitted State */}
          {currentStatus === 'submitted' && (
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
              <h1 className="font-poppins font-bold text-2xl text-center text-white m-0 md:text-4xl sm:text-2xl">
                Request Submitted
              </h1>

              {/* Message */}
              <p className="font-poppins font-normal text-base text-center text-white m-0 px-4 max-w-md">
                Your profile is under review. You will receive an email once your profile has been approved.
              </p>
            </div>
          )}

          {/* Profile Approved State */}
          {currentStatus === 'approved' && (
            <div className="flex flex-col items-center justify-center gap-5">
              {/* Success Icon - Green Square with Checkmark */}
              <div className="w-24 h-24 rounded-xl bg-[#61CB08] flex items-center justify-center shadow-lg">
                <Check size={48} color="#000B00" strokeWidth={3} />
              </div>

              {/* Heading */}
              <h1 className="font-poppins font-bold text-2xl text-center text-white m-0 md:text-4xl sm:text-2xl">
                Profile Approved
              </h1>

              {/* Message */}
              <p className="font-poppins font-normal text-base text-center text-[#E6E6E6] m-0 px-4 max-w-md">
                Your profile is approved. You can now view and manage your subscription.
              </p>

              {/* Continue to Subscription Button */}
              <div className="flex flex-col gap-3 mt-4 w-full max-w-[360px]">
                <button
                  type="button"
                  onClick={() => navigate('/subscription')}
                  className="w-full py-3 rounded-xl font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-[#000B00] hover:bg-[#55b307]"
                >
                  Continue to Subscription
                </button>
              </div>
            </div>
          )}

          {/* Profile Rejected State */}
          {currentStatus === 'rejected' && (
            <div className="flex flex-col items-center justify-center gap-8">
              {/* Error Icon - Red Square with X */}
              <div className="w-24 h-24 rounded-xl bg-[#EF4444] flex items-center justify-center shadow-lg">
                <X size={48} color="#FFFFFF" strokeWidth={3} />
              </div>

              {/* Heading */}
              <h1 className="font-poppins font-bold text-2xl text-center text-white m-0 md:text-4xl sm:text-2xl">
                Profile Rejected
              </h1>

              {/* Message */}
              <div className="flex flex-col items-center gap-4 w-full max-w-lg px-3 ">
                <p className="font-poppins font-normal text-[13px] md:text-base text-center text-white m-0">
                  Your Profile Has Been Rejected. Please Submit Again By Logging In Again.
                </p>
                <div className="flex flex-col gap-3 w-full">{getRejectedReasons()}</div>
              </div>

              {/* Buttons */}
              {shouldShowResubmitButton && (
                <div className="flex flex-col gap-3 mt-4" style={{ width: '360px' }}>
                  <button
                    onClick={handleResubmit}
                    className="w-full py-3 rounded-xl font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-white hover:bg-[#55b307]"
                  >
                    resubmit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prominent Log Out button below content (Mobile only) */}
          <div className="flex flex-col gap-3 mt-4 w-full max-w-[360px] lg:hidden">
            <LogoutButton onClick={handleLogout} />
          </div>
        </div>
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