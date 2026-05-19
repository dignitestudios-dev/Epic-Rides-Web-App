import Cookies from 'js-cookie';

export const PENDING_STRIPE_CHECKOUT_KEY = 'pendingStripeCheckout';
export const POST_SUBSCRIPTION_FLOW_KEY = 'postSubscriptionFlow';
export const ONBOARDING_JUST_PURCHASED_KEY = 'onboardingJustPurchased';

export const clearSubscriptionCheckoutSession = () => {
  sessionStorage.removeItem(PENDING_STRIPE_CHECKOUT_KEY);
  sessionStorage.removeItem(POST_SUBSCRIPTION_FLOW_KEY);
  sessionStorage.removeItem(ONBOARDING_JUST_PURCHASED_KEY);
};

export const setSubscriptionCheckoutPending = (flowState) => {
  sessionStorage.setItem(PENDING_STRIPE_CHECKOUT_KEY, '1');
  if (flowState) {
    sessionStorage.setItem(POST_SUBSCRIPTION_FLOW_KEY, JSON.stringify(flowState));
  }
};

export const markSubscriptionPurchaseSuccess = () => {
  sessionStorage.removeItem(PENDING_STRIPE_CHECKOUT_KEY);
  sessionStorage.setItem(ONBOARDING_JUST_PURCHASED_KEY, '1');
};

export const hasPendingStripeCheckout = () =>
  sessionStorage.getItem(PENDING_STRIPE_CHECKOUT_KEY) === '1';

export const getPostSubscriptionFlowState = () => {
  const raw = sessionStorage.getItem(POST_SUBSCRIPTION_FLOW_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const resolveDriverId = (user) => {
  if (user?._id) return user._id;
  try {
    const fromCookie = Cookies.get('user');
    if (fromCookie) {
      const parsed = JSON.parse(fromCookie);
      return parsed?._id ?? null;
    }
  } catch {
    // ignore invalid cookie JSON
  }
  return null;
};

/** GET /api/subscription/details/:driverId */
export const getSubscriptionDetailsPath = (driverId) =>
  driverId ? `/api/subscription/details/${driverId}` : null;
