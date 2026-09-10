import { STEPS, setCompletedSteps, getFirstIncompleteStep } from './stepValidation';

const DOCUMENT_KEYS = [
  'driverLicense',
  'vehicleRegistration',
  'insurance',
  'vehicleDetails',
];

const DOC_KEY_TO_ROUTE = {
  driverLicense: '/license-information',
  licenseInfo: '/license-information',
  licenseInformation: '/license-information',
  license: '/license-information',
  vehicleRegistration: '/vehicle-details',
  vehicleReg: '/vehicle-details',
  insurance: '/insurance-information',
  insuranceInfo: '/insurance-information',
  vehicleDetails: '/add-vehicle-details',
  addVehicleDetails: '/add-vehicle-details',
};

export const areAllDocumentsApproved = (user) => {
  if (!user) return false;
  return DOCUMENT_KEYS.every((key) => user[key]?.status === 'approved');
};

/** Subscription purchased and active (missing `subscription` on user = not bought). */
export const hasActiveSubscription = (user) =>
  user?.subscription?.status === 'active';

export const needsSubscriptionPurchase = (user) => !hasActiveSubscription(user);

/** Doc still needs upload/resubmit (pending/approved = already submitted, no form needed). */
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

/** Document key → the wizard step that uploads it, in wizard order. */
const DOC_KEY_TO_STEP = [
  ['driverLicense', STEPS.LICENSE_INFORMATION],
  ['vehicleRegistration', STEPS.VEHICLE_DETAILS],
  ['insurance', STEPS.INSURANCE_INFORMATION],
  ['vehicleDetails', STEPS.ADD_VEHICLE_DETAILS],
];

/** True for the four document steps — used to decide how much state to forward. */
export const isDocumentRoute = (route) =>
  Object.values(DOC_KEY_TO_ROUTE).includes(route);

/** Local step progress derived from server truth, one document at a time. */
export const computeCompletedStepsFromUser = (user, isOnboarded = true) => {
  if (!user || isOnboarded === false || user?.isOnboarded === false) return [];

  const steps = [STEPS.SIGNUP];

  // A step counts as done only when its document no longer needs the driver.
  // A rejected document is NOT done, even if later documents already are.
  DOC_KEY_TO_STEP.forEach(([key, step]) => {
    if (!documentNeedsUserAction(user[key])) {
      steps.push(step);
    }
  });

  if (hasActiveSubscription(user)) {
    steps.push(STEPS.SUBSCRIPTION);
  }

  return steps;
};

/**
 * Overwrite local progress with server truth.
 *
 * This *replaces* rather than adds. The previous version marked all four document steps
 * complete for any user, so logging in with a rejected document left every step flagged done
 * — and the next page bounced straight to /subscription with documents still outstanding.
 */
