import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Check, AlertTriangle } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from '../../axios';
import { ErrorToast, SuccessToast } from '../../components/global/Toaster';
import SignupBackground from '../../components/authentication/SignupBackground';
import LogoutModal from '../../components/global/LogoutModal';
import { STEPS, arePreviousStepsCompleted, getFirstIncompleteStep, clearAllSteps } from '../../utils/stepValidation';

const Subscription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, stepToComplete, rejectedDocuments } = useSelector((state) => state.auth);

  const formData = location.state?.formData || {};
  const licenseData = location.state?.licenseData || {};
  const vehicleData = location.state?.vehicleData || {};
  const insuranceData = location.state?.insuranceData || {};
  const vehicleDetails = location.state?.vehicleDetails || {};

  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingPlanId, setPurchasingPlanId] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/plan');
        if (response.data?.success && response.data?.data) {
          setPlans(response.data.data);
        } else {
          ErrorToast(response.data?.message || 'Failed to fetch plans');
        }
      } catch (error) {
        ErrorToast(error.response?.data?.message || 'Failed to fetch plans');
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    // Priority 1: If user is null, redirect to signup immediately
    if (!user) {
      navigate('/signup');
      return;
    }

    // Priority 2: If stepToComplete is null/empty, allow access to subscription
    // This handles the case where all steps are completed and user should see subscription
    if (stepToComplete === null || stepToComplete === undefined || stepToComplete === "" || !stepToComplete) {
      // Allow access if stepToComplete is null/empty (all steps completed)
      // Continue to fetch subscription details below
    } else {
      // Priority 3: Check if previous steps (Step 1, 2, 3, 4, 5, 6) are completed
      if (!arePreviousStepsCompleted(STEPS.SUBSCRIPTION)) {
        // Redirect to first incomplete step
        navigate(getFirstIncompleteStep());
        return;
      }
    }

    // If the steps are completed or stepToComplete is null/empty, fetch subscription details
    const fetchSubscriptionDetails = async () => {
      try {
        setIsLoadingSubscription(true);
        const response = await axios.get('/api/subscription/details');
        if (response.data?.success && response.data?.data?.subscription) {
          setSubscriptionDetails(response.data.data.subscription);
        }
      } catch (error) {
        // Don't show error if subscription doesn't exist (user might not have subscription yet)
        if (error.response?.status !== 404) {
          console.error('Error fetching subscription details:', error);
        }
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscriptionDetails();
  }, [user, stepToComplete, navigate]);

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

  const handleBuyPlan = async (plan) => {
    if (!plan?.id) {
      ErrorToast('Invalid plan selected');
      return;
    }

    try {
      setPurchasingPlanId(plan.id);
      const response = await axios.post(`/api/subscription/purchase/${plan.id}`);

      if (response.data?.success) {
        // Check if URL is present in response
        const checkoutUrl = response.data?.data?.url;

        if (checkoutUrl) {
          // Redirect to Stripe checkout URL
          window.location.href = checkoutUrl;
        } else {
          SuccessToast(response.data?.message || 'Plan purchased successfully');
          console.log('Purchase successful:', response.data);
        }
      } else {
        ErrorToast(response.data?.message || 'Failed to purchase plan');
        setPurchasingPlanId(null);
      }
    } catch (error) {
      ErrorToast(error.response?.data?.message || 'Failed to purchase plan');
      console.error('Error purchasing plan:', error);
      setPurchasingPlanId(null);
    }
  };

  // Format price from cents to dollars
  const formatPrice = (amount, currency = 'usd') => {
    const price = amount / 100; // Convert cents to dollars
    const currencySymbol = currency === 'usd' ? '$' : currency.toUpperCase();
    return { price, currencySymbol };
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get current plan details based on subscription
  const getCurrentPlan = () => {
    if (!subscriptionDetails || !plans.length) return null;
    return plans.find(plan => plan.id === subscriptionDetails.priceId);
  };

  // Handle cancel subscription button click - show modal
  const handleCancelSubscriptionClick = () => {
    setShowCancelModal(true);
  };

  // Handle confirm cancel subscription
  const handleConfirmCancelSubscription = async () => {
    if (!subscriptionDetails?._id) {
      ErrorToast('Subscription not found');
      setShowCancelModal(false);
      return;
    }

    try {
      setIsCanceling(true);
      const response = await axios.post('/api/subscription/cancel');

      if (response.data?.success) {
        SuccessToast(response.data?.message || 'Subscription cancelled successfully');
        // Refresh subscription details
        const refreshResponse = await axios.get('/api/subscription/details');
        if (refreshResponse.data?.success && refreshResponse.data?.data?.subscription) {
          setSubscriptionDetails(refreshResponse.data.data.subscription);
        }
        setShowCancelModal(false);
      } else {
        ErrorToast(response.data?.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      ErrorToast(error.response?.data?.message || 'Failed to cancel subscription');
      console.error('Error canceling subscription:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background */}
      <SignupBackground />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto">
        <div className="flex flex-col items-center gap-8 px-8 py-12 max-w-[1200px] w-full">
          {/* Header */}
          <h2 className="font-poppins font-bold text-4xl text-center text-white m-0">
            Subscription Plans
          </h2>

          {/* Show subscription card if user has active subscription */}
          {isLoadingSubscription ? (
            <div className="flex items-center justify-center py-4">
              <p className="font-poppins font-normal text-sm text-white">Loading subscription details...</p>
            </div>
          ) : subscriptionDetails && subscriptionDetails.status === 'active' ? (
            <div className="flex flex-col items-center gap-6 w-full">
              {/* Subscription Plan Card */}
              {(() => {
                const currentPlan = getCurrentPlan();
                const { price, currencySymbol } = currentPlan ? formatPrice(currentPlan.amount, currentPlan.currency) : { price: 0, currencySymbol: '$' };

                return (
                  <div
                    className="rounded-xl p-6 w-full max-w-[27em]"
                    style={{
                      background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                      backdropFilter: 'blur(42px)',
                      border: '1px solid rgba(97, 203, 8, 0.32)'
                    }}
                  >
                    {/* Plan Name */}
                    <h3 className="font-poppins font-semibold text-xl text-white text-center mb-4">
                      {currentPlan?.product?.name || 'Standard Plan'}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline justify-center gap-1 mb-6">
                      <span className="font-poppins font-normal text-lg text-white">{currencySymbol}</span>
                      <span className="font-poppins font-bold text-6xl text-[#61CB08]">{price}</span>
                    </div>

                    {/* Features List */}
                    <div className="flex flex-col gap-3 text-center justify-center items-center mb-4">
                      {subscriptionDetails.currentPeriodEnd && (
                        <p className="font-poppins font-normal text-sm text-white m-0">
                          {subscriptionDetails.cancelAtPeriodEnd ? (
                            <>Your subscription is <span className='text-red-600'>cancelled</span></>
                          ) : (
                            <>Your subscription is <span className='text-[#55B307]'>{subscriptionDetails.status}</span></>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Expiration Message */}
                    {subscriptionDetails.currentPeriodEnd && (
                      <p className="font-poppins font-normal text-sm text-center text-[#EF4444] m-0 mb-4">
                        {subscriptionDetails.cancelAtPeriodEnd ? (
                          <>Your subscription has been cancelled. It will expire on {formatDate(subscriptionDetails.currentPeriodEnd)}.</>
                        ) : (
                          <>Your subscription will expire on {formatDate(subscriptionDetails.currentPeriodEnd)}</>
                        )}
                      </p>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={handleCancelSubscriptionClick}
                disabled={isCanceling || subscriptionDetails?.cancelAtPeriodEnd}
                className="w-full max-w-[27em] py-3 rounded-xl font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Subscription
              </button>
            </div>
          ) : null}

          {/* Plans Grid - Only show if user doesn't have active subscription */}
          {!subscriptionDetails || subscriptionDetails.status !== 'active' ? (
            isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="font-poppins font-normal text-base text-white">Loading plans...</p>
              </div>
            ) : plans.length > 0 ? (
              <div className="flex flex-row flex-wrap justify-center items-start gap-8 w-full">
                {plans.map((plan) => {
                  const { price, currencySymbol } = formatPrice(plan.amount, plan.currency);
                  const intervalText = plan.interval === 'month' ? 'month' : plan.interval;

                  return (
                    <div
                      key={plan.id}
                      className="rounded-xl p-6 w-full max-w-[27em]"
                      style={{
                        background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                        backdropFilter: 'blur(42px)',
                        border: '1px solid rgba(97, 203, 8, 0.32)'
                      }}
                    >
                      {/* Plan Name */}
                      <h3 className="font-poppins font-semibold text-xl text-white text-center mb-4">
                        {plan.product?.name || plan.nickname || 'Plan'}
                      </h3>

                      {/* Plan Description */}
                      {plan.product?.description && (
                        <p className="font-poppins font-normal text-sm text-[#E6E6E6] text-center mb-4">
                          {plan.product.description}
                        </p>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline justify-center gap-1 mb-6">
                        <span className="font-poppins font-normal text-lg text-white">{currencySymbol}</span>
                        <span className="font-poppins font-bold text-6xl text-[#61CB08]">{price}</span>
                        {plan.interval && (
                          <span className="font-poppins font-normal text-lg text-white">/{intervalText}</span>
                        )}
                      </div>

                      {/* Buy Plan Button */}
                      <button
                        onClick={() => handleBuyPlan(plan)}
                        disabled={purchasingPlanId === plan.id}
                        className="w-full py-3 rounded-xl font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-[#000B00] hover:bg-[#55b307] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {purchasingPlanId === plan.id ? 'Processing...' : 'Buy Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="font-poppins font-normal text-base text-white">No plans available</p>
              </div>
            )
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="w-[27.3em] py-3 rounded-[14px] font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#113D00] text-white hover:bg-[#016606]"
          >
            Logout
          </button>
        </div>


      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* Cancel Subscription Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div
            className="relative rounded-xl p-8 w-full max-w-md mx-4"
            style={{
              background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
              backdropFilter: 'blur(42px)',
              border: '1px solid rgba(97, 203, 8, 0.32)'
            }}
          >
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#EF4444] flex items-center justify-center">
                <AlertTriangle size={32} color="#FFFFFF" strokeWidth={2.5} />
              </div>
            </div>

            {/* Title */}
            <h3 className="font-poppins font-bold text-2xl text-white text-center mb-4">
              Cancel Subscription
            </h3>

            {/* Message */}
            <p className="font-poppins font-normal text-base text-white text-center mb-8">
              Your account will remain inactive until you resubscribe.
            </p>

            {/* Buttons */}
            <div className="flex flex-row gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 text-white"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
                  border: '1px solid rgba(97, 203, 8, 0.32)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(180deg, rgba(97, 203, 8, 0.18) 0%, rgba(97, 203, 8, 0.08) 50%, rgba(97, 203, 8, 0.12) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCancelSubscription}
                disabled={isCanceling}
                className="flex-1 py-3 rounded-xl font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-[#000B00] hover:bg-[#55b307] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCanceling ? 'Canceling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;

