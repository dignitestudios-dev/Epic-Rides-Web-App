// Step validation utility
// Manages completed steps in localStorage

const STEPS = {
  SIGNUP: 'step1_signup',
  LICENSE_INFORMATION: 'step2_license',
  VEHICLE_DETAILS: 'step3_vehicle',
  INSURANCE_INFORMATION: 'step4_insurance',
  ADD_VEHICLE_DETAILS: 'step5_addVehicle',
  VERIFIED_ACCOUNT: 'step6_verified',
  SUBSCRIPTION: 'step7_subscription'
};

const STEP_ROUTES = {
  [STEPS.SIGNUP]: '/signup',
  [STEPS.LICENSE_INFORMATION]: '/license-information',
  [STEPS.VEHICLE_DETAILS]: '/vehicle-details',
  [STEPS.INSURANCE_INFORMATION]: '/insurance-information',
  [STEPS.ADD_VEHICLE_DETAILS]: '/add-vehicle-details',
  [STEPS.VERIFIED_ACCOUNT]: '/verified-account',
  [STEPS.SUBSCRIPTION]: '/subscription'
};

// Mark a step as completed
export const markStepCompleted = (step) => {
  const completedSteps = getCompletedSteps();
  if (!completedSteps.includes(step)) {
    completedSteps.push(step);
    localStorage.setItem('completedSteps', JSON.stringify(completedSteps));
  }
};

// Get all completed steps
export const getCompletedSteps = () => {
  const stored = localStorage.getItem('completedSteps');
  return stored ? JSON.parse(stored) : [];
};

// Check if a step is completed
export const isStepCompleted = (step) => {
  return getCompletedSteps().includes(step);
};

// Check if all previous steps are completed
export const arePreviousStepsCompleted = (currentStep) => {
  const completedSteps = getCompletedSteps();
  const stepOrder = [
    STEPS.SIGNUP,
    STEPS.LICENSE_INFORMATION,
    STEPS.VEHICLE_DETAILS,
    STEPS.INSURANCE_INFORMATION,
    STEPS.ADD_VEHICLE_DETAILS,
    STEPS.VERIFIED_ACCOUNT,
    STEPS.SUBSCRIPTION
  ];
  
  const currentIndex = stepOrder.indexOf(currentStep);
  if (currentIndex === -1) return false;
  
  // Check all previous steps
  for (let i = 0; i < currentIndex; i++) {
    if (!completedSteps.includes(stepOrder[i])) {
      return false;
    }
  }
  
  return true;
};

// Get the first incomplete step
export const getFirstIncompleteStep = () => {
  const stepOrder = [
    STEPS.SIGNUP,
    STEPS.LICENSE_INFORMATION,
    STEPS.VEHICLE_DETAILS,
    STEPS.INSURANCE_INFORMATION,
    STEPS.ADD_VEHICLE_DETAILS,
    STEPS.VERIFIED_ACCOUNT,
    STEPS.SUBSCRIPTION
  ];
  
  const completedSteps = getCompletedSteps();
  
  for (const step of stepOrder) {
    if (!completedSteps.includes(step)) {
      return STEP_ROUTES[step];
    }
  }
  
  return STEP_ROUTES[STEPS.SUBSCRIPTION]; // All steps completed
};

// Clear all completed steps (for logout)
export const clearAllSteps = () => {
  localStorage.removeItem('completedSteps');
};

export { STEPS, STEP_ROUTES };

