import React from 'react';

const SignupSidebar = ({ currentStep = 1 }) => {
  const steps = [
    { number: 1, name: 'Your Details', key: 'yourDetails' },
    { number: 2, name: 'License Information', key: 'licenseInfo' },
    { number: 3, name: 'Vehicle Details', key: 'vehicleDetails' },
    { number: 4, name: 'Verified Account', key: 'verifiedAccount' },
    { number: 5, name: 'Subscription', key: 'subscription' }
  ];

  return (
    <>
      {/* Mobile Progress Bar - Top */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full max-w-full overflow-x-auto">
          {steps.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '100px' }}>
                  {/* Step Circle */}
                  <div
                    className="flex items-center justify-center rounded-full font-poppins font-semibold text-sm text-white transition-all duration-200"
                    style={{
                      width: isActive || isCompleted ? '32px' : '28px',
                      height: isActive || isCompleted ? '32px' : '28px',
                      background: isActive || isCompleted ? '#61CB08' : isCompleted ? '#61CB08' : 'rgba(255, 255, 255, 0.3)',
                      border: isActive || isCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    {step.number}
                  </div>
                  {/* Step Name */}
                  <span
                    className="font-poppins font-normal text-[10px] text-center mt-1.5 pt-1 whitespace-nowrap"
                    style={{
                      color: isActive || isCompleted ? '#61CB08' : 'rgba(255, 255, 255, 0.6)',
                      maxWidth: '100px'
                    }}
                  >
                    {step.name}
                  </span>
                </div>
                {/* Connector Line */}
                {!isLast && (
                  <div
                    className="flex-1 h-0.5 mx-1 transition-all duration-200"
                    style={{
                      background: isCompleted ? '#61CB08' : 'rgba(255, 255, 255, 0.3)',
                      minWidth: '20px',
                      maxWidth: '40px'
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
        className="absolute left-5 top-1/2 -translate-y-1/2 rounded-2xl md:block hidden"
        style={{
          width: '380px',
          height: '720px',
          background: 'rgba(239, 239, 239, 0.1)',
          border: '0.8px solid #CACACA',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }}
      >
        {/* Steps Container */}
        <div className="absolute top-44 left-10 w-60 space-y-10">
          {/* Step 1: Your Details */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  background: currentStep === 1
                    ? 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)'
                    : 'rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(42px)',
                  borderRadius: currentStep === 1 ? '12px' : '8px'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={currentStep === 1 ? "#61CB08" : "#FFFFFF"} strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span
                className="font-semibold text-sm"
                style={{ color: currentStep === 1 ? '#61CB08' : '#FFFFFF' }}
              >
                Your Details
              </span>
            </div>
            <div
              className="absolute left-6 top-14 w-px"
              style={{
                height: '32px',
                background: currentStep === 1 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'
              }}
            />
          </div>

          {/* Step 2: License Information */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  background: currentStep === 2
                    ? 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)'
                    : 'rgba(255, 255, 255, 0.14)',
                  boxShadow: currentStep === 2 ? 'none' : '0px 0px 15px rgba(145, 143, 255, 0.1)',
                  backdropFilter: 'blur(9.8px)',
                  borderRadius: currentStep === 2 ? '12px' : '8px'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={currentStep === 2 ? "#61CB08" : "#FFFFFF"} strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 5V3H8v2"></path>
                </svg>
              </div>
              <span
                className="font-semibold text-sm"
                style={{ color: currentStep === 2 ? '#61CB08' : '#FFFFFF' }}
              >
                License Information
              </span>
            </div>
            <div
              className="absolute left-6 top-14 w-px"
              style={{
                height: '32px',
                background: currentStep === 2 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'
              }}
            />
          </div>

          {/* Step 3: Vehicle Details */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  background: currentStep === 3
                    ? 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)'
                    : 'rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(9.8px)',
                  borderRadius: currentStep === 3 ? '12px' : '8px'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={currentStep === 3 ? "#61CB08" : "#FFFFFF"} strokeWidth="1.5">
                  <path d="M19 17h2v.5H3v-.5h2M6.5 17a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm11 0a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM5 10l1.5-5h11l1.5 5M2 10h20v4H2z"></path>
                </svg>
              </div>
              <span
                className="font-semibold text-sm"
                style={{ color: currentStep === 3 ? '#61CB08' : '#FFFFFF' }}
              >
                Vehicle Details
              </span>
            </div>
            <div
              className="absolute left-6 top-14 w-px"
              style={{
                height: '32px',
                background: currentStep === 3 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'
              }}
            />
          </div>

          {/* Step 4: Verified Account */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  background: currentStep === 4
                    ? 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)'
                    : 'rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(9.8px)',
                  borderRadius: currentStep === 4 ? '12px' : '8px'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={currentStep === 4 ? "#61CB08" : "#FFFFFF"} strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span
                className="font-semibold text-sm"
                style={{ color: currentStep === 4 ? '#61CB08' : '#FFFFFF' }}
              >
                Verified Account
              </span>
            </div>
            <div
              className="absolute left-6 top-14 w-px"
              style={{
                height: '32px',
                background: currentStep === 4 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'
              }}
            />
          </div>

          {/* Step 5: Subscription */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  background: currentStep === 5
                    ? 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)'
                    : 'rgba(255, 255, 255, 0.14)',
                  borderRadius: currentStep === 5 ? '12px' : '8px'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={currentStep === 5 ? "#61CB08" : "#FFFFFF"}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5m-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11m3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"></path>
                </svg>
              </div>
              <span
                className="font-semibold text-sm"
                style={{ color: currentStep === 5 ? '#61CB08' : '#FFFFFF' }}
              >
                Subscription
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupSidebar;

