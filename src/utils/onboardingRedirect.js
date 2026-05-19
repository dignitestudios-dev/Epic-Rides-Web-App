import { STEPS, markStepCompleted, getFirstIncompleteStep } from './stepValidation';

const DOCUMENT_KEYS = [
  'driverLicense',
  'vehicleRegistration',
  'insurance',
  'vehicleDetails',
];

const DOC_KEY_TO_ROUTE = {
  driverLicense: '/license-information',
  vehicleRegistration: '/vehicle-details',
  insurance: '/insurance-information',
  vehicleDetails: '/add-vehicle-details',
};

export const areAllDocumentsApproved = (user) => {
  if (!user) return false;
  return DOCUMENT_KEYS.every((key) => user[key]?.status === 'approved');
};

export const hasActiveSubscription = (user) =>
  user?.subscription?.status === 'active';

/** Sync local step progress when API shows onboarding is already done. */
export const syncCompletedStepsFromUser = (user) => {
  if (!user) return;
  markStepCompleted(STEPS.SIGNUP);
  markStepCompleted(STEPS.LICENSE_INFORMATION);
  markStepCompleted(STEPS.VEHICLE_DETAILS);
  markStepCompleted(STEPS.INSURANCE_INFORMATION);
  markStepCompleted(STEPS.ADD_VEHICLE_DETAILS);
  if (hasActiveSubscription(user)) {
    markStepCompleted(STEPS.SUBSCRIPTION);
  }
};

const getFirstIncompleteDocumentRoute = (user) => {
  if (!user) return '/signup';
  for (const key of DOCUMENT_KEYS) {
    if (user[key]?.status !== 'approved') {
      return DOC_KEY_TO_ROUTE[key];
    }
  }
  return null;
};

/**
 * Decide where to send the driver after OTP verify (API-driven, not only localStorage).
 */
export const resolvePostLoginRoute = ({
  user,
  stepToComplete,
  rejectedDocuments = [],
}) => {
  if (rejectedDocuments?.length > 0) {
    return {
      path: '/verified-account',
      state: { status: 'rejected', rejectedDocuments },
    };
  }

  if (!user) {
    return { path: '/signup' };
  }

  const step =
    stepToComplete == null || stepToComplete === ''
      ? ''
      : String(stepToComplete).trim();

  if (step && DOC_KEY_TO_ROUTE[step]) {
    return { path: DOC_KEY_TO_ROUTE[step] };
  }

  if (!step) {
    if (areAllDocumentsApproved(user) && hasActiveSubscription(user)) {
      syncCompletedStepsFromUser(user);
      return { path: '/subscription' };
    }

    if (areAllDocumentsApproved(user)) {
      syncCompletedStepsFromUser(user);
      return { path: '/subscription' };
    }

    const docRoute = getFirstIncompleteDocumentRoute(user);
    if (docRoute) {
      return { path: docRoute };
    }

    if (hasActiveSubscription(user)) {
      syncCompletedStepsFromUser(user);
      return { path: '/subscription' };
    }
  }

  return { path: getFirstIncompleteStep() };
};
