import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp, sendOtp, getAccountStatus } from '../../redux/slices/auth.slice';
import { loginbackgroundimage } from '../../assets/export';
import { SuccessToast } from '../../components/global/Toaster';
import NumberVerifiedModal from '../../components/global/NumberVerifiedModal';
import Cookies from 'js-cookie';
import { resolvePostLoginRoute } from '../../utils/onboardingRedirect';
import { getFirstIncompleteStep } from '../../utils/stepValidation';
import { IoChevronBackCircleSharp } from "react-icons/io5";


export default function Verification() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    isLoading,
    phone,
    user: reduxUser,
    otpSent,
    isOnboarded: reduxIsOnboarded,
    accountStatus: reduxAccountStatus,
    stepToComplete: reduxStepToComplete,
    rejectedDocuments: reduxRejectedDocs,
    pendingDocuments: reduxPendingDocs,
    isAccountStatusInitialized,
  } = useSelector((state) => state.auth);
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits OTP
  const [resendTimer, setResendTimer] = useState(60); // Start with 60 seconds
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const otpInputRefs = useRef([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const referredByParam = searchParams.get('referredBy');
    if (referredByParam) {
      Cookies.set('referredBy', referredByParam, { expires: 30 });
    }
  }, [location.search]);

  const token = Cookies.get('token');
  let currentUser = reduxUser;
  if (!currentUser) {
    try {
      const raw = Cookies.get('user');
      if (raw) currentUser = JSON.parse(raw);
    } catch {
      // ignore invalid cookie JSON
    }
  }
  const isLoggedIn = Boolean(token && (currentUser || reduxUser));

  // Only allow when coming from login page via "Continue" button
  const fromLogin = Boolean(location.state?.fromLogin);
  const phoneNumber = location.state?.phoneNumber || phone || '';
  
  // Get masked phone number for display
  const getMaskedPhoneNumber = () => {
    const raw = String(phoneNumber || '').replace(/\D/g, '');
    if (raw.length >= 7) {
      const last3 = raw.slice(-3);
      return `*** *** *${last3}`;
    }
    if (raw.length >= 3) {
      return `*** *** *${raw.slice(-3)}`;
    }
    return '*** *** *890';
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6 && /^\d$/.test(digit)) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      // Focus next empty input
      const nextIndex = Math.min(index + pastedOtp.length, 6);
      if (otpInputRefs.current[nextIndex]) {
        otpInputRefs.current[nextIndex].focus();
      }
      return;
    }

    if (!/^\d$/.test(value) && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otp.join("").length === 6){
      handleVerify(e);
    }
  };

  // Handle verify OTP
  const handleVerify = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const otpString = otp.join('');
    if (otpString.length === 6 && phoneNumber) {
      try {
        // Get clean phone number (digits only)
        const rawPhone = phoneNumber.replace(/\D/g, '');
        const cleanPhone = rawPhone.length === 10 ? `1${rawPhone}` : rawPhone;
        
        // 1. Dispatch verify OTP action to obtain and store JWT token & verify payload
        const verifyResult = await dispatch(
          verifyOtp({ phone: cleanPhone, otp: otpString, role: 'driver' })
        ).unwrap();

        // Store phone number in localStorage after successful verification
        if (cleanPhone) {
          localStorage.setItem('verifiedPhone', cleanPhone);
        }

        let routingData = verifyResult;

        // 2. Fetch authoritative account status from /api/auth/account-status if available
        try {
          const statusResult = await dispatch(getAccountStatus()).unwrap();
          console.log('=== Account Status After Verification ===', statusResult);
          if (
            statusResult &&
            (statusResult.user ||
              statusResult.accountStatus !== undefined ||
              statusResult.isOnboarded !== undefined)
          ) {
            routingData = statusResult;
          }
        } catch (statusError) {
          console.warn(
            'Account status API failed or returned 401, falling back to verify OTP data:',
            statusError
          );
        }

        // 3. Resolve destination route based on available authoritative data (account-status if succeeded, else verify OTP data)
        const { path, state } = resolvePostLoginRoute({
          user: routingData?.user,
          accountStatus: routingData?.accountStatus,
          isOnboarded: routingData?.isOnboarded,
          stepToComplete: routingData?.stepToComplete,
          rejectedDocuments: routingData?.rejectedDocuments || [],
          pendingDocuments: routingData?.pendingDocuments || [],
        });

        console.log('✅ Post-verification route determined:', path, state);
        navigate(path, state ? { state } : undefined);
      } catch (error) {
        // Error is already handled in axios interceptor and slice with ErrorToast
        console.error('OTP verification error:', error);
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }
    }
  };

  // Handle close success modal
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Navigate to signup after closing modal
    navigate('/signup');
  };

  // Handle resend code
  const handleResend = async () => {
    if (resendTimer > 0) return; // Prevent resend if timer is active
    
    if (!phoneNumber) {
      SuccessToast('Phone number not found');
      return;
    }
    
    try {
      const rawPhone = phoneNumber.replace(/\D/g, '');
      const cleanPhone = rawPhone.length === 10 ? `1${rawPhone}` : rawPhone;
      await dispatch(sendOtp({ phone: cleanPhone, role: 'driver' })).unwrap();
      setOtp(['', '', '', '', '', '']); // Clear OTP inputs
      setResendTimer(60); // Set timer to 30 seconds after resend
      // Focus first input
      if (otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    } catch (error) {
      // Error is already handled in axios interceptor and slice with ErrorToast
      console.error('Resend OTP error:', error);
    }
  };

  // Focus first OTP input on mount
  useEffect(() => {
    if (otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, []);

  // Auth / Navigation Guard Effect:
  // 1. If already logged in and account status initialized, redirect to active onboarding step / subscription
  // 2. If not logged in and not arriving via "Continue with Phone Number", redirect to /
  useEffect(() => {
    if (isLoggedIn && isAccountStatusInitialized) {
      const activeUser = reduxUser || currentUser;
      if (activeUser) {
        const resolvedIsOnboarded =
          activeUser?.isOnboarded !== undefined
            ? activeUser.isOnboarded
            : reduxIsOnboarded;
        const { path, state: postLoginState } = resolvePostLoginRoute({
          user: activeUser,
          accountStatus: reduxAccountStatus || activeUser?.accountStatus,
          isOnboarded: resolvedIsOnboarded,
          stepToComplete: reduxStepToComplete || activeUser?.stepToComplete,
          rejectedDocuments: reduxRejectedDocs || activeUser?.rejectedDocuments || [],
          pendingDocuments: reduxPendingDocs || activeUser?.pendingDocuments || [],
        });
        navigate(path, { replace: true, state: postLoginState });
      } else {
        navigate(getFirstIncompleteStep(), { replace: true });
      }
      return;
    }

    if (!phoneNumber || !fromLogin) {
      navigate('/', { replace: true });
    }
  }, [
    isLoggedIn,
    isAccountStatusInitialized,
    reduxUser,
    currentUser,
    reduxAccountStatus,
    reduxIsOnboarded,
    reduxStepToComplete,
    reduxRejectedDocs,
    reduxPendingDocs,
    phoneNumber,
    fromLogin,
    navigate,
  ]);

  // Timer countdown effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  // Prevent flash of content if user shouldn't be here
  if (isLoggedIn || !phoneNumber || !fromLogin) {
    return null;
  }

  return (
    <div className="relative w-full min-h-screen overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start bg-black font-poppins py-8 px-4 sm:px-6 md:px-8 custom-scrollbar">
      {/* Background Image */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${loginbackgroundimage})` }}
      />

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="fixed top-5 left-5 md:top-8 md:left-8 z-30 w-10 h-10 rounded-full bg-[#0f0f0f]/60 backdrop-blur-md flex items-center justify-center hover:bg-[#1a1a1a] transition-colors duration-200 cursor-pointer"
        aria-label="Go back"
      >
        <IoChevronBackCircleSharp size={40} color="#61CB08" />
      </button>

      {/* Main Card */}
      <div 
        className="relative z-10 w-full max-w-[480px] my-auto bg-[rgba(239,239,239,0.1)] border-[0.8px] border-[#CACACA] backdrop-blur-[28.9px] rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col items-center shadow-2xl"
        style={{
          WebkitBackdropFilter: 'blur(28.9px)'
        }}
      >
        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full">
          {/* Header Section */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 w-full text-center">
            <h1 className="font-poppins font-semibold text-2xl sm:text-3xl md:text-[36px] leading-tight text-white m-0">
              Verification
            </h1>
            <p className="font-poppins font-normal text-sm sm:text-base text-[#E6E6E6] m-0">
              Please enter OTP sent to {getMaskedPhoneNumber()}
            </p>
          </div>

          {/* OTP Input Container */}
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 w-full max-w-[360px]">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl font-poppins font-semibold text-lg sm:text-2xl text-center text-white outline-none backdrop-blur-[42px] transition-colors focus:border-[#61CB08]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%), linear-gradient(180deg, rgba(37, 37, 37, 1) 0%, rgba(15, 15, 15, 1) 100%)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  WebkitBackdropFilter: 'blur(42px)'
                }}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full max-w-[360px] h-11 sm:h-12 bg-[#61CB08] hover:bg-[#028C08] rounded-xl font-poppins font-semibold text-xs sm:text-sm capitalize text-[#000B00] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>

          {/* Resend */}
          <p className="w-full max-w-[360px] font-inter font-normal text-xs sm:text-sm text-center text-[#808080] m-0">
            Didn&apos;t receive a code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0}
              className={`bg-transparent border-none font-inter font-normal text-xs sm:text-sm ${
                resendTimer > 0 
                  ? 'text-[#808080] cursor-not-allowed no-underline' 
                  : 'text-[#61CB08] hover:text-[#028C08] underline cursor-pointer'
              }`}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend now'}
            </button>
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <NumberVerifiedModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
      />
    </div>
  );
}


