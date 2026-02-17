import React, { useEffect } from 'react';
import Modal from 'react-modal';

const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  // Set app element for react-modal
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Privacy Policy"
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
          maxHeight: '90vh',
        },
      }}
    >
      <div className="relative bg-[#0f1f0fd9] border-[1px] border-[#60cb084d] rounded-[20px] p-8 max-w-[800px] w-full shadow-2xl max-h-[90vh] flex flex-col">
        {/* Close Button */}
       

        {/* Header */}
        <div className="mb-6 pr-8">
          <h2 className="text-white font-poppins font-bold text-2xl leading-tight m-0">
            Privacy Policy
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="text-white font-poppins font-normal text-sm leading-relaxed space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-2">1. Information Collection</h3>
              <p>
                By accessing or using our mobile application (the "App"), you agree to the collection and use of your information in accordance with this Privacy Policy. We collect information that you provide directly to us when using the App.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">2. Use of Information</h3>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                <li>Provide, maintain, and improve our App services.</li>
                <li>Process your requests and transactions.</li>
                <li>Send you communications related to the App.</li>
                <li>Personalize your experience within the App.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">3. Data Protection</h3>
              <p>
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">4. Information Sharing</h3>
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share your information only with your consent or as required by law to comply with legal obligations.
              </p>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;

