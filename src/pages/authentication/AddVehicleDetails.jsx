import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { uploadVehicleDetails } from '../../redux/slices/auth.slice';
import { getVehicleTypes } from '../../redux/slices/vehicleTypes.slice';
import { Info, Check, TriangleAlertIcon } from 'lucide-react';
import Cookies from 'js-cookie';
import { ErrorToast } from '../../components/global/Toaster';
import SignupSidebar from '../../components/authentication/SignupSidebar';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { barthree, Hash, sedan, SUV } from '../../assets/export';
import { GoAlertFill } from "react-icons/go";
import { markStepCompleted, STEPS, arePreviousStepsCompleted, getFirstIncompleteStep, clearAllSteps, isStepCompleted } from '../../utils/stepValidation';

const LICENSE_PLATE_REGEX = /^[A-Z0-9]{1,7}$/;
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
const REGISTRATION_NUMBER_REGEX = /^[A-Z0-9]{1,8}$/;

/** API may send ISO datetime; <input type="date"> needs YYYY-MM-DD. */
function normalizeRegistrationExpiryForInput(value) {
  if (value == null || value === '') return '';
  const s = typeof value === 'string' ? value : String(value);
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymd) return ymd[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const AddVehicleDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, stepToComplete, isLoading } = useSelector((state) => state.auth);
  const { list: vehicleTypeOptions = [], isLoading: isVehicleTypesLoading = false } = useSelector(
    (state) => state.vehicleTypes || {}
  );
  const hasVehicleTypes = vehicleTypeOptions.length > 0;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formData = location.state?.formData || {};
  const licenseData = location.state?.licenseData || {};
  const vehicleData = location.state?.vehicleData || {};
  const insuranceData = location.state?.insuranceData || {};

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get max date — 10 years from today
  const getMaxDate = () => {
    const today = new Date();
    const year = today.getFullYear() + 10;
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const [vehicleDetails, setVehicleDetails] = useState({
    make: '',
    model: '',
    yearOfManufacture: '',
    color: '',
    vehicleIdentificationNumber: '',
    licensePlateNumber: '',
    registrationNumber: '',
    stateRegion: '',
    registrationExpiryDate: '',
    vehicleType: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // For yearOfManufacture, only allow numbers and limit to 4 digits
    if (name === 'yearOfManufacture') {
      const numericValue = value.replace(/\D/g, ''); // Remove non-digits
      const limitedValue = numericValue.slice(0, 4); // Limit to 4 digits
      setVehicleDetails((prev) => ({
        ...prev,
        [name]: limitedValue,
      }));
      return;
    }

    // VIN: 17 chars, uppercase letters (except I/O/Q) + numbers
    if (name === 'vehicleIdentificationNumber') {
      const sanitizedValue = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
      const limitedValue = sanitizedValue.slice(0, 17);
      setVehicleDetails((prev) => ({
        ...prev,
        [name]: limitedValue,
      }));
      return;
    }

    // License plate: uppercase letters + numbers, max 7
    if (name === 'licensePlateNumber') {
      const sanitizedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const limitedValue = sanitizedValue.slice(0, 7);
      setVehicleDetails((prev) => ({
        ...prev,
        [name]: limitedValue,
      }));
      return;
    }

    // Registration number: uppercase letters + numbers, max 8
    if (name === 'registrationNumber') {
      const sanitizedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const limitedValue = sanitizedValue.slice(0, 8);
      setVehicleDetails((prev) => ({
        ...prev,
        [name]: limitedValue,
      }));
      return;
    }

    // Generic length limits for text fields
    if (name === 'make' || name === 'model' || name === 'color' || name === 'stateRegion') {
      const limitedValue = value.slice(0, 50); // max 50 characters
      setVehicleDetails((prev) => ({
        ...prev,
        [name]: limitedValue,
      }));
      return;
    }

    // Default handler
    setVehicleDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVehicleTypeSelect = (type) => {
    setVehicleDetails(prev => ({
      ...prev,
      vehicleType: type
    }));
  };

  const getVehicleTypeIcon = (type) => {
    const normalizedType = String(type || '').toLowerCase();
    if (normalizedType.includes('suv')) return SUV;
    if (normalizedType.includes('hatch')) return Hash;
    return sedan;
  };

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

  const handleNext = async () => {
    // Field labels for error messages
    const fieldLabels = {
      make: 'Make',
      model: 'Model',
      yearOfManufacture: 'Year Of Manufacture',
      color: 'Color',
      vehicleIdentificationNumber: 'Vehicle Identification Number',
      licensePlateNumber: 'License Plate Number',
      registrationNumber: 'Registration Number',
      stateRegion: 'State/Region Of Registration',
      registrationExpiryDate: 'Registration Expiry Date',
      vehicleType: 'Vehicle Type'
    };

    // Validate all required fields
    const requiredFields = [
      'make', 'model', 'yearOfManufacture', 'color',
      'vehicleIdentificationNumber', 'licensePlateNumber',
      'registrationNumber', 'stateRegion', 'registrationExpiryDate', 'vehicleType'
    ];

    const errors = {};

    // Check for empty required fields
    requiredFields.forEach(field => {
      if (!vehicleDetails[field] || !vehicleDetails[field].trim()) {
        errors[field] = `${fieldLabels[field]} is required`;
      }
    });

    // Validate year of manufacture (should not be more than 10 years old)
    const currentYear = new Date().getFullYear();
    const manufactureYear = parseInt(vehicleDetails.yearOfManufacture);
    const minYear = currentYear - 8;

    if (vehicleDetails.yearOfManufacture && vehicleDetails.yearOfManufacture.trim()) {
      if (isNaN(manufactureYear) || manufactureYear < minYear || manufactureYear > currentYear) {
        errors.yearOfManufacture = `Year of manufacture should be between ${minYear} and ${currentYear}`;
      }
    }

    // Validate registration expiry date — must not exceed 10 years from today
    if (vehicleDetails.registrationExpiryDate) {
      const selectedDate = new Date(vehicleDetails.registrationExpiryDate);
      const maxDate = new Date(getMaxDate());
      const todayDate = new Date(getTodayDate());

      if (selectedDate < todayDate) {
        errors.registrationExpiryDate = `Expiry date cannot be in the past`;
      } else if (selectedDate > maxDate) {
        errors.registrationExpiryDate = `Expiry date cannot be more than 10 years from today`;
      }
    }

    // Pattern validations
    if (
      vehicleDetails.licensePlateNumber &&
      !LICENSE_PLATE_REGEX.test(vehicleDetails.licensePlateNumber.trim())
    ) {
      errors.licensePlateNumber = 'License Plate Number format is invalid';
    }

    if (
      vehicleDetails.vehicleIdentificationNumber &&
      !VIN_REGEX.test(vehicleDetails.vehicleIdentificationNumber.trim())
    ) {
      errors.vehicleIdentificationNumber = 'Vehicle Identification Number must be 17 valid characters';
    }

    if (
      vehicleDetails.registrationNumber &&
      !REGISTRATION_NUMBER_REGEX.test(vehicleDetails.registrationNumber.trim())
    ) {
      errors.registrationNumber = 'Registration Number format is invalid';
    }

    // If there are errors, set them and return
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Clear all errors if validation passes
    setFieldErrors({});

    // Check if user data exists
    if (!user || !user._id) {
      ErrorToast('User data not found. Please login again.');
      navigate('/signup');
      return;
    }

    const selectedVehicleType = vehicleTypeOptions.find(
      (item) => item.value === vehicleDetails.vehicleType
    );
    const payloadVehicleDetails = {
      ...vehicleDetails,
      vehicleType: selectedVehicleType?.apiValue || vehicleDetails.vehicleType,
    };

    try {
      // Dispatch upload vehicle details action
      const result = await dispatch(
        uploadVehicleDetails({
          driverId: user._id,
          vehicleDetails: payloadVehicleDetails,
          step: 4,
        })
      ).unwrap();

      // Mark step 5 as completed
      markStepCompleted(STEPS.ADD_VEHICLE_DETAILS);

      const fromVerified = location.state?.fromVerifiedAccount;
      const rejectedFlow = location.state?.rejectedFlow;
      const rejectedDocuments = location.state?.rejectedDocuments;
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
              insuranceData,
              vehicleDetails: payloadVehicleDetails,
              rejectedFlow,
              rejectedDocuments,
              currentIndex: nextIndex,
              fromVerifiedAccount: true,
            },
          });
          return;
        }

        navigate('/verified-account', {
          state: {
            formData,
            licenseData,
            vehicleData,
            insuranceData,
            vehicleDetails: payloadVehicleDetails,
            status: 'submitted',
          },
        });
        return;
      }

      // Normal flow: navigate to Verified Account page
      if (result?.message) {
        navigate('/verified-account', {
          state: {
            formData,
            licenseData,
            vehicleData,
            insuranceData,
            vehicleDetails: payloadVehicleDetails,
          },
        });
      }
    } catch (error) {
      // Error is already handled in the slice with ErrorToast
      console.error('Upload vehicle details error:', error);
    }
  };

  const handleBack = () => {
    // Check if previous step (Insurance Information) is completed
    // If completed, don't allow going back - stay on current step
    if (isStepCompleted(STEPS.INSURANCE_INFORMATION)) {
      // Previous step is completed, don't allow going back
      ErrorToast('You cannot go back to completed steps');
      return;
    }
    // If not completed, allow navigation back
    navigate('/insurance-information', { state: { formData, licenseData, vehicleData } });
  };

  React.useEffect(() => {
    const fromVerified = location.state?.fromVerifiedAccount;
    const rejectedList = location.state?.rejectedDocuments;
    if (!fromVerified || !Array.isArray(rejectedList)) return;
    const item = rejectedList.find((r) => r?.key === 'vehicleDetails');
    const doc = item?.doc;
    if (!doc) return;
    const meta = doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : {};
    const formKeys = new Set([
      'make',
      'model',
      'yearOfManufacture',
      'color',
      'vehicleIdentificationNumber',
      'licensePlateNumber',
      'registrationNumber',
      'stateRegion',
      'registrationExpiryDate',
      'vehicleType',
    ]);
    const fromDoc = { ...meta };
    Object.keys(doc).forEach((k) => {
      if (formKeys.has(k) && doc[k] != null && doc[k] !== '') fromDoc[k] = doc[k];
    });
    const apiMerged = { ...meta, ...doc };
    setVehicleDetails((prev) => {
      const next = { ...prev };
      Object.entries(fromDoc).forEach(([k, v]) => {
        if (!formKeys.has(k) || v == null || v === '') return;
        next[k] =
          k === 'registrationExpiryDate'
            ? normalizeRegistrationExpiryForInput(v)
            : String(v);
      });
      const region = apiMerged.regionOfRegistration;
      if (region != null && region !== '') {
        next.stateRegion = String(region);
      }
      const expiry = apiMerged.expiryDate;
      if (expiry != null && expiry !== '') {
        next.registrationExpiryDate = normalizeRegistrationExpiryForInput(expiry);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect logic: Check step validation and user authentication
  React.useEffect(() => {
    // Priority 1: If user is null, redirect to signup immediately
    if (!user) {
      navigate('/signup');
      return;
    }

    if (location.state?.fromVerifiedAccount && Array.isArray(location.state?.rejectedFlow)) {
      return;
    }

    // Priority 2: If stepToComplete is "vehicleDetails", allow access directly
    // This handles the case where API returns stepToComplete: "vehicleDetails"
    if (stepToComplete === "vehicleDetails") {
      // Allow access if stepToComplete is vehicleDetails
      markStepCompleted(STEPS.SIGNUP);
      return;
    }

    // Priority 3: If we have formData, licenseData, vehicleData, or insuranceData from previous step, allow access
    // This handles navigation after successful step completion
    if ((formData && Object.keys(formData).length > 0) ||
      (licenseData && Object.keys(licenseData).length > 0) ||
      (vehicleData && Object.keys(vehicleData).length > 0) ||
      (insuranceData && Object.keys(insuranceData).length > 0)) {
      // Coming from previous step with data, allow access
      return;
    }

    // Priority 4: If this step is already completed, redirect to next incomplete step
    if (isStepCompleted(STEPS.ADD_VEHICLE_DETAILS)) {
      navigate(getFirstIncompleteStep());
      return;
    }

    // Priority 5: Check if previous steps (Step 1, 2, 3, 4) are completed
    if (!arePreviousStepsCompleted(STEPS.ADD_VEHICLE_DETAILS)) {
      // Redirect to first incomplete step
      navigate(getFirstIncompleteStep());
      return;
    }

    // If user exists, allow access
    if (user) {
      return;
    }
  }, [user, stepToComplete, formData, licenseData, vehicleData, insuranceData, navigate]);

  React.useEffect(() => {
    dispatch(getVehicleTypes());
  }, [dispatch]);

  // Default-select first vehicle type once options are loaded
  React.useEffect(() => {
    if (isVehicleTypesLoading || vehicleTypeOptions.length === 0) return;

    const firstValue = vehicleTypeOptions[0]?.value;
    if (!firstValue) return;

    setVehicleDetails((prev) => {
      const stillValid =
        prev.vehicleType &&
        vehicleTypeOptions.some((opt) => opt.value === prev.vehicleType);
      if (stillValid) return prev;
      return { ...prev, vehicleType: firstValue };
    });
  }, [isVehicleTypesLoading, vehicleTypeOptions]);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden overflow-y-hidden">
      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={3} />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-start justify-center md:justify-end overflow-y-auto pt-24 md:pt-0 pb-8">
        <div className="w-full  md:!w-[75em] flex flex-col items-center justify-start md:pr-[0em] py-6 md:py-8 px-4 md:px-0 md:!pl-[10em] 2xl:!pl-0">
          {/* Header */}
          <div className="flex flex-col justify-center items-center gap-4 md:gap-8 mb-6 md:mb-8">
            {/* Title */}
            <div className="flex flex-col justify-center items-center gap-4 md:gap-6">
              <h1
                className="font-poppins font-semibold text-center leading-tight m-0 text-xl md:text-[39px] w-full md:w-[383px]"
                style={{
                  color: '#FFFFFF'
                }}
              >
                Add Vehicle Details
              </h1>
              {/* Progress Bars */}
              <div className="flex justify-center items-center pt-2 md:pt-4">
                <img src={barthree} alt="" className="w-[12em] md:w-[20em]" />
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="flex flex-col md:flex-row items-start gap-3 md:gap-[14px] mb-0 w-full md:w-[746px]">
            {/* Left Column */}
            <div className="flex flex-col items-start gap-3 md:gap-4 w-full md:w-[200px]">
              {/* Make */}
              <div className="flex flex-row items-start gap-2.5 w-full">
                <div className="flex flex-col items-start gap-1 flex-1">
                  <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                    Make
                  </label>
                  <input
                    type="text"
                    name="make"
                    value={vehicleDetails.make}
                    onChange={handleInputChange}
                    placeholder="Enter Vehicle Make"
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                    style={{
                      background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                      backdropFilter: 'blur(42px)',
                      border: fieldErrors.make ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                      color: vehicleDetails.make ? '#FFFFFF' : '#808080'
                    }}
                  />
                  {fieldErrors.make && (
                    <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                      {fieldErrors.make}
                    </span>
                  )}
                </div>
              </div>

              {/* Year Of Manufacture */}
              <div className="flex flex-row items-start gap-2.5 w-full">
                <div className="flex flex-col items-start gap-1 flex-1">
                  <div className="flex flex-row justify-center items-center gap-1">
                    <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                      Year Of Manufacture
                    </label>
                    <div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-[#61CB08] flex items-center justify-center">
                      <Info size={8} color="#000B00" strokeWidth={2.5} className="md:w-2.5 md:h-2.5 cursor-pointer" onClick={openModal} />
                    </div>
                  </div>
                  <input
                    type="text"
                    name="yearOfManufacture"
                    value={vehicleDetails.yearOfManufacture}
                    onChange={handleInputChange}
                    placeholder="Enter Year Here"
                    inputMode="numeric"
                    maxLength={4}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                    style={{
                      background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                      backdropFilter: 'blur(42px)',
                      border: fieldErrors.yearOfManufacture ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                      color: vehicleDetails.yearOfManufacture ? '#FFFFFF' : '#808080'
                    }}
                  />
                  {fieldErrors.yearOfManufacture && (
                    <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                      {fieldErrors.yearOfManufacture}
                    </span>
                  )}
                </div>
              </div>

              {/* Vehicle Identification Number */}
              <div className="flex flex-col items-start gap-1 w-full md:w-[380px]">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  Vehicle Identification Number
                </label>
                <input
                  type="text"
                  name="vehicleIdentificationNumber"
                  value={vehicleDetails.vehicleIdentificationNumber}
                  onChange={handleInputChange}
                  placeholder="Enter Identification Number"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                    backdropFilter: 'blur(42px)',
                    border: fieldErrors.vehicleIdentificationNumber ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                    color: vehicleDetails.vehicleIdentificationNumber ? '#FFFFFF' : '#808080'
                  }}
                />
                {fieldErrors.vehicleIdentificationNumber && (
                  <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                    {fieldErrors.vehicleIdentificationNumber}
                  </span>
                )}
              </div>

              {/* License Plate Number */}
              <div className="flex flex-col items-start gap-1 w-full md:w-[380px]">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  License Plate Number
                </label>
                <input
                  type="text"
                  name="licensePlateNumber"
                  value={vehicleDetails.licensePlateNumber}
                  onChange={handleInputChange}
                  placeholder="Enter License Plate Number"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                    backdropFilter: 'blur(42px)',
                    border: fieldErrors.licensePlateNumber ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                    color: vehicleDetails.licensePlateNumber ? '#FFFFFF' : '#808080'
                  }}
                />
                {fieldErrors.licensePlateNumber && (
                  <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                    {fieldErrors.licensePlateNumber}
                  </span>
                )}
              </div>

              {/* Registration Number */}
              <div className="flex flex-col items-start gap-1 w-full md:w-[380px]">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  Registration Number
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={vehicleDetails.registrationNumber}
                  onChange={handleInputChange}
                  placeholder="Enter registration number"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                    backdropFilter: 'blur(42px)',
                    border: fieldErrors.registrationNumber ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                    color: vehicleDetails.registrationNumber ? '#FFFFFF' : '#808080'
                  }}
                />
                {fieldErrors.registrationNumber && (
                  <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                    {fieldErrors.registrationNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Middle Column */}
            <div className="flex flex-col items-start gap-3 md:gap-4 w-full md:w-[343px]">
              {/* Model */}
              <div className="flex flex-col items-start gap-1 w-full">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={vehicleDetails.model}
                  onChange={handleInputChange}
                  placeholder="Enter Vehicle Model"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                    backdropFilter: 'blur(42px)',
                    border: fieldErrors.model ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                    color: vehicleDetails.model ? '#FFFFFF' : '#808080'
                  }}
                />
                {fieldErrors.model && (
                  <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                    {fieldErrors.model}
                  </span>
                )}
              </div>

              {/* Color */}
              <div className="flex flex-col items-start gap-1 w-full">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={vehicleDetails.color}
                  onChange={handleInputChange}
                  placeholder="Enter Vehicle Color"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                    backdropFilter: 'blur(42px)',
                    border: fieldErrors.color ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                    color: vehicleDetails.color ? '#FFFFFF' : '#808080'
                  }}
                />
                {fieldErrors.color && (
                  <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                    {fieldErrors.color}
                  </span>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col items-start gap-3 md:gap-4 md:pl-[1em] w-full md:w-[343px]">
              {/* State/Region Of Registration */}
              <div className="flex flex-col items-start gap-1 w-full">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  State/Region Of Registration
                </label>
                <input
                  type="text"
                  name="stateRegion"
                  value={vehicleDetails.stateRegion}
                  onChange={handleInputChange}
                  placeholder="Enter State/Region"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                    backdropFilter: 'blur(42px)',
                    border: fieldErrors.stateRegion ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                    color: vehicleDetails.stateRegion ? '#FFFFFF' : '#808080'
                  }}
                />
                {fieldErrors.stateRegion && (
                  <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                    {fieldErrors.stateRegion}
                  </span>
                )}
              </div>

              {/* Registration Expiry Date */}
              <div className="flex flex-col items-start gap-1 w-full">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  Registration Expiry Date
                </label>
                <input
                  type="date"
                  name="registrationExpiryDate"
                  value={vehicleDetails.registrationExpiryDate}
                  onChange={handleInputChange}
                  min={getTodayDate()}
                  max={getMaxDate()}
                  placeholder="Enter Expiry Date"
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl outline-none placeholder:text-[#808080] font-poppins text-xs md:text-sm h-10 md:h-[44px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                    backdropFilter: 'blur(42px)',
                    border: fieldErrors.registrationExpiryDate ? '1px solid #EF4444' : '1px solid rgba(97, 203, 8, 0.32)',
                    color: '#FFFFFF'
                  }}
                />
                {fieldErrors.registrationExpiryDate && (
                  <span className="text-[#EF4444] text-xs font-poppins mt-0.5">
                    {fieldErrors.registrationExpiryDate}
                  </span>
                )}
              </div>

              {/* Vehicle Type */}
              <div className="flex flex-col items-start gap-2 md:gap-2.5 w-full">
                <label className="font-poppins font-semibold text-xs md:text-sm leading-[120%] capitalize text-white">
                  Vehicle Type
                </label>
                {isVehicleTypesLoading ? (
                  <div className="w-full px-4 py-3 rounded-xl border border-[#61CB08]/40 bg-[#61CB08]/10">
                    <p className="font-poppins text-xs md:text-sm text-[#61CB08] text-center">
                      Loading vehicles...
                    </p>
                  </div>
                ) : hasVehicleTypes ? (
                  <div
                    className={`vehicle-type-scroll flex flex-row items-center gap-2 md:gap-3 w-full md:justify-start ${vehicleTypeOptions.length > 3
                      ? 'justify-start overflow-x-auto pb-1'
                      : 'justify-center overflow-x-hidden'
                      }`}
                    style={vehicleTypeOptions.length > 3 ? { scrollbarColor: '#61CB08 transparent', scrollbarWidth: 'thin' } : {}}
                  >
                    {vehicleTypeOptions.map((type) => {
                      const isSelected = vehicleDetails.vehicleType === type.value;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleVehicleTypeSelect(type.value)}
                          className="relative flex flex-col items-center justify-end pb-3 cursor-pointer shrink-0"
                          style={{
                            width: '92px',
                            height: '94px',
                            background: isSelected
                              ? 'linear-gradient(180deg, rgba(97, 203, 8, 0.3) 0%, rgba(97, 203, 8, 0.2) 50%, rgba(97, 203, 8, 0.15) 100%)'
                              : 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                            backdropFilter: 'blur(34px)',
                            borderRadius: '9.72px',
                            border: isSelected ? 'none' : '1px solid rgba(97, 203, 8, 0.32)',
                            boxShadow: isSelected
                              ? '0px 0px 10.53px rgba(97, 203, 8, 0.28), inset 0px 0px 8.91px rgba(97, 203, 8, 0.25), inset 0px 0px 1.62px 1.62px rgba(97, 203, 8, 0.4)'
                              : 'none'
                          }}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#61CB08] rounded-md flex items-center justify-center">
                              <Check size={10} color="#000B00" strokeWidth={3} />
                            </div>
                          )}
                          {!isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 border border-[#61CB08] rounded-md"></div>
                          )}
                          <div className="flex items-center justify-center mb-2">
                            <img src={getVehicleTypeIcon(type.value)} alt={type.label} className='w-[3.2em]' />
                          </div>
                          <span className="font-poppins font-bold text-[10px] leading-[120%] text-center text-white">
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full px-4 py-3 rounded-xl border border-[#61CB08]/40 bg-[#61CB08]/10">
                    <p className="font-poppins text-xs md:text-sm text-[#61CB08] text-center">
                      No vehicle found
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mt-12 md:mt-8 w-full md:w-[360px]">
            <button
              onClick={handleNext}
              disabled={isLoading || isVehicleTypesLoading || !hasVehicleTypes}
              className="w-full py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize transition-colors duration-200 disabled:cursor-not-allowed"
              style={{
                background: (isLoading || isVehicleTypesLoading || !hasVehicleTypes) ? '#61CB0866' : '#61CB08',
                color: '#000B00',
                cursor: (isLoading || isVehicleTypesLoading || !hasVehicleTypes) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || isVehicleTypesLoading || !hasVehicleTypes) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading && !isVehicleTypesLoading && hasVehicleTypes) {
                  e.target.style.background = '#55b307';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && !isVehicleTypesLoading && hasVehicleTypes) {
                  e.target.style.background = '#61CB08';
                }
              }}
            >
              {isLoading ? 'Submitting...' : 'Next'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#113D00] text-white hover:bg-[#016606]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          {/* Modal Container */}
          <div className="bg-gradient-to-b from-[#60cb087b] to-[#17300393] rounded-3xl border-2 border-[#61CB08] shadow-2xl w-full max-w-[30em] p-8 backdrop-blur-lg">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center transform shadow-lg">
                <TriangleAlertIcon size={40} color='#fff' />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              Vehicle Eligibility Notice
            </h2>

            {/* Message */}
            <p className="text-gray-300 text-center text-lg leading-relaxed mb-8">
              Please note that your vehicle's year of manufacture must be within the last 8 years to meet Epic Rides' safety standards.
            </p>

            {/* Close Button */}
            <button
              onClick={closeModal}
              className="w-full bg-[#61CB08] text-white font-semibold py-3 rounded-lg transition duration-200 hover:bg-[#52a906]"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
      <style>
        {`
          .vehicle-type-scroll::-webkit-scrollbar {
            height: 6px;
          }
          .vehicle-type-scroll::-webkit-scrollbar-thumb {
            background: #61CB08;
            border-radius: 999px;
          }
          .vehicle-type-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
        `}
      </style>
    </div>
  );
};

export default AddVehicleDetails;