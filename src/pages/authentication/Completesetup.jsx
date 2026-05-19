import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { loginbackgroundimage } from '../../assets/export';
import axios from '../../axios';
import { markStepCompleted, STEPS } from '../../utils/stepValidation';
import {
  clearSubscriptionCheckoutSession,
  getPostSubscriptionFlowState,
  getSubscriptionDetailsPath,
  hasPendingStripeCheckout,
  markSubscriptionPurchaseSuccess,
  resolveDriverId,
} from '../../utils/subscriptionCheckout';

const CompleteSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const canceled =
      searchParams.get('canceled') === 'true' ||
      searchParams.get('cancelled') === 'true';

    const finishToSubscription = () => {
      clearSubscriptionCheckoutSession();
      navigate('/subscription', { replace: true });
    };

    const finishToVerified = (flowState) => {
      markStepCompleted(STEPS.SUBSCRIPTION);
      markSubscriptionPurchaseSuccess();
      sessionStorage.removeItem('postSubscriptionFlow');
      navigate('/verified-account', {
        replace: true,
        state: {
          ...(flowState || {}),
          status: 'submitted',
          fromSubscription: true,
        },
      });
    };

    const verifyCheckoutReturn = async () => {
      if (canceled) {
        finishToSubscription();
        return;
      }

      try {
        const driverId = resolveDriverId();
        const detailsPath = getSubscriptionDetailsPath(driverId);
        if (!detailsPath) {
          finishToSubscription();
          return;
        }

        const response = await axios.get(detailsPath, {
          skipAuthRedirect: true,
        });
        const sub = response.data?.data?.subscription;
        const isActive = sub?.status === 'active';

        if (isActive && (sessionId || hasPendingStripeCheckout())) {
          finishToVerified(getPostSubscriptionFlowState());
          return;
        }

        finishToSubscription();
      } catch {
        finishToSubscription();
      }
    };

    verifyCheckoutReturn();
  }, [navigate, searchParams]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-[#0a0f0a]">
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${loginbackgroundimage})` }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(97,203,8,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(97,203,8,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div
        className="absolute z-0 pointer-events-none animate-pulse"
        style={{
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'rgba(97,203,8,0.12)',
          filter: 'blur(60px)',
          top: -80,
          left: -80,
        }}
      />
      <div
        className="absolute z-0 pointer-events-none animate-pulse"
        style={{
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'rgba(97,203,8,0.08)',
          filter: 'blur(60px)',
          bottom: -60,
          right: -60,
        }}
      />

      <div
        className="relative z-10 text-center w-[90%] max-w-[480px] rounded-[28px] px-12 py-14"
        style={{
          background: 'rgba(15, 25, 15, 0.85)',
          border: '1px solid rgba(97,203,8,0.18)',
          backdropFilter: 'blur(24px)',
          boxShadow:
            '0 0 0 1px rgba(97,203,8,0.06) inset, 0 32px 80px rgba(0,0,0,0.6), 0 0 80px rgba(97,203,8,0.06)',
          opacity: 1,
          transform: 'translateY(0) scale(1)',
        }}
      >
        <div className="relative inline-flex items-center justify-center mb-8">
          <div
            className="absolute rounded-full animate-ping"
            style={{
              width: 110,
              height: 110,
              border: '2px solid rgba(97,203,8,0.2)',
              animationDuration: '2.5s',
            }}
          />
          <div
            className="absolute rounded-full animate-ping"
            style={{
              width: 88,
              height: 88,
              border: '1.5px solid rgba(97,203,8,0.35)',
              animationDuration: '2.5s',
              animationDelay: '0.4s',
            }}
          />
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #61CB08 0%, #3ea005 100%)',
              boxShadow: '0 0 32px rgba(97,203,8,0.45), 0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4,13 9,18 20,7" />
            </svg>
          </div>
        </div>

        <h1
          className="text-[34px] font-extrabold leading-tight tracking-tight mb-3"
          style={{ color: '#f0f8e8', fontFamily: "'Poppins', sans-serif" }}
        >
          Setup <span style={{ color: '#61CB08' }}>Complete</span>
        </h1>

        <p
          className="text-[15px] leading-relaxed mb-9 mx-auto max-w-[320px]"
          style={{ color: 'rgba(200, 220, 190, 0.65)' }}
        >
          Confirming your subscription…
        </p>
      </div>
    </div>
  );
};

export default CompleteSetup;
