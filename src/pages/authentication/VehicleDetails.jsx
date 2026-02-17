import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { uploadVehicleRegistrationDocuments } from '../../redux/slices/auth.slice';
import { X } from 'lucide-react';
import Cookies from 'js-cookie';
import { ErrorToast } from '../../components/global/Toaster';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { barone } from '../../assets/export';
import { markStepCompleted, STEPS, arePreviousStepsCompleted, getFirstIncompleteStep, clearAllSteps, isStepCompleted } from '../../utils/stepValidation';

const VehicleDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, stepToComplete, isLoading } = useSelector((state) => state.auth);
  const formData = location.state?.formData || {};
  const licenseData = location.state?.licenseData || {};

  const [frontImage, setFrontImage] = useState(null);
  const [frontImagePreview, setFrontImagePreview] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [backImagePreview, setBackImagePreview] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Field-level error states
  const [fieldErrors, setFieldErrors] = useState({
    frontImage: '',
    backImage: ''
  });

  console.log(user,"user====")

  const handleFrontImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        ErrorToast('Image size should not exceed 5MB');
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedExtensions = ['png', 'jpg', 'jpeg'];

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        ErrorToast('Please upload a valid image format (PNG, JPG, JPEG)');
        e.target.value = '';
        return;
      }

      setFrontImage(file);
      // Clear error
      setFieldErrors(prev => ({
        ...prev,
        frontImage: ''
      }));
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
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        ErrorToast('Image size should not exceed 5MB');
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedExtensions = ['png', 'jpg', 'jpeg'];

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        ErrorToast('Please upload a valid image format (PNG, JPG, JPEG)');
        e.target.value = '';
        return;
      }

      setBackImage(file);
      // Clear error
      setFieldErrors(prev => ({
        ...prev,
        backImage: ''
      }));
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
    setFieldErrors(prev => ({
      ...prev,
      frontImage: 'This field is required'
    }));
    // Reset file input
    const input = document.getElementById('vehicle-front-image-upload');
    if (input) {
      input.value = '';
    }
  };

  const handleRemoveBackImage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setBackImage(null);
    setBackImagePreview(null);
    setFieldErrors(prev => ({
      ...prev,
      backImage: 'This field is required'
    }));
    // Reset file input
    const input = document.getElementById('vehicle-back-image-upload');
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
    // Validate images
    let isFrontImageValid = true;
    let isBackImageValid = true;
    
    if (!frontImage) {
      setFieldErrors(prev => ({
        ...prev,
        frontImage: 'This field is required'
      }));
      isFrontImageValid = false;
    }
    
    if (!backImage) {
      setFieldErrors(prev => ({
        ...prev,
        backImage: 'This field is required'
      }));
      isBackImageValid = false;
    }

    if (!isFrontImageValid || !isBackImageValid) {
      ErrorToast('Please upload both front and back images');
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
      
      // Dispatch upload vehicle registration documents action
      const result = await dispatch(
        uploadVehicleRegistrationDocuments({
          driverId: user._id,
          files: files,
          step: 2,
        })
      ).unwrap();
      
      // Mark step 3 as completed
      markStepCompleted(STEPS.VEHICLE_DETAILS);
      
      const fromVerified = location.state?.fromVerifiedAccount;
      const rejectedFlow = location.state?.rejectedFlow;
      const currentIndex = location.state?.currentIndex ?? 0;
      
      if (fromVerified && Array.isArray(rejectedFlow) && rejectedFlow.length > 0) {
        const nextIndex = currentIndex + 1;
        const routeMap = {
          driverLicense: '/license-information',
          vehicleRegistration: '/vehicle-details',
          insurance: '/insurance-information',
          vehicleDetails: '/add-vehicle-details',
        };
        
        if (nextIndex < rejectedFlow.length) {
          const nextKey = rejectedFlow[nextIndex];
          const nextRoute = routeMap[nextKey] || '/verified-account';
          navigate(nextRoute, {
            state: {
              formData,
              licenseData,
              vehicleData: { frontImage, backImage },
              rejectedFlow,
              currentIndex: nextIndex,
              fromVerifiedAccount: true,
            },
          });
          return;
        }
        
        // No more rejected steps, go back to verified-account
        navigate('/verified-account', { 
          state: { 
            formData, 
            licenseData,
            vehicleData: { frontImage, backImage },
            status: 'submitted',
          } 
        });
        return;
      }

      // Normal flow: navigate to Insurance Information page
      if (result?.message) {
        navigate('/insurance-information', { 
          state: { 
            formData, 
            licenseData,
            vehicleData: { frontImage, backImage }
          } 
        });
      }
    } catch (error) {
      // Error is already handled in the slice with ErrorToast
      console.error('Upload vehicle registration error:', error);
    }
  };

  const handleBack = () => {
    // Check if previous step (License Information) is completed
    // If completed, don't allow going back - stay on current step
    if (isStepCompleted(STEPS.LICENSE_INFORMATION)) {
      // Previous step is completed, don't allow going back
      ErrorToast('You cannot go back to completed steps');
      return;
    }
    // If not completed, allow navigation back
    navigate('/license-information', { state: { formData } });
  };

  // Redirect logic: Check step validation and user authentication
  React.useEffect(() => {
    // Priority 1: If user is null, redirect to signup immediately
    if (!user) {
      navigate('/signup');
      return;
    }

    // Priority 2: If stepToComplete is "vehicleRegistration", allow access directly
    // This handles the case where API returns stepToComplete: "vehicleRegistration"
    if (stepToComplete === "vehicleRegistration") {
      // Allow access if stepToComplete is vehicleRegistration
      return;
    }

    // Priority 3: If we have formData or licenseData from previous step, allow access
    // This handles navigation after successful step completion
    if (formData && Object.keys(formData).length > 0) {
      // Coming from previous step with data, allow access
      return;
    }

    // Priority 4: If this step is already completed, redirect to next incomplete step
    if (isStepCompleted(STEPS.VEHICLE_DETAILS)) {
      navigate(getFirstIncompleteStep());
      return;
    }

    // Priority 5: Check if previous steps (Step 1 & 2) are completed
    if (!arePreviousStepsCompleted(STEPS.VEHICLE_DETAILS)) {
      // Redirect to first incomplete step
      navigate(getFirstIncompleteStep());
      return;
    }

    // If user exists, allow access (might be navigating after license upload)
    if (user) {
      return;
    }
  }, [user, stepToComplete, formData, navigate]);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={3} />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center md:justify-end overflow-y-auto pt-20 md:pt-0 pb-10">
        <div className="w-full max-w-[calc(100%-2rem)] md:max-w-[75rem] flex flex-col items-center justify-center md:pr-0 py-6 md:py-8 px-4 md:px-8">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8 w-full">
            <h1
              className="font-semibold mb-3 md:mb-4 leading-tight text-xl md:text-3xl lg:text-4xl"
              style={{
                fontFamily: 'Poppins',
                color: '#FFFFFF',
                letterSpacing: '-0.5px'
              }}
            >
              Upload Vehicle Registration
            </h1>
            <div className='flex justify-center items-center pt-2 md:pt-3'>
              <img src={barone} alt="Vehicle" className='w-32 md:w-48 lg:w-56 h-auto' />
            </div>
          </div>

          {/* Form Container */}
          <div className="w-full max-w-[30em] space-y-4 md:space-y-6">
            {/* Upload Front Image */}
            <div className="space-y-2">
              <label
                className="block font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Upload  Front image
              </label>
              <label
                htmlFor="vehicle-front-image-upload"
                className="flex flex-col items-center justify-center relative cursor-pointer py-4 md:py-6 px-3 md:px-4 min-h-[100px] md:min-h-[130px] w-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: fieldErrors.frontImage ? '2px dashed #FF4444' : '2px dashed #61CB08',
                  backdropFilter: 'blur(42px)',
                  borderRadius: '10px',
                  transition: 'border-color 0.2s'
                }}
              >
                {frontImagePreview ? (
                  <>
                    <img
                      src={frontImagePreview}
                      alt="Front vehicle registration preview"
                      className="w-auto h-auto rounded-lg"
                      style={{ maxHeight: '120px', maxWidth: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFrontImage}
                      className="absolute top-2 right-2 md:top-3 md:right-3 p-1 md:p-1.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors z-10"
                      style={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 px-2">
                    <p
                      className="text-xs md:text-sm text-center"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#FFFFFF',
                        fontWeight: 400
                      }}
                    >
                      Upload Vehicle Registration Front Image
                    </p>
                    <p
                      className="text-xs text-center"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#808080',
                        fontWeight: 400
                      }}
                    >
                      Upto 5MB - JPG, PNG
                    </p>
                  </div>
                )}
                <input
                  id="vehicle-front-image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFrontImageChange}
                  className="hidden"
                />
              </label>
              {fieldErrors.frontImage && (
                <p
                  className="text-xs mt-1"
                  style={{
                    color: '#FF4444',
                    fontFamily: 'Poppins',
                    fontWeight: 500
                  }}
                >
                  {fieldErrors.frontImage}
                </p>
              )}
            </div>

            {/* Upload Back Image */}
            <div className="space-y-2">
              <label
                className="block font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: 'Poppins',
                  color: '#FFFFFF',
                  textTransform: 'capitalize'
                }}
              >
                Upload back image
              </label>
              <label
                htmlFor="vehicle-back-image-upload"
                className="flex flex-col items-center justify-center relative cursor-pointer py-4 md:py-6 px-3 md:px-4 min-h-[100px] md:min-h-[130px] w-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: fieldErrors.backImage ? '2px dashed #FF4444' : '2px dashed #61CB08',
                  backdropFilter: 'blur(42px)',
                  borderRadius: '10px',
                  transition: 'border-color 0.2s'
                }}
              >
                {backImagePreview ? (
                  <>
                    <img
                      src={backImagePreview}
                      alt="Back vehicle registration preview"
                      className="w-auto h-auto rounded-lg"
                      style={{ maxHeight: '120px', maxWidth: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveBackImage}
                      className="absolute top-2 right-2 md:top-3 md:right-3 p-1 md:p-1.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors z-10"
                      style={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 px-2">
                    <p
                      className="text-xs md:text-sm text-center"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#FFFFFF',
                        fontWeight: 400
                      }}
                    >
                      Upload Vehicle Registration Back Image
                    </p>
                    <p
                      className="text-xs text-center"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#808080',
                        fontWeight: 400
                      }}
                    >
                      Upto 5MB - JPG, PNG
                    </p>
                  </div>
                )}
                <input
                  id="vehicle-back-image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleBackImageChange}
                  className="hidden"
                />
              </label>
              {fieldErrors.backImage && (
                <p
                  className="text-xs mt-1"
                  style={{
                    color: '#FF4444',
                    fontFamily: 'Poppins',
                    fontWeight: 500
                  }}
                >
                  {fieldErrors.backImage}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 mt-8 md:mt-10 w-full">
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full py-3 md:py-3 rounded-lg font-poppins font-semibold text-sm md:text-sm capitalize transition-colors duration-200 disabled:cursor-not-allowed"
                style={{
                  background: isLoading ? '#61CB0866' : '#61CB08',
                  color: '#000B00',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.target.style.background = '#55b307';
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
                className="w-full py-3 md:py-3 rounded-lg font-poppins font-semibold text-sm md:text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#113D00] text-white hover:bg-[#016606]"
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

export default VehicleDetails;