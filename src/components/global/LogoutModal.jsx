import React, { useEffect } from 'react';
import Modal from 'react-modal';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  // Set app element for react-modal
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Logout Confirmation"
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
      <div className="relative bg-[#0f1f0fd9] border border-[#60cb084d] rounded-[20px] p-6 max-w-[700px] w-[27em] shadow-2xl">
        {/* Close Button */}
       

        {/* Content */}
        <div className="flex flex-col items-center justify-center gap-6 pt-4">
          {/* Logout Icon - Red Square with Rounded Corners */}
          <div className="w-20 h-20 rounded-lg bg-[#EF4444] flex items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <polyline points="14 6 20 12 14 18"></polyline>
            </svg>
          </div>

          {/* Heading */}
          <h2 className="text-white font-poppins font-bold text-2xl leading-tight text-center m-0">
            Logout
          </h2>

          {/* Message */}
          <p className="text-white font-poppins font-normal text-base leading-relaxed text-center m-0 px-4 text-[#E6E6E6]">
            Are you sure you want to<br /> logout your account?
          </p>

          {/* Buttons */}
          <div className="flex gap-4 w-full mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#0B2700] text-[#61CB08] border border-white/20 hover:bg-[#0d2f00]"
            >
              No
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-lg font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-white hover:bg-[#55b307]"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LogoutModal;

