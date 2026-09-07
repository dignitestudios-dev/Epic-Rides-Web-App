import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtp, setPhone } from '../../redux/slices/auth.slice';
import { loginbackgroundimage, logo } from '../../assets/export';
import flagUs from '../../assets/login/flag-us-3310bc.png';
import Cookies from 'js-cookie';

export default function EpicRidesLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading } = useSelector((state) => state.auth);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const referredByParam = searchParams.get('referredBy');
    if (referredByParam) {
      Cookies.set('referredBy', referredByParam, { expires: 30 });
    }
  }, [location.search]);

  // Format phone number as (123) 456-1234
  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) {
      return phoneNumber;
    } else if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Handle phone number input change
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  // Get raw phone number (digits only) for validation
  const getRawPhoneNumber = () => {
    return phoneNumber.replace(/\D/g, '');
  };

  // Check if phone number is valid (10 digits)
  const isValidPhoneNumber = () => {
    return getRawPhoneNumber().length === 10;
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    const rawPhone = getRawPhoneNumber();
    if (rawPhone.length === 10) {
      try {
        const phoneWithCountryCode = `1${rawPhone}`;
        
        // Dispatch send OTP action
        const result = await dispatch(
          sendOtp({ phone: phoneWithCountryCode, role: 'driver' })
        ).unwrap();
        
        // If OTP sent successfully, store phone in Redux and navigate to verification
        if (result?.phone) {
          dispatch(setPhone(phoneWithCountryCode));
          navigate('/verification', {
            state: { phoneNumber: phoneWithCountryCode, fromLogin: true },
          });
        }
      } catch (error) {
        // Error is already handled in the slice with ErrorToast
        console.error('Send OTP error:', error);
      }
    }
  };
  return (
    <div className="relative w-full min-h-screen overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start bg-black font-poppins py-8 px-4 sm:px-6 md:px-8">
      {/* Background Image */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${loginbackgroundimage})` }}
      />

      {/* Main Card */}
      <div 
        className="relative z-10 w-full max-w-[480px] my-auto bg-[rgba(239,239,239,0.1)] border-[0.8px] border-[#CACACA] backdrop-blur-[28.9px] rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col items-center shadow-2xl"
        style={{
          WebkitBackdropFilter: 'blur(28.9px)'
        }}
      >
        {/* Logo and Welcome */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 w-full mb-6 sm:mb-8 text-center">
          <img 
            src={logo} 
            alt="Epic Rides Logo" 
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain"
          />
          <h1 className="font-poppins font-semibold text-2xl sm:text-3xl md:text-[36px] leading-tight text-white m-0">
            Welcome!
          </h1>
          <p className="font-poppins font-normal text-sm sm:text-base text-[#E6E6E6] m-0">
            Please enter your details to sign up.
          </p>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleContinue}
          className="flex flex-col items-start gap-4 sm:gap-5 w-full max-w-[360px]"
        >
          <div className="flex flex-col items-start gap-2 w-full">
            <label className="font-poppins font-semibold text-xs sm:text-sm capitalize text-white m-0">
              Phone Number
            </label>

            <div className="flex flex-row items-center gap-2 w-full">
              {/* Country Code */}
              <div 
                className="w-[100px] sm:w-[110px] h-11 rounded-xl relative backdrop-blur-[42px] flex items-center justify-center gap-2 px-2 shrink-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  WebkitBackdropFilter: 'blur(42px)'
                }}
              >
                <img 
                  src={flagUs} 
                  alt="US flag" 
                  className="w-6 sm:w-7 h-4 rounded-sm object-cover"
                />
                <span className="font-poppins font-normal text-xs sm:text-sm text-white whitespace-nowrap">
                  +1
                </span>
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={handlePhoneChange}
                maxLength={14}
                className="flex-1 min-w-0 h-11 rounded-xl font-poppins font-normal text-xs sm:text-sm outline-none px-3 sm:px-4 backdrop-blur-[42px] placeholder:text-[#808080]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  color: phoneNumber ? '#FFFFFF' : '#808080',
                  WebkitBackdropFilter: 'blur(42px)'
                }}
              />
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={isLoading || !isValidPhoneNumber()}
            className="w-full h-11 sm:h-12 bg-[#61CB08] hover:bg-[#028C08] rounded-xl font-poppins font-semibold text-xs sm:text-sm capitalize text-[#000B00] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer mt-2"
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
