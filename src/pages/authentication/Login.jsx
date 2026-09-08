import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtp, setPhone } from '../../redux/slices/auth.slice';
import { loginbackgroundimage, logo } from '../../assets/export';
import CountryCodePicker from '../../components/global/CountryCodePicker';
import {
  DEFAULT_COUNTRY,
  formatPhoneByCountry,
  getCountryPhonePlaceholder,
  getCountryMaxDigits,
  getCountryMaxFormattedLength,
} from '../../data/countries';
import Cookies from 'js-cookie';
import { resolvePostLoginRoute } from '../../utils/onboardingRedirect';

export default function EpicRidesLogin() {
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isLoading,
    token,
    user,
    accountStatus,
    stepToComplete,
    rejectedDocuments,
    pendingDocuments,
    isOnboarded,
    isAccountStatusInitialized,
  } = useSelector((state) => state.auth);
  const cookieToken = Cookies.get('token');

  React.useEffect(() => {
    if ((token || cookieToken) && isAccountStatusInitialized && user) {
      const { path, state } = resolvePostLoginRoute({
        user,
        accountStatus,
        isOnboarded,
        stepToComplete,
        rejectedDocuments,
        pendingDocuments,
      });
      navigate(path, { replace: true, state });
    }
  }, [
    token,
    cookieToken,
    isAccountStatusInitialized,
    user,
    accountStatus,
    isOnboarded,
    stepToComplete,
    rejectedDocuments,
    pendingDocuments,
    navigate,
  ]);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const referredByParam = searchParams.get('referredBy');
    if (referredByParam) {
      Cookies.set('referredBy', referredByParam, { expires: 30 });
    }
  }, [location.search]);

  // Handle phone number input change with strict per-country mask formatting
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneByCountry(e.target.value, selectedCountry);
    setPhoneNumber(formatted);
  };

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    if (phoneNumber) {
      setPhoneNumber(formatPhoneByCountry(phoneNumber, country));
    }
  };

  // Get raw phone number (digits only) for validation
  const getRawPhoneNumber = () => {
    return phoneNumber.replace(/\D/g, '');
  };

  // Check if phone number is valid (matches required digits for selected country)
  const isValidPhoneNumber = () => {
    const raw = getRawPhoneNumber();
    const maxDigits = getCountryMaxDigits(selectedCountry);
    return raw.length === maxDigits;
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    const rawPhone = getRawPhoneNumber();
    if (isValidPhoneNumber()) {
      try {
        const cleanDialCode = selectedCountry.dialCode.replace(/\D/g, '');
        const phoneWithCountryCode = `${cleanDialCode}${rawPhone}`;
        
        // Dispatch send OTP action
        const result = await dispatch(
          sendOtp({ phone: phoneWithCountryCode, role: 'driver' })
        ).unwrap();
        
        // If OTP sent successfully, store phone in Redux and navigate to verification
        if (result?.phone) {
          dispatch(setPhone(phoneWithCountryCode));
          navigate('/verification', {
            state: {
              phoneNumber: phoneWithCountryCode,
              selectedCountry,
              fromLogin: true,
            },
          });
        }
      } catch (error) {
        // Error is already handled in the slice with ErrorToast
        console.error('Send OTP error:', error);
      }
    }
  };
  return (
    <div className="relative w-full min-h-screen overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start bg-black font-poppins py-8 px-4 sm:px-6 md:px-8 custom-scrollbar">
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
              {/* Country Code Picker */}
              <CountryCodePicker
                selectedCountry={selectedCountry}
                onSelectCountry={handleCountryChange}
              />

              {/* Phone Input */}
              <input
                type="tel"
                placeholder={getCountryPhonePlaceholder(selectedCountry)}
                value={phoneNumber}
                onChange={handlePhoneChange}
                maxLength={getCountryMaxFormattedLength(selectedCountry)}
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
