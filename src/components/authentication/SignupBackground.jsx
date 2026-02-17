import React from 'react';

const SignupBackground = () => {
  return (
    <>
      {/* Background Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(264.26deg, #061701 -14.79%, #61CB08 157.42%)',
        }}
      />

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: '#061701',
          mixBlendMode: 'multiply'
        }}
      />

      {/* Right Gradient Fade */}
      <div
        className="absolute inset-y-0 right-0 w-3/5"
        style={{
          background: 'linear-gradient(270deg, #061701 0%, rgba(6, 23, 1, 0) 68.82%)'
        }}
      />

      {/* Decorative Gradient Blurs */}
      <div
        className="absolute"
        style={{
          width: '212px',
          height: '1089px',
          left: 'calc(50% + 365px)',
          top: '-200px',
          background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.24) 0%, rgba(97, 203, 8, 0) 100%)',
          filter: 'blur(40px)',
          transform: 'rotate(25.32deg)'
        }}
      />
      <div
        className="absolute"
        style={{
          width: '70px',
          height: '1184px',
          left: 'calc(50% + 151px)',
          top: '-302px',
          background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.28) 0%, rgba(97, 203, 8, 0) 100%)',
          filter: 'blur(20px)',
          transform: 'rotate(25.32deg)'
        }}
      />
      <div
        className="absolute"
        style={{
          width: '206px',
          height: '1184px',
          left: 'calc(50% - 57px)',
          top: '-410px',
          background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.24) 0%, rgba(97, 203, 8, 0) 100%)',
          filter: 'blur(40px)',
          transform: 'rotate(25.32deg)'
        }}
      />
    </>
  );
};

export default SignupBackground;

