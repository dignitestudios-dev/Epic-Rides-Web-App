import React from 'react';

const STEPS = [
  { number: 1, name: 'Your Details', key: 'yourDetails' },
  { number: 2, name: 'License Information', key: 'licenseInfo' },
  { number: 3, name: 'Vehicle Details', key: 'vehicleDetails' },
  { number: 4, name: 'Subscription', key: 'subscription' },
  { number: 5, name: 'Verified Account', key: 'verifiedAccount' },
];

const StepIcon = ({ stepKey, active }) => {
  const stroke = active ? '#61CB08' : '#FFFFFF';
  const fill = active ? '#61CB08' : '#FFFFFF';

  switch (stepKey) {
    case 'yourDetails':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'licenseInfo':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 5V3H8v2" />
        </svg>
      );
    case 'vehicleDetails':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <path d="M19 17h2v.5H3v-.5h2M6.5 17a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm11 0a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM5 10l1.5-5h11l1.5 5M2 10h20v4H2z" />
        </svg>
      );
    case 'subscription':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5m-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11m3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </svg>
      );
    case 'verifiedAccount':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    default:
      return null;
  }
};

const SignupSidebar = ({ currentStep = 1 }) => {
  return (
    <>
      {/* Mobile Progress Bar */}
      <div className="mobile-signup-sidebar md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full max-w-full overflow-x-auto pb-[1em]">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isLast = index === STEPS.length - 1;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '100px' }}>
                  <div
                    className="flex items-center justify-center rounded-full font-poppins font-semibold text-sm text-white transition-all duration-200"
                    style={{
                      width: isActive || isCompleted ? '32px' : '28px',
                      height: isActive || isCompleted ? '32px' : '28px',
                      background:
                        isActive || isCompleted ? '#61CB08' : 'rgba(255, 255, 255, 0.3)',
                      border: isActive || isCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    {step.number}
                  </div>
                  <span
                    className="font-poppins font-normal text-[10px] text-center mt-1.5 pt-1 whitespace-nowrap"
                    style={{
                      color: isActive || isCompleted ? '#61CB08' : 'rgba(255, 255, 255, 0.6)',
                      maxWidth: '100px',
                    }}
                  >
                    {step.name}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className="flex-1 h-0.5 mx-1 transition-all duration-200"
                    style={{
                      background: isCompleted ? '#61CB08' : 'rgba(255, 255, 255, 0.3)',
                      minWidth: '20px',
                      maxWidth: '40px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className="desktop-signup-sidebar absolute left-5 top-1/2 -translate-y-1/2 rounded-2xl md:block hidden"
        style={{
          width: '380px',
          height: '720px',
          background: 'rgba(239, 239, 239, 0.1)',
          border: '0.8px solid #CACACA',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }}
      >
        <div className="absolute top-44 left-10 w-60 space-y-10">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isLast = index === STEPS.length - 1;

            return (
              <div key={step.key} className="relative">
                <div className="flex items-center gap-3 min-h-[48px]">
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)'
                        : 'rgba(255, 255, 255, 0.14)',
                      backdropFilter: 'blur(42px)',
                      borderRadius: isActive ? '12px' : '8px',
                    }}
                  >
                    <StepIcon stepKey={step.key} active={isActive} />
                  </div>
                  <span
                    className="font-semibold text-sm leading-snug"
                    style={{ color: isActive ? '#61CB08' : '#FFFFFF' }}
                  >
                    {step.name}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className="absolute left-6 top-14 w-px"
                    style={{
                      height: '32px',
                      background: isActive || isCompleted ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>
        {`
          @media (width: 768px) and (height: 1024px),
            (width: 810px) and (height: 1080px),
            (width: 1024px) and (height: 768px),
            (width: 1024px) and (height: 1366px),
            (width: 1140px) and (height: 712px) {
            .mobile-signup-sidebar {
              display: block !important;
            }
            .desktop-signup-sidebar {
              display: none !important;
            }
          }
        `}
      </style>
    </>
  );
};

export default SignupSidebar;
