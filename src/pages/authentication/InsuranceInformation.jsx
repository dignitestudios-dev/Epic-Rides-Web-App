import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { uploadInsuranceDocuments } from '../../redux/slices/auth.slice';
import { X } from 'lucide-react';
import Cookies from 'js-cookie';
import { ErrorToast } from '../../components/global/Toaster';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { bartwo } from '../../assets/export';
import { markStepCompleted, STEPS, arePreviousStepsCompleted, getFirstIncompleteStep, clearAllSteps, isStepCompleted } from '../../utils/stepValidation';

const InsuranceInformation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, stepToComplete, isLoading } = useSelector((state) => state.auth);
  const formData = location.state?.formData || {};
  const licenseData = location.state?.licenseData || {};
  const vehicleData = location.state?.vehicleData || {};

  const [insuranceImage, setInsuranceImage] = useState(null);
  const [insuranceImagePreview, setInsuranceImagePreview] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  console.log(user,"userdata")

  const handleInsuranceImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        ErrorToast('Image size should not exceed 5MB');
        e.target.value = ''; // Clear the input
        return;
      }

      setInsuranceImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setInsuranceImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveInsuranceImage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setInsuranceImage(null);
    setInsuranceImagePreview(null);
    // Reset file input
    const input = document.getElementById('insurance-image-upload');
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
    // Validate insurance information
    if (!insuranceImage) {
      ErrorToast('Please upload insurance document');
      return;
    }
    
    // Check if user data exists
    if (!user || !user._id) {
      ErrorToast('User data not found. Please login again.');
      navigate('/signup');
      return;
    }
    
    try {
      // Dispatch upload insurance documents action
      const result = await dispatch(
        uploadInsuranceDocuments({
          driverId: user._id,
          file: insuranceImage,
          step: 3,
        })
      ).unwrap();
      
      // Mark step 4 as completed
      markStepCompleted(STEPS.INSURANCE_INFORMATION);
      
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
              vehicleData,
              insuranceData: { insuranceImage },
              rejectedFlow,
              currentIndex: nextIndex,
              fromVerifiedAccount: true,
            } 
          });
          return;
        }

        // No more rejected steps, go back to verified-account
        navigate('/verified-account', { 
          state: { 
            formData, 
            licenseData, 
            vehicleData,
            insuranceData: { insuranceImage },
            status: 'submitted',
          } 
        });
        return;
      }

      // Normal flow: navigate to Add Vehicle Details page
      if (result?.message) {
        navigate('/add-vehicle-details', { 
          state: { 
            formData, 
            licenseData, 
            vehicleData,
            insuranceData: { insuranceImage }
          } 
        });
      }
    } catch (error) {
      // Error is already handled in the slice with ErrorToast
      console.error('Upload insurance document error:', error);
    }
  };

  const handleBack = () => {
    // Check if previous step (Vehicle Details) is completed
    // If completed, don't allow going back - stay on current step
    if (isStepCompleted(STEPS.VEHICLE_DETAILS)) {
      // Previous step is completed, don't allow going back
      ErrorToast('You cannot go back to completed steps');
      return;
    }
    // If not completed, allow navigation back
    navigate('/vehicle-details', { state: { formData, licenseData } });
  };

  // Redirect logic: Check step validation and user authentication
  React.useEffect(() => {
    // Priority 1: If user is null, redirect to signup immediately
    if (!user) {
      navigate('/signup');
      return;
    }
    
    // Priority 2: If stepToComplete is "insurance", allow access directly
    // This handles the case where API returns stepToComplete: "insurance"
    if (stepToComplete === "insurance") {
      // Allow access if stepToComplete is insurance
      return;
    }
    
    // Priority 3: If we have formData, licenseData, or vehicleData from previous step, allow access
    // This handles navigation after successful step completion
    if ((formData && Object.keys(formData).length > 0) || 
        (licenseData && Object.keys(licenseData).length > 0) ||
        (vehicleData && Object.keys(vehicleData).length > 0)) {
      // Coming from previous step with data, allow access
      return;
    }
    
    // Priority 4: If this step is already completed, redirect to next incomplete step
    if (isStepCompleted(STEPS.INSURANCE_INFORMATION)) {
      navigate(getFirstIncompleteStep());
      return;
    }
    
    // Priority 5: Check if previous steps (Step 1, 2, 3) are completed
    if (!arePreviousStepsCompleted(STEPS.INSURANCE_INFORMATION)) {
      // Redirect to first incomplete step
      navigate(getFirstIncompleteStep());
      return;
    }
    
    // If user exists in Redux, allow access (insurance can be accessed after vehicle-details)
    if (user) {
      // User is authenticated, allow access
      return;
    }
  }, [user, stepToComplete, formData, licenseData, vehicleData, navigate]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={4} />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center md:justify-end overflow-y-auto max-h-[50em] pt-20 md:pt-0">
        <div
          className="w-full max-w-[calc(100%-2rem)] md:!w-[75em] flex flex-col items-center justify-center md:pr-[0em] py-6 md:py-8 px-4 md:px-0"
        >
          {/* Header */}
          <div className="text-center mb-5 md:mb-6">
            <h1
              className="font-semibold mb-2 leading-tight text-xl md:text-[34px]"
              style={{
                fontFamily: 'Poppins',
                color: '#FFFFFF',
                letterSpacing: '-0.5px'
              }}
            >
              Upload Insurance Information
            </h1>
            <div className='flex justify-center items-center pt-3 md:pt-4'>
                        <img src={bartwo} alt="" className='w-[12em] md:w-[20em]' />
                        </div>
          </div>

          {/* Form Container */}
          <div className="w-full max-w-md space-y-3 md:space-y-4 md:pr-2">
            {/* Upload Insurance Document */}
            <div className="space-y-1.5 md:space-y-2">
              <label
                htmlFor="insurance-image-upload"
                className="flex flex-col items-center justify-center relative cursor-pointer py-4 md:py-5 px-2.5 md:px-3 min-h-[90px] md:min-h-[110px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: '2px dashed #61CB08',
                  backdropFilter: 'blur(42px)',
                  borderRadius: '10px'
                }}
              >
                {insuranceImagePreview ? (
                  <>
                    <img
                      src={insuranceImagePreview}
                      alt="Insurance document preview"
                      className="w-full h-full object-contain rounded-lg max-h-[100px] md:max-h-[140px]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveInsuranceImage}
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
                      Upload "Insurance Information"
                    </p>
                    <p
                      className="text-[9px] md:text-[11px]"
                      style={{
                        fontFamily: 'Poppins',
                        color: '#808080',
                        fontWeight: 400
                      }}
                    >
                      Upto 5MB image size
                    </p>
                  </div>
                )}
                <input
                  id="insurance-image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleInsuranceImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 !mt-6 md:!mt-[10em]">
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg font-poppins font-semibold text-xs md:text-sm capitalize transition-colors duration-200 disabled:cursor-not-allowed"
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
              <div className="flex gap-3">
               
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-lg font-poppins font-semibold text-xs md:text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#016606] text-white hover:bg-[#016606]"
                >
                  Logout
                </button>
              </div>
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

export default InsuranceInformation;

