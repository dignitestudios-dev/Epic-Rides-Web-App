import { STEPS, setCompletedSteps, getFirstIncompleteStep } from './stepValidation';

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

/** Document key → the wizard step that uploads it, in wizard order. */
const DOC_KEY_TO_STEP = [
  ['driverLicense', STEPS.LICENSE_INFORMATION],
  ['vehicleRegistration', STEPS.VEHICLE_DETAILS],
  ['insurance', STEPS.INSURANCE_INFORMATION],
  ['vehicleDetails', STEPS.ADD_VEHICLE_DETAILS],
];

/**
 * `isOnboarded === false` means the "Your Details" step never completed, so there is no
 * profile yet. The API sends it alongside the user; the name/email check is only a fallback
 * for callers that don't have the flag.
 */
export const isProfileOnboarded = (user, isOnboarded) => {
  if (typeof isOnboarded === 'boolean') return isOnboarded;
  return Boolean(user?.firstName || user?.email);
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

/**
 * Local step progress, derived from what the server actually says is done.
 * Stops at the first step that still needs the user, so the stored array stays a true
 * prefix of the wizard — which is what `arePreviousStepsCompleted` assumes.
 */
export const computeCompletedStepsFromUser = (user, isOnboarded) => {
  if (!user || !isProfileOnboarded(user, isOnboarded)) return [];

  const steps = [STEPS.SIGNUP];

  for (const [key, step] of DOC_KEY_TO_STEP) {
    if (documentNeedsUserAction(user[key])) return steps;
    steps.push(step);
  }

  if (hasActiveSubscription(user)) {
    steps.push(STEPS.SUBSCRIPTION);
  }

  return steps;
};

/**
 * Overwrite local progress with server truth.
 * This *replaces* rather than adds: earlier builds marked every step complete for any user,
 * and that stale localStorage is what pinned drivers on /subscription across reloads.
 */
export const syncCompletedStepsFromUser = (user, isOnboarded) => {
  if (!user) return;
  setCompletedSteps(computeCompletedStepsFromUser(user, isOnboarded));
};

export const getFirstIncompleteDocumentRoute = (user) => {
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
 * Post-login route order. The account must be *complete* before the driver is ever shown
 * the subscription screen, so documents come first:
 *
 * 1. No profile yet (`isOnboarded === false`) → /signup
 * 2. Rejected documents → /verified-account (rejected summary, with Resubmit)
 * 3. API `stepToComplete` → that document step
 * 4. First document still needing upload → that document step
 * 5. Subscription not active → /subscription
 * 6. Documents submitted, awaiting review → /verified-account (submitted)
 */
export const resolvePostLoginRoute = ({
  user,
  stepToComplete,
  isOnboarded,
  rejectedDocuments = [],
  pendingDocuments = [],
}) => {
  const pendingDocs =
    pendingDocuments?.length > 0
      ? pendingDocuments
      : user?.pendingDocuments ?? [];

  if (!user) {
    return { path: '/signup' };
  }

  // 1. "Your Details" never completed — no profile exists yet
  if (!isProfileOnboarded(user, isOnboarded)) {
    syncCompletedStepsFromUser(user, isOnboarded);
    return { path: '/signup' };
  }

  syncCompletedStepsFromUser(user, isOnboarded);

  // 2. Rejected docs → the summary screen, which routes into the resubmit flow
  if (hasRejectedDocuments(user, rejectedDocuments)) {
    return {
      path: '/verified-account',
      state: {
        status: 'rejected',
        rejectedDocuments: buildRejectedDocumentsPayload(user, rejectedDocuments),
      },
    };
  }

  // 3. Server-declared next step (top-level, or embedded on the user)
  const rawStep = stepToComplete ?? user?.stepToComplete;
  const step = rawStep == null || rawStep === '' ? '' : String(rawStep).trim();

  if (step && DOC_KEY_TO_ROUTE[step]) {
    return { path: DOC_KEY_TO_ROUTE[step] };
  }

  // 4. First document still needing upload
  const docRoute = getFirstIncompleteDocumentRoute(user);
  if (docRoute) {
    return { path: docRoute };
  }

  // 5. Every document is in — only now may the driver be asked to pay
  if (needsSubscriptionPurchase(user)) {
    return { path: '/subscription' };
  }

  // 6. Paid, documents submitted and awaiting review
  if (shouldShowVerifiedSubmitted(user, pendingDocs)) {
    return {
      path: '/verified-account',
      state: { status: 'submitted' },
    };
  }

  if (areAllDocumentsApproved(user)) {
    return { path: '/subscription' };
  }

  return { path: getFirstIncompleteStep() };
};