export const syncCompletedStepsFromUser = (user, isOnboarded = true) => {
  if (!user || isOnboarded === false || user?.isOnboarded === false) {
    setCompletedSteps([]);
    return;
  }
  setCompletedSteps(computeCompletedStepsFromUser(user, isOnboarded));
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

const normalizeDocumentKey = (key) => {
  if (!key) return null;
  const s = String(key).trim();
  if (DOCUMENT_KEYS.includes(s)) return s;
  const clean = s.toLowerCase().replace(/[-_]/g, '');
  if (clean.includes('license') || clean.includes('driver')) return 'driverLicense';
  if (clean.includes('registration') || clean.includes('vehiclereg')) return 'vehicleRegistration';
  if (clean.includes('insurance')) return 'insurance';
  if (clean.includes('vehicledetail') || clean.includes('vehicle')) return 'vehicleDetails';
  return s;
};

/** Build rejected list for verified-account merging user object and API rejected lists. */
export const buildRejectedDocumentsPayload = (user, rejectedDocuments = []) => {
  const rejectedMap = new Map();

  if (Array.isArray(rejectedDocuments)) {
    rejectedDocuments.forEach((d) => {
      const rawKey = typeof d === 'string' ? d : d?.key;
      const key = normalizeDocumentKey(rawKey);
      if (key && DOCUMENT_KEYS.includes(key)) {
        rejectedMap.set(key, {
          key,
          rejectReason: typeof d === 'object' ? (d?.rejectReason || d?.rejectionReason || d?.reason || '') : '',
          doc: typeof d === 'object' ? d?.doc || user?.[key] || null : user?.[key] || null,
        });
      }
    });
  }

  if (user) {
    DOCUMENT_KEYS.forEach((key) => {
      if (user[key]?.status === 'rejected') {
        const existing = rejectedMap.get(key) || {};
        rejectedMap.set(key, {
          key,
          rejectReason: existing.rejectReason || user[key]?.rejectReason || user[key]?.rejectionReason || '',
          doc: user[key] || existing.doc || null,
        });
      }
    });
  }

  return DOCUMENT_KEYS.filter((key) => rejectedMap.has(key)).map((key) => rejectedMap.get(key));
};

export const hasRejectedDocuments = (user, rejectedDocuments = []) => {
  if (Array.isArray(rejectedDocuments) && rejectedDocuments.length > 0) {
    return true;
  }
  if (!user) return false;
  if (user?.accountStatus === 'rejected') return true;
  return DOCUMENT_KEYS.some((key) => user[key]?.status === 'rejected');
};

/**
 * Post-login and Account-status route resolution:
 * 1. If not onboarded (isOnboarded is false or user missing) -> /signup
 * 2. If rejected (accountStatus === 'rejected' or rejected docs) -> /verified-account (rejected)
 * 3. If profile incomplete (stepToComplete is present or missing docs) -> specific step
 * 4. If approved -> /subscription
 * 5. If all docs submitted / pending review:
 *    - Active subscription -> /verified-account (submitted)
 *    - Unpaid subscription -> /subscription
 */
export const resolvePostLoginRoute = ({
  user,
  accountStatus,
  isOnboarded,
  stepToComplete,
  rejectedDocuments = [],
  pendingDocuments = [],
}) => {
  const pendingDocs =
    pendingDocuments?.length > 0
      ? pendingDocuments
      : user?.pendingDocuments ?? [];

  const isUserNotOnboarded =
    !user || isOnboarded === false || user?.isOnboarded === false;

  if (isUserNotOnboarded) {
    syncCompletedStepsFromUser(user, false);
    return { path: '/signup' };
  }

  // Align local progress with server truth on every check
  syncCompletedStepsFromUser(user, isOnboarded);

  // 1. Rejected profile -> rejected summary on verified-account
  if (
    accountStatus === 'rejected' ||
    user?.accountStatus === 'rejected' ||
    hasRejectedDocuments(user, rejectedDocuments)
  ) {
    syncCompletedStepsFromUser(user, isOnboarded);
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

  // 2. API step to complete
  if (step && DOC_KEY_TO_ROUTE[step]) {
    return { path: DOC_KEY_TO_ROUTE[step] };
  }

  // 3. Missing docs (not rejected/pending review)
  const docRoute = getFirstIncompleteDocumentRoute(user);
  if (docRoute) {
    return { path: docRoute };
  }

  // 4. Approved profile -> If active subscription, show approved on verified-account; else go to subscription to buy
  if (accountStatus === 'approved' || areAllDocumentsApproved(user)) {
    syncCompletedStepsFromUser(user, isOnboarded);
    if (hasActiveSubscription(user)) {
      return {
        path: '/verified-account',
        state: { status: 'approved' },
      };
    }
    return { path: '/subscription' };
  }

  // 5. All documents submitted / under review
  if (shouldShowVerifiedSubmitted(user, pendingDocs) || (accountStatus === 'pending' && hasActiveSubscription(user))) {
    syncCompletedStepsFromUser(user, isOnboarded);
    return {
      path: '/verified-account',
      state: { status: 'submitted' },
    };
  }

  if (!hasActiveSubscription(user)) {
    syncCompletedStepsFromUser(user, isOnboarded);
    return { path: '/subscription' };
  }

  syncCompletedStepsFromUser(user, isOnboarded);
  return { path: getFirstIncompleteStep() };
};

export const resolveAccountStatusRoute = resolvePostLoginRoute;
