import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtp, setPhone } from '../../redux/slices/auth.slice';
import { loginbackgroundimage, logo } from '../../assets/export';
import flagUs from '../../assets/login/flag-us-3310bc.png';

export default function EpicRidesLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode] = useState('+1');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state) => state.auth);

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
        // Format phone number: remove country code if present, keep only digits
        const cleanPhone = rawPhone;
        // Add country code prefix if needed (for Pakistan: 0 prefix, for US: no prefix needed)
        const phoneWithCountryCode = countryCode === '+1' ? cleanPhone : cleanPhone;
        
        // Dispatch send OTP action
        const result = await dispatch(
          sendOtp({ phone: phoneWithCountryCode, role: 'driver' })
        ).unwrap();
        
        // If OTP sent successfully, store phone in Redux and navigate to verification
        if (result?.phone) {
          dispatch(setPhone(phoneWithCountryCode));
          navigate('/verification', { state: { phoneNumber: phoneWithCountryCode } });
        }
      } catch (error) {
        // Error is already handled in the slice with ErrorToast
        console.error('Send OTP error:', error);
      }
    }
  };
  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-white font-poppins py-4 px-4 sm:px-6 md:px-8 lg:py-0 lg:px-0">
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${loginbackgroundimage})` }}
      />

      {/* Main Card - Frame 1000005163 */}
      <div 
        className="box-border relative lg:absolute w-full max-w-[550px] min-h-[500px] sm:min-h-[600px] md:min-h-[676px] lg:w-[550px] lg:h-[676px] bg-[rgba(239,239,239,0.1)] border-[0.8px] border-[#CACACA] backdrop-blur-[28.9px] rounded-[15px] z-10 my-auto lg:my-0 lg:left-[calc(50%-275px)] lg:top-[calc(50%-338px)]"
        style={{
          WebkitBackdropFilter: 'blur(28.9px)'
        }}
      >
        {/* Frame 1000005151 - Card Content Container */}
        <div 
          className="flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 lg:p-0 gap-6 sm:gap-8 lg:gap-8 w-full box-border lg:absolute lg:w-[360px] lg:left-[calc(50%-180px)] lg:top-[106px]"
        >
          {/* Frame 1000005150 - Logo and Welcome Container */}
          <div className="flex flex-col justify-center items-center p-0 gap-3 sm:gap-4 lg:gap-4 w-full">
            {/* Frame 1000005149 - Inner Container */}
            <div className="flex flex-col justify-center items-center p-0 gap-6 sm:gap-8 md:gap-10 lg:gap-10 w-full">
              {/* Frame 1000005148 - Logo and Text */}
              <div className="flex flex-col justify-center items-center p-0 gap-3 sm:gap-4 lg:gap-4 w-full">
                {/* Group - Logo */}
                <img 
                  src={logo} 
                  alt="Epic Rides Logo" 
                  className="w-24 h-24 sm:w-32 sm:h-32 md:w-[144.31px] md:h-[139.78px] lg:w-[144.31px] lg:h-[139.78px] object-contain"
                />

                {/* Welcome Back */}
                <h1 className="w-full font-poppins font-semibold text-2xl sm:text-3xl md:text-[39px] lg:text-[39px] leading-[120%] text-center text-white m-0">
                 Welcome!
                </h1>

                {/* Please enter your details to log in. */}
                <p className="w-full max-w-[375.75px] lg:w-[375.75px] font-poppins font-normal text-sm sm:text-base lg:text-base leading-[120%] text-center text-[#E6E6E6] m-0 px-2 lg:px-0">
                  Please enter your details to sign up.
                </p>
              </div>
            </div>
          </div>

          {/* Frame 1000005106 - Form Container */}
          <form 
            onSubmit={handleContinue}
            className="flex flex-col items-start p-0 gap-4 sm:gap-6 lg:gap-6 w-full"
          >
            {/* Input-field */}
            <div className="flex flex-col items-start p-0 gap-2 w-full">
              {/* Phone Number Label */}
              <label className="w-full font-poppins font-semibold text-xs sm:text-sm lg:text-sm leading-[120%] capitalize text-white m-0">
                Phone Number
              </label>

              {/* Frame 1000005146 */}
              <div className="flex flex-col items-center p-0 gap-4 sm:gap-6 lg:gap-6 w-full">
                {/* Frame 1000005111 */}
                <div className="flex flex-col items-start p-0 gap-4 w-full">
                  {/* Phone number input */}
                  <div className="flex flex-row items-center p-0 gap-2 w-full lg:w-[343px]">
                    {/* Frame 1000009288 - Country Code */}
                    <div 
                      className="box-border w-[100px] sm:w-[112px] lg:w-[112px] h-10 sm:h-11 lg:h-11 rounded-xl flex-none relative backdrop-blur-[42px] flex items-center justify-center lg:flex lg:items-center lg:justify-center"
                      style={{
                        background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                        WebkitBackdropFilter: 'blur(42px)'
                      }}
                    >
                      {/* Frame 1000009290 */}
                      <div 
                        className="flex flex-row items-center p-0 gap-1.5 sm:gap-2 lg:gap-2 lg:absolute lg:w-[59px] lg:h-[22px] lg:left-[calc(50%-29.5px)] lg:top-[11px]"
                      >
                        {/* Frame 1000009289 */}
                        <div className="flex flex-row items-center p-0 gap-1.5 sm:gap-2 lg:gap-2 lg:w-[59px] lg:h-[22px]">
                          {/* image 998 - Flag */}
                          <img 
                            src={flagUs} 
                            alt="US flag" 
                            className="w-7 h-5 sm:w-9 sm:h-[22px] lg:w-9 lg:h-[22px] rounded-sm object-cover"
                          />
                          {/* +1 */}
                          <span className="font-poppins font-normal text-xs sm:text-sm lg:text-sm leading-[120%] text-white whitespace-nowrap lg:w-[15px] lg:h-[17px]">
                            +1
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Frame 1000009289 - Phone Input */}
                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      maxLength={14}
                      className="box-border flex-1 min-w-0 lg:flex-none lg:w-[223px] h-10 sm:h-11 lg:h-11 rounded-xl font-poppins font-normal text-xs sm:text-sm lg:text-sm leading-[120%] border-none outline-none px-3 sm:px-4 lg:px-4 backdrop-blur-[42px]"
                      style={{
                        background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                        color: phoneNumber ? '#FFFFFF' : '#808080',
                        WebkitBackdropFilter: 'blur(42px)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Frame 1000005107 - Continue Button */}
            <button
              type="submit"
              disabled={isLoading || !isValidPhoneNumber()}
              className="w-full lg:w-[343px] h-11 sm:h-12 lg:h-12 bg-[#61CB08] rounded-[14px] flex-none border-none relative transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center lg:flex lg:items-center lg:justify-center"
              style={{
                opacity: isLoading || !isValidPhoneNumber() ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading && isValidPhoneNumber()) {
                  e.target.style.background = '#028C08';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && isValidPhoneNumber()) {
                  e.target.style.background = '#61CB08';
                }
              }}
            >
              {/* primary - Button Text */}
              <span
                className="font-poppins font-semibold text-xs sm:text-sm lg:text-sm leading-[120%] text-center capitalize text-[#000B00] whitespace-nowrap px-2 lg:px-0 lg:absolute lg:w-[211px] lg:h-[17px] lg:left-[calc(50%-105.5px+1px)] lg:top-[calc(50%-8.5px)]"
              >
                {isLoading ? 'Processing...' : 'Continue with Phone Number'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
