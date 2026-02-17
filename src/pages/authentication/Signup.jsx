import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { onboard } from '../../redux/slices/auth.slice';
import { Plus } from 'lucide-react';
import Cookies from 'js-cookie';
import flagUs from '../../assets/login/flag-us-3310bc.png';
import { ErrorToast } from '../../components/global/Toaster';
import TermsAndConditionsModal from '../../components/global/TermsAndConditionsModal';
import PrivacyPolicyModal from '../../components/global/PrivacyPolicyModal';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { markStepCompleted, STEPS, clearAllSteps } from '../../utils/stepValidation';

const SignupPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, phone } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const {user} = useSelector((state)=>state.auth);

  console.log(user,"userprofiledata")


  // Format phone number as (123) 456-7890
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

  // Check if phone number is verified (stored in localStorage)
  React.useEffect(() => {
    const verifiedPhone = localStorage.getItem('verifiedPhone');
    
    // If no verified phone number in localStorage, redirect to home page
    if (!verifiedPhone) {
      navigate('/');
      return;
    }
  }, [navigate]);

  // Auto-fill phone number from Redux state on component mount
  React.useEffect(() => {
    if (phone) {
      // Get raw phone number (digits only) from Redux state
      const rawPhone = phone.replace(/\D/g, '');
      // Format it and set in formData
      const formatted = formatPhoneNumber(rawPhone);
      setFormData(prev => ({
        ...prev,
        phone: formatted
      }));
    }
  }, [phone]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Prevent editing phone number if it's from Redux state
    if (name === 'phone' && phone) {
      return; // Don't allow editing if phone is from Redux
    }
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    // Get raw phone number (digits only) for validation
    const rawPhone = formData.phone.replace(/\D/g, '');

    // Validate all required fields
    if (!formData.name.trim() || !formData.email.trim() || rawPhone.length !== 10) {
      ErrorToast('All fields are required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      ErrorToast('Please enter a valid email address');
      return;
    }

    try {
      // Dispatch onboard action with form data
      const result = await dispatch(
        onboard({
          role: 'driver',
          file: profilePicture,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone,
        })
      ).unwrap();
      
      // If onboarding successful, mark step 1 as completed and navigate to License Information page
      if (result?.message) {
        markStepCompleted(STEPS.SIGNUP);
        navigate('/license-information', { state: { formData } });
      }
    } catch (error) {
      // Error is already handled in the slice with ErrorToast
      console.error('Onboarding error:', error);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={1} />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center md:justify-end pt-20 md:pt-0">
        <div
          className="w-full max-w-[calc(100%-2rem)] md:!w-[75em] flex flex-col items-center justify-center md:pr-[0em] px-4 md:px-0"

        >
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h1
              className="font-semibold mb-3 md:mb-4 leading-tight text-2xl md:text-[39px]"
              style={{
                fontFamily: 'Poppins',
                color: '#FFFFFF',
                letterSpacing: '-0.5px'
              }}
            >
              Create Profile
            </h1>
            <p
              className="leading-tight text-sm md:text-base"
              style={{
                fontFamily: 'Poppins',
                color: '#E6E6E6',
                fontWeight: 400
              }}
            >
              Please enter your details to continue.
            </p>
          </div>

          {/* Form Container */}
          <div className="w-full max-w-md space-y-4 md:space-y-6">
            {/* Upload Profile Picture */}
            <div className="flex flex-row items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <label
                htmlFor="profile-picture-upload"
                className="flex items-center justify-center relative cursor-pointer flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: '2px dashed #61CB08',
                  backdropFilter: 'blur(42px)',
                  borderRadius: '200px',
                  overflow: 'hidden'
                }}
              >
                {profilePicturePreview ? (
                  <img
                    src={profilePicturePreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Plus size={24} color="#61CB08" strokeWidth={1.2} className="md:w-8 md:h-8" />
                )}
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </label>
              <p
                className="font-medium text-center text-xs md:text-sm"
                style={{
                  fontFamily: 'Poppins',
                  color: '#F7F7FA'
                }}
              >
                Upload Profile Picture
              </p>
            </div>

            {/* Name Field */}
            <div>
              <label
                className="block mb-2 font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  backdropFilter: 'blur(42px)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  fontFamily: 'Poppins',
                  color: formData.name ? '#FFFFFF' : '#808080'
                }}
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                className="block mb-2 font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  backdropFilter: 'blur(42px)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  fontFamily: 'Poppins',
                  color: formData.email ? '#FFFFFF' : '#808080'
                }}
              />
            </div>

            {/* Phone Number Field */}
            <div>
              <label
                className="block mb-2 font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Phone Number
              </label>
              <div
                className="flex items-center rounded-xl overflow-hidden h-10 md:h-[44px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  backdropFilter: 'blur(42px)',
                  border: '1px solid rgba(97, 203, 8, 0.32)'
                }}
              >
                {/* Country Code */}
                <div
                  className="flex items-center px-2 md:px-3 gap-1.5 md:gap-2"
                  style={{
                    borderRight: '1px solid rgba(173, 173, 173, 0.5)'
                  }}
                >
                  <img
                    src={flagUs}
                    alt="US flag"
                    className="w-5 h-3.5 md:w-6 md:h-4 rounded-sm object-cover"
                  />
                  <span
                    className="text-xs md:text-sm"
                    style={{
                      fontFamily: 'Poppins',
                      color: '#FFFFFF',
                      fontWeight: 400
                    }}
                  >
                    +1
                  </span>
                </div>
                {/* Phone Input */}
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                  maxLength={14}
                  disabled={!!phone}
                  readOnly={!!phone}
                  className="flex-1 px-2 md:px-3 outline-none bg-transparent placeholder:text-[#a3a3a3] disabled:cursor-not-allowed text-xs md:text-sm"
                  style={{
                    fontFamily: 'Poppins',
                    color: formData.phone ? '#a3a3a3' : '#a3a3a3',
                    fontWeight: 400,
                    opacity: phone ? 0.7 : 1,
                    cursor: phone ? 'not-allowed' : 'text'
                  }}
                />
              </div>
            </div>

            {/* Next Button - Step 1 */}
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="w-full py-2.5 md:py-3 rounded-[14px] font-semibold mt-6 md:mt-8 transition-colors duration-200 disabled:cursor-not-allowed text-sm md:text-sm"
              style={{
                background: isLoading ? '#61CB0866' : '#61CB08',
                color: '#000B00',
                fontFamily: 'Poppins',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.background = '#028C08';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.background = '#61CB08';
                }
              }}
            >
              {isLoading ? 'Processing...' : 'Next'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-[14px] font-semibold transition-colors duration-200"
              style={{
                background: '#113D00',
                color: '#FFFFFF',
                fontSize: '13px',
                fontFamily: 'Poppins',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>

            {/* Terms Text */}
            <div
              className="text-center !mt-6 md:!mt-10 text-xs md:text-sm px-2"
              style={{
                fontFamily: 'Poppins',
                color: '#FFFFFF',
                fontWeight: 600
              }}
            >
              By registering, you accept our{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="hover:underline bg-transparent border-none cursor-pointer text-xs md:text-sm"
                style={{ color: '#61CB08', fontFamily: 'Poppins', fontWeight: 600 }}
              >
                Terms & conditions
              </button>
              {' '}and{' '}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="hover:underline bg-transparent border-none cursor-pointer text-xs md:text-sm"
                style={{ color: '#61CB08', fontFamily: 'Poppins', fontWeight: 600 }}
              >
                Privacy policy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default SignupPage;