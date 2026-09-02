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

/** Subscription purchased and active (missing `subscription` on user = not bought). */
export const hasActiveSubscription = (user) =>
  user?.subscription?.status === 'active';

export const needsSubscriptionPurchase = (user) => !hasActiveSubscription(user);

/** Doc still needs upload/resubmit (pending = already submitted, no form needed). */
const documentNeedsUserAction = (doc) => {
  if (!doc) return true;
  const status = doc.status;
  return status !== 'approved' && status !== 'pending';
};

/** All four docs uploaded and awaiting admin review (API pending list or user.status). */
export const areAllDocumentsPendingReview = (user, pendingDocuments = []) => {
  if (!user) return false;

  if (Array.isArray(pendingDocuments) && pendingDocuments.length >= DOCUMENT_KEYS.length) {
    const pendingSet = new Set(pendingDocuments);
    if (DOCUMENT_KEYS.every((key) => pendingSet.has(key))) {
      return true;
    }
  }

  return DOCUMENT_KEYS.every((key) => user[key]?.status === 'pending');
};

export const areAllDocumentsUploaded = (user) =>
  Boolean(user) && DOCUMENT_KEYS.every((key) => Boolean(user[key]));

/** Paid for subscription; documents submitted; profile still under review. */
export const shouldShowVerifiedSubmitted = (user, pendingDocuments = []) => {
  if (!user || !hasActiveSubscription(user)) return false;
  if (areAllDocumentsApproved(user)) return false;
  return areAllDocumentsPendingReview(user, pendingDocuments);
};

/** All docs submitted; subscription not active yet → pay on subscription screen. */
export const shouldRedirectToSubscription = (user, pendingDocuments = []) => {
  if (!user || hasActiveSubscription(user)) return false;
  if (areAllDocumentsApproved(user)) return false;
  return areAllDocumentsPendingReview(user, pendingDocuments);
};

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
    if (documentNeedsUserAction(user[key])) {
      return DOC_KEY_TO_ROUTE[key];
    }
  }
  return null;
};

/** Build rejected list for verified-account when API only embeds status on user. */
export const buildRejectedDocumentsPayload = (user, rejectedDocuments = []) => {
  if (Array.isArray(rejectedDocuments) && rejectedDocuments.length > 0) {
    return rejectedDocuments;
  }
  if (!user) return [];
  return DOCUMENT_KEYS.filter((key) => user[key]?.status === 'rejected').map((key) => ({
    key,
    rejectReason: user[key]?.rejectReason || user[key]?.rejectionReason || null,
    doc: user[key],
  }));
};

export const hasRejectedDocuments = (user, rejectedDocuments = []) => {
  if (Array.isArray(rejectedDocuments) && rejectedDocuments.length > 0) {
    return true;
  }
  if (!user) return false;
  return DOCUMENT_KEYS.some((key) => user[key]?.status === 'rejected');
};

/**
 * Post-login route order:
 * 1. Subscription (if missing or not active)
 * 2. Verified account rejected (active sub + rejected docs — before stepToComplete)
 * 3. Documents (stepToComplete, missing uploads)
 * 4. Verified account submitted / other
 */
export const resolvePostLoginRoute = ({
  user,
  isOnboarded,
  stepToComplete,
  rejectedDocuments = [],
  pendingDocuments = [],
}) => {
  const pendingDocs =
    pendingDocuments?.length > 0
      ? pendingDocuments
      : user?.pendingDocuments ?? [];

  if (!user || isOnboarded === false) {
    return { path: '/signup' };
  }

  // 1. Active subscription + rejected docs → rejected summary
  if (hasRejectedDocuments(user, rejectedDocuments)) {
    syncCompletedStepsFromUser(user);
    return {
      path: '/verified-account',
      state: {
        status: 'rejected',
        rejectedDocuments: buildRejectedDocumentsPayload(user, rejectedDocuments),
      },
    };
  }

  const step =
    stepToComplete == null || stepToComplete === ''
      ? ''
      : String(stepToComplete).trim();

  // 3a. API step when nothing rejected in payload
  if (step && DOC_KEY_TO_ROUTE[step]) {
    return { path: DOC_KEY_TO_ROUTE[step] };
  }

  // 3b. Missing docs (not rejected/pending review)
  const docRoute = getFirstIncompleteDocumentRoute(user);
  if (docRoute) {
    return { path: docRoute };
  }

  if (shouldShowVerifiedSubmitted(user, pendingDocs)) {
    syncCompletedStepsFromUser(user);
    return {
      path: '/verified-account',
      state: { status: 'submitted' },
    };
  }

  if (areAllDocumentsApproved(user) && !hasActiveSubscription(user)) {
    syncCompletedStepsFromUser(user);
    return { path: '/subscription' };
  }

  syncCompletedStepsFromUser(user);
  return { path: getFirstIncompleteStep() };
};
