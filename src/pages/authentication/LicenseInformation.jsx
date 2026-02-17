import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { uploadDriverDocuments } from '../../redux/slices/auth.slice';
import { X } from 'lucide-react';
import Cookies from 'js-cookie';
import { ErrorToast } from '../../components/global/Toaster';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { markStepCompleted, STEPS, arePreviousStepsCompleted, clearAllSteps, isStepCompleted, getFirstIncompleteStep } from '../../utils/stepValidation';

const LicenseInformation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, stepToComplete, isLoading } = useSelector((state) => state.auth);
  const formData = location.state?.formData || {};

  console.log(user,"d")

  const [licenseData, setLicenseData] = useState({
    licenseNumber: '',
    expiryDate: ''
  });
  const [frontImage, setFrontImage] = useState(null);
  const [frontImagePreview, setFrontImagePreview] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [backImagePreview, setBackImagePreview] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLicenseInputChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow numbers for license number field and limit to 9 digits
    if (name === 'licenseNumber') {
      const numericValue = value.replace(/[^a-zA-Z0-9]/g, ''); // Remove all non-digit characters
      const limitedValue = numericValue.slice(0, 9); // Limit to 9 digits
      setLicenseData(prev => ({
        ...prev,
        [name]: limitedValue
      }));
    } else {
      setLicenseData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFrontImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrontImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFrontImage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setFrontImage(null);
    setFrontImagePreview(null);
    // Reset file input
    const input = document.getElementById('front-image-upload');
    if (input) {
      input.value = '';
    }
  };

  const handleRemoveBackImage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setBackImage(null);
    setBackImagePreview(null);
    // Reset file input
    const input = document.getElementById('back-image-upload');
    if (input) {
      input.value = '';
    }
  };

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

  const handleNext = async () => {
    // Validate license information
    if (!frontImage || !backImage || !licenseData.licenseNumber.trim() || !licenseData.expiryDate) {
      ErrorToast('All fields are required');
      return;
    }
    
    // Check if user data exists
    if (!user || !user._id) {
      ErrorToast('User data not found. Please login again.');
      navigate('/signup');
      return;
    }
    
    try {
      // Prepare files array (front image at index 0, back image at index 1)
      const files = [frontImage, backImage];
      
      // Dispatch upload driver documents action
      await dispatch(
        uploadDriverDocuments({
          driverId: user._id,
          files: files,
          expiryDate: licenseData.expiryDate,
          licenseNumber: licenseData.licenseNumber.trim(),
          step: 1,
        })
      ).unwrap();
      
      // Mark step 2 as completed
      markStepCompleted(STEPS.LICENSE_INFORMATION);
      
      // If we reach here, API call was successful, redirect to vehicle-details page
      navigate('/vehicle-details', { 
        state: { 
          formData, 
          licenseData: {
            ...licenseData,
            frontImage,
            backImage
          }
        } 
      });
    } catch (error) {
      // Error is already handled in the slice with ErrorToast
      console.error('Upload documents error:', error);
    }
  };

  // Redirect logic: Check step validation and user authentication
  React.useEffect(() => {
    // Priority 1: If user is null, redirect to signup immediately
    if (!user) {
      navigate('/signup');
      return;
    }
    
    // Priority 2: If stepToComplete is "driverLicense", allow access directly
    // This handles the case where API returns stepToComplete: "driverLicense"
    if (stepToComplete === "driverLicense") {
      // Allow access if stepToComplete is driverLicense
      return;
    }
    
    // Priority 3: If we have formData from previous step (Signup), allow access
    // This handles navigation after successful step completion
    if (formData && Object.keys(formData).length > 0) {
      // Coming from previous step with data, allow access
      return;
    }
    
    // Priority 4: If this step is already completed, redirect to next incomplete step
    if (isStepCompleted(STEPS.LICENSE_INFORMATION)) {
      navigate(getFirstIncompleteStep());
      return;
    }
    
    // Priority 5: Check if previous step (Step 1: Signup) is completed
    if (!arePreviousStepsCompleted(STEPS.LICENSE_INFORMATION)) {
      navigate('/signup');
      return;
    }
    
    // If user exists but stepToComplete is different, allow access (might be navigating after API call)
    if (user) {
      return;
    }
  }, [user, stepToComplete, formData, navigate]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={2} />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center md:justify-end overflow-y-auto max-h-[50em] pt-20 md:pt-0">
        <div
          className="w-full max-w-[calc(100%-2rem)] md:!w-[75em] flex flex-col items-center justify-center md:pr-[0em] py-6 md:py-8 px-4 md:px-0"
        >
          {/* Header */}
          <div className="text-center mb-5 md:mb-6">
            <h1
              className="font-semibold mb-2 leading-tight text-xl md:text-[28px]"
              style={{
                fontFamily: 'Poppins',
                color: '#FFFFFF',
                letterSpacing: '-0.5px'
              }}
            >
             Upload Drivers License
            </h1>
            <p
              className="leading-tight text-xs md:text-sm"
              style={{
                fontFamily: 'Poppins',
                color: '#E6E6E6',
                fontWeight: 400
              }}
            >
              Please enter your license details to continue.
            </p>
          </div>

          {/* Form Container */}
          <div className="w-full max-w-md space-y-3 md:space-y-4 md:pr-2">
            {/* Upload Front Image */}
            <div className="space-y-1.5 md:space-y-2">
              <label
                className="block font-semibold text-xs md:text-[13px]"
                style={{
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Upload Front image
              </label>
              <label
                htmlFor="front-image-upload"
                className="flex flex-col items-center justify-center relative cursor-pointer py-4 md:py-5 px-2.5 md:px-3 min-h-[90px] md:min-h-[110px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: '2px dashed #61CB08',
                  backdropFilter: 'blur(42px)',
                  borderRadius: '10px'
                }}
              >
                {frontImagePreview ? (
                  <>
                    <img
                      src={frontImagePreview}
                      alt="Front license preview"
                      className="w-full h-full object-contain rounded-lg max-h-[100px] md:max-h-[140px]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFrontImage}
                      className="absolute top-1.5 right-1.5 md:top-2 md:right-2 p-1 md:p-1.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors z-10"
                      style={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <X size={14} color="#FFFFFF" strokeWidth={2.5} className="md:w-4 md:h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-0.5 md:gap-1">
                    <p
                      className="text-[10px] md:text-xs"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#FFFFFF',
                        fontWeight: 400
                      }}
                    >
                      Upload "document name"
                    </p>
                    <p
                      className="text-[9px] md:text-[11px]"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#808080',
                        fontWeight: 400
                      }}
                    >
                      Upto 20mbs JPG, PNG
                    </p>
                  </div>
                )}
                <input
                  id="front-image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFrontImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Upload Back Image */}
            <div className="space-y-1.5 md:space-y-2">
              <label
                className="block font-semibold text-xs md:text-[13px]"
                style={{
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Upload back image
              </label>
              <label
                htmlFor="back-image-upload"
                className="flex flex-col items-center justify-center relative cursor-pointer py-4 md:py-5 px-2.5 md:px-3 min-h-[90px] md:min-h-[110px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: '2px dashed #61CB08',
                  backdropFilter: 'blur(42px)',
                  borderRadius: '10px'
                }}
              >
                {backImagePreview ? (
                  <>
                    <img
                      src={backImagePreview}
                      alt="Back license preview"
                      className="w-full h-full object-contain rounded-lg max-h-[100px] md:max-h-[140px]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveBackImage}
                      className="absolute top-1.5 right-1.5 md:top-2 md:right-2 p-1 md:p-1.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors z-10"
                      style={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <X size={14} color="#FFFFFF" strokeWidth={2.5} className="md:w-4 md:h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-0.5 md:gap-1">
                    <p
                      className="text-[10px] md:text-xs"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#FFFFFF',
                        fontWeight: 400
                      }}
                    >
                      Upload "document name"
                    </p>
                    <p
                      className="text-[9px] md:text-[11px]"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#808080',
                        fontWeight: 400
                      }}
                    >
                      Upto 20mbs JPG, PNG
                    </p>
                  </div>
                )}
                <input
                  id="back-image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleBackImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Expiry Date Field */}
            <div>
              <label
                className="block mb-1.5 font-semibold"
                style={{
                  fontSize: '13px',
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={licenseData.expiryDate}
                onChange={handleLicenseInputChange}
                placeholder="Enter your date"
                className="w-full px-3 py-2.5 rounded-lg outline-none placeholder:text-[#808080]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  backdropFilter: 'blur(42px)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  fontSize: '13px',
                  fontFamily: 'Poppins',
                  color: '#FFFFFF'
                }}
              />
            </div>

            {/* License Number Field */}
            <div>
              <label
                className="block mb-1.5 font-semibold"
                style={{
                  fontSize: '13px',
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                License Number
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={licenseData.licenseNumber}
                onChange={handleLicenseInputChange}
                placeholder="Enter your license number"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={9}
                className="w-full px-3 py-2.5 rounded-lg outline-none placeholder:text-[#808080]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  backdropFilter: 'blur(42px)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  fontSize: '13px',
                  fontFamily: 'Poppins',
                  color: licenseData.licenseNumber ? '#FFFFFF' : '#808080'
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg font-semibold transition-colors duration-200 disabled:cursor-not-allowed"
                style={{
                  background: isLoading ? '#61CB0866' : '#61CB08',
                  color: '#000B00',
                  fontSize: '13px',
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
                {isLoading ? 'Uploading...' : 'Next'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 rounded-lg font-semibold transition-colors duration-200"
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

export default LicenseInformation;

