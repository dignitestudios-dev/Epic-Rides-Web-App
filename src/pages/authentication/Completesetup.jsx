import React, { useEffect, useState } from 'react';
import { loginbackgroundimage, logo } from '../../assets/export';


const CompleteSetup = () => {
  const [visible, setVisible] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const handleReturnToApp = () => {
    setRedirecting(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-[#0a0f0a]">

      {/* Animated mesh background */}
     <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${loginbackgroundimage})` }}
          />
    

      {/* Grid overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(97,203,8,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(97,203,8,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Floating orbs */}
      <div className="absolute z-0 pointer-events-none animate-pulse"
        style={{ width: 340, height: 340, borderRadius: '50%', background: 'rgba(97,203,8,0.12)', filter: 'blur(60px)', top: -80, left: -80 }} />
      <div className="absolute z-0 pointer-events-none animate-pulse"
        style={{ width: 260, height: 260, borderRadius: '50%', background: 'rgba(97,203,8,0.08)', filter: 'blur(60px)', bottom: -60, right: -60 }} />

      {/* Card */}
      <div
        className="relative z-10 text-center w-[90%] max-w-[480px] rounded-[28px] px-12 py-14"
        style={{
          background: 'rgba(15, 25, 15, 0.85)',
          border: '1px solid rgba(97,203,8,0.18)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 0 1px rgba(97,203,8,0.06) inset, 0 32px 80px rgba(0,0,0,0.6), 0 0 80px rgba(97,203,8,0.06)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
          transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Icon with rings */}
        <div className="relative inline-flex items-center justify-center mb-8">
          {/* Outer ring */}
          <div className="absolute rounded-full animate-ping"
            style={{ width: 110, height: 110, border: '2px solid rgba(97,203,8,0.2)', animationDuration: '2.5s' }} />
          {/* Inner ring */}
          <div className="absolute rounded-full animate-ping"
            style={{ width: 88, height: 88, border: '1.5px solid rgba(97,203,8,0.35)', animationDuration: '2.5s', animationDelay: '0.4s' }} />
          {/* Circle */}
          <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #61CB08 0%, #3ea005 100%)',
              boxShadow: '0 0 32px rgba(97,203,8,0.45), 0 8px 24px rgba(0,0,0,0.4)'
            }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4,13 9,18 20,7" />
            </svg>
          </div>
        </div>

      

        {/* Heading */}
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight mb-3"
          style={{ color: '#f0f8e8', fontFamily: "'Poppins', sans-serif" }}>
          Setup {' '}
          <span style={{ color: '#61CB08' }}>Complete</span>
        </h1>

        {/* Description */}
        <p className="text-[15px] leading-relaxed mb-9 mx-auto max-w-[320px]"
          style={{ color: 'rgba(200, 220, 190, 0.65)' }}>
          Your setup has been completed successfully. Close this window and return to the app to continue your journey.
        </p>

        {/* Button */}
        {/* <button
          onClick={handleReturnToApp}
          className="inline-flex items-center justify-center gap-2.5 w-full max-w-[320px] h-[52px] rounded-[14px] font-bold text-[15px] text-white border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #61CB08 0%, #4aaa06 100%)',
            boxShadow: '0 4px 20px rgba(97,203,8,0.35), 0 0 0 1px rgba(97,203,8,0.2)',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {redirecting ? 'Redirecting...' : 'Return to App'}
          {!redirecting && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12,5 19,12 12,19" />
            </svg>
          )}
        </button> */}

       

      </div>
    </div>
  );
};

export default CompleteSetup;