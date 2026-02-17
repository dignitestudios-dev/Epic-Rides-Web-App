import React, { useEffect } from 'react';
import Modal from 'react-modal';

const TermsAndConditionsModal = ({ isOpen, onClose }) => {
  // Set app element for react-modal
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Terms and Conditions"
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
            Terms & Conditions
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="text-white font-poppins font-normal text-sm leading-relaxed space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
              <p>
                By accessing or using our mobile application (the "App"), you agree to be bound by these Terms of Service. If you do not agree to these Terms, please do not use the App.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">2. User Conduct</h3>
              <p>
                You agree not to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                <li>Use the App for any illegal or unauthorized purpose.</li>
                <li>Interfere with the security or functionality of the App.</li>
                <li>Attempt to gain unauthorized access to the App or its systems.</li>
                <li>Use the App in a way that could harm, disable, overburden, or impair the App or interfere with other users' enjoyment of the App.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">3. Intellectual Property</h3>
              <p>
                All content and materials on the App, including but not limited to text, graphics, logos, images, and software, are the property or its licensors and are protected by copyright and other intellectual property laws.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">4. Disclaimer of Warranties</h3>
              <p>
                The App is provided "as is" without warranty of any kind, express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
            </div>
          </div>
        </div>

       
      </div>
    </Modal>
  );
};

export default TermsAndConditionsModal;

