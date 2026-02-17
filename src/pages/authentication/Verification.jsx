import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp, sendOtp } from '../../redux/slices/auth.slice';
import { loginbackgroundimage } from '../../assets/export';
import { SuccessToast } from '../../components/global/Toaster';
import NumberVerifiedModal from '../../components/global/NumberVerifiedModal';

export default function Verification() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isLoading, phone } = useSelector((state) => state.auth);
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits OTP
  const [resendTimer, setResendTimer] = useState(10); // Start with 10 seconds
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const otpInputRefs = useRef([]);

  // Get phone number from Redux state or location state
  const phoneNumber = phone || location.state?.phoneNumber || '';
  
  // Get masked phone number for display
  const getMaskedPhoneNumber = () => {
    const raw = phoneNumber.replace(/\D/g, '');
    if (raw.length === 10) {
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
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length === 6 && phoneNumber) {
      try {
        // Get clean phone number (digits only)
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        
        // Dispatch verify OTP action
        const result = await dispatch(
          verifyOtp({ phone: cleanPhone, otp: otpString, role: 'driver' })
        ).unwrap();
        
        // Debug: Log the result to check what we're getting
        console.log('Verify OTP Result:', result);
        console.log('stepToComplete:', result?.stepToComplete);
        console.log('user:', result?.user);
        
        // If verification successful, check stepToComplete and user data
        if (result?.message) {
          // Store phone number in localStorage after successful verification
          if (cleanPhone) {
            localStorage.setItem('verifiedPhone', cleanPhone);
          }
          
          // Get stepToComplete without trim if null/undefined
          const stepToCompleteRaw = result?.stepToComplete;
          const stepToComplete = stepToCompleteRaw ? stepToCompleteRaw.trim() : stepToCompleteRaw;
          const userData = result?.user;
          const rejectedDocuments = result?.rejectedDocuments || [];
          
          // Debug logs
          console.log('=== Verify OTP Response ===');
          console.log('stepToComplete (raw):', stepToCompleteRaw);
          console.log('stepToComplete (processed):', stepToComplete);
          console.log('rejectedDocuments:', rejectedDocuments);
          console.log('userData:', userData);
          
          // PRIORITY: If rejectedDocuments exist, redirect to verified-account first
          if (rejectedDocuments && rejectedDocuments.length > 0) {
            console.log('✅ Redirecting to /verified-account (rejectedDocuments found)');
            navigate('/verified-account', {
              state: {
                status: 'rejected'
              }
            });
            return;
          }
          
          // Check stepToComplete and redirect accordingly
          if (userData) {
            // Check if stepToComplete is null, undefined, or empty string
            if (stepToComplete === null || stepToComplete === undefined || stepToComplete === "" || !stepToComplete) {
              // If stepToComplete is null/empty, redirect to verified account
              console.log('✅ Redirecting to /verified-account (stepToComplete is null/empty)');
              navigate('/verified-account');
              return;
            }
            
            if (stepToComplete === "driverLicense") {
              // Redirect to license information page
              console.log('✅ Redirecting to /license-information');
              navigate('/license-information');
              return;
            } else if (stepToComplete === "vehicleRegistration") {
              // Redirect to vehicle details page
              console.log('✅ Redirecting to /vehicle-details');
              navigate('/vehicle-details');
              return;
            } else if (stepToComplete === "insurance") {
              // Redirect to insurance information page
              console.log('✅ Redirecting to /insurance-information');
              navigate('/insurance-information');
              return;
            } else if (stepToComplete === "vehicleDetails") {
              // Redirect to add vehicle details page
              console.log('✅ Redirecting to /add-vehicle-details');
              navigate('/add-vehicle-details');
              return;
            }
          }
          
          // If user data is null, redirect to signup
          if (!userData) {
            console.log('❌ Redirecting to /signup');
            navigate('/signup');
            return;
          }
          
          // Fallback: If user exists but stepToComplete is null/empty, redirect to verified account
          if (stepToComplete === null || stepToComplete === undefined || stepToComplete === "" || !stepToComplete) {
            console.log('✅ Redirecting to /verified-account (fallback - stepToComplete is null/empty)');
            navigate('/verified-account');
            return;
          }
          
          // If we reach here and no condition matched, show success modal
          console.log('⚠️ No matching condition, showing success modal');
          setShowSuccessModal(true);
        }
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
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      await dispatch(sendOtp({ phone: cleanPhone, role: 'driver' })).unwrap();
      setOtp(['', '', '', '', '', '']); // Clear OTP inputs
      setResendTimer(30); // Set timer to 30 seconds after resend
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

  // Redirect to login if no phone number
  useEffect(() => {
    if (!phoneNumber) {
      navigate('/');
    }
  }, [phoneNumber, navigate]);

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

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-white font-poppins">
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${loginbackgroundimage})` }}
      />

      {/* Main Card - Frame 1000005163 */}
      <div 
        className="box-border absolute w-[550px] h-[402px] bg-[rgba(239,239,239,0.1)] border-[0.8px] border-[#CACACA] backdrop-blur-[28.9px] rounded-[15px] max-w-[calc(100%-40px)] min-w-[320px] z-10 md:left-[calc(50%-550px/2)] md:top-[calc(50%-402px/2)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 md:w-[550px] md:h-[402px] w-[calc(100%-2rem)] h-auto py-6 px-4"
        style={{
          WebkitBackdropFilter: 'blur(28.9px)'
        }}
      >
        {/* Frame 1000005152 - Card Content Container */}
        <div 
          className="flex flex-col justify-center items-center p-0 gap-4 md:gap-8 w-full box-border md:absolute md:left-[47px] md:top-[47.5px] md:max-w-[calc(100%-94px)] relative"
        >
          {/* Frame 1000005106 - Main Content */}
          <div className="flex flex-col justify-center items-center p-0 gap-4 md:gap-6 w-full">
            {/* Frame 1000005154 - Header Section */}
            <div className="flex flex-col justify-center items-center p-0 gap-4 md:gap-8 w-full">
              {/* Frame 1000005152 - Text Section */}
              <div className="flex flex-col self-stretch gap-2 md:gap-4 w-full">
                {/* Verification */}
                <h1 className="w-full font-poppins font-semibold text-2xl md:text-[39px] leading-[120%] text-center text-white m-0">
                  Verification
                </h1>

                {/* Please enter OTP sent to *** *** *890 */}
                <p className="w-full font-poppins font-normal text-sm md:text-base leading-[120%] text-center text-[#E6E6E6] m-0 px-2">
                  Please enter OTP sent to {getMaskedPhoneNumber()}
                </p>
              </div>

              {/* Frame 1000005153 - OTP Input Container */}
              <div className="flex flex-row items-center justify-center self-stretch gap-2 md:gap-3 w-full px-2">
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
                    className="box-border w-[2.5em] h-[2.5em] md:w-[2.7em] md:h-[2.7em] rounded-xl flex-none font-poppins font-semibold text-lg md:text-2xl leading-[120%] text-center text-white border-none outline-none backdrop-blur-[42px]"
                    style={{
                      background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%), linear-gradient(180deg, rgba(37, 37, 37, 1) 0%, rgba(15, 15, 15, 1) 100%)',
                      border: '1px solid rgba(97, 203, 8, 0.32)',
                      WebkitBackdropFilter: 'blur(42px)'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Call to action - Verify Button */}
            <button
              type="button"
              onClick={handleVerify}
              disabled={isLoading || otp.join('').length !== 6}
              className="w-full md:w-[360px] max-w-full h-11 bg-[#61CB08] rounded-[14px] flex-none border-none relative transition-colors duration-200 disabled:cursor-not-allowed"
              style={{
                opacity: isLoading || otp.join('').length !== 6 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading && otp.join('').length === 6) {
                  e.target.style.background = '#028C08';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && otp.join('').length === 6) {
                  e.target.style.background = '#61CB08';
                }
              }}
            >
              {/* Verify Text */}
              <span
                className="absolute font-poppins font-semibold text-sm leading-[120%] text-center capitalize text-[#000B00]"
                style={{
                  width: '42px',
                  height: '17px',
                  left: 'calc(50% - 42px/2)',
                  top: 'calc(50% - 17px/2)'
                }}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </span>
            </button>

            {/* Didn't receive code? Resend now */}
            <p className="w-full md:w-[456px] max-w-full font-inter font-normal text-xs md:text-sm leading-[121%] text-center text-[#808080] m-0 px-4">
              Didn't receive code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0}
                className={`bg-transparent border-none font-inter font-normal text-xs md:text-sm ${
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
      </div>

      {/* Success Modal */}
      <NumberVerifiedModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
      />
    </div>
  );
}


