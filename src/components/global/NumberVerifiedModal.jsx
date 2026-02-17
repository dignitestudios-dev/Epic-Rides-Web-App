import React, { useEffect } from 'react';
import Modal from 'react-modal';

const NumberVerifiedModal = ({ isOpen, onClose }) => {
  // Set app element for react-modal
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Number Verified"
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className="flex items-center justify-center border-none outline-none z-[1000]"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[1000] flex justify-center items-center"
      style={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        content: {
          position: 'relative',
          inset: 'auto',
          border: 'none',
          background: 'transparent',
          padding: 0,
          maxWidth: '90%',
          width: 'auto',
        },
      }}  
    >
      <div className="relative bg-[#0f1f0fd9] border-[1px] border-[#60cb084d] rounded-[20px] p-8 max-w-[600px] w-full shadow-2xl">
        {/* Close Button */}
       

        {/* Content */}
        <div className="flex flex-col items-center justify-center gap-6 pt-4">
          {/* Success Icon - Green Circle with Checkmark */}
          <div className="w-20 h-20 rounded-full bg-[#61CB08] flex items-center justify-center shadow-lg">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          {/* Heading */}
          <h2 className="text-white font-poppins font-bold text-2xl leading-tight text-center m-0">
            Number Verified
          </h2>

          {/* Message */}
          <p className="text-white font-poppins font-normal text-base leading-relaxed text-center m-0 px-4">
            Your number has been verified successfully.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default NumberVerifiedModal;

