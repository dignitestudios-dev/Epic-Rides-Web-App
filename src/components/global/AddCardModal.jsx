import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';

const AddCardModal = ({ isOpen, onClose, onSave, editingCard = null }) => {
  const [formData, setFormData] = useState({
    cardHolderName: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  // Populate form if editing
  useEffect(() => {
    if (editingCard) {
      setFormData({
        cardHolderName: editingCard.cardHolderName || '',
        cardNumber: editingCard.cardNumber || '',
        expiry: editingCard.expiry || '',
        cvc: editingCard.cvc || ''
      });
    } else {
      setFormData({
        cardHolderName: '',
        cardNumber: '',
        expiry: '',
        cvc: ''
      });
    }
  }, [editingCard, isOpen]);

  const handleInputChange = (field, value) => {
    if (field === 'cardNumber') {
      // Remove non-digits and limit to 16 digits
      const digits = value.replace(/\D/g, '').slice(0, 16);
      setFormData({ ...formData, cardNumber: digits });
    } else if (field === 'expiry') {
      // Format as MM/YY
      const digits = value.replace(/\D/g, '').slice(0, 4);
      let formatted = digits;
      if (digits.length >= 2) {
        formatted = digits.slice(0, 2) + '/' + digits.slice(2);
      }
      setFormData({ ...formData, expiry: formatted });
    } else if (field === 'cvc') {
      // Limit to 3 digits
      const digits = value.replace(/\D/g, '').slice(0, 3);
      setFormData({ ...formData, cvc: digits });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const formatCardNumber = (number) => {
    const digits = number.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ').slice(0, 19); // Max 16 digits + 3 spaces
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.cardHolderName && formData.cardNumber.length === 16 && formData.expiry.length === 5 && formData.cvc.length === 3) {
      onSave({
        ...formData,
        cardNumber: formData.cardNumber, // Store without spaces
        id: editingCard?.id || Date.now()
      });
      setFormData({
        cardHolderName: '',
        cardNumber: '',
        expiry: '',
        cvc: ''
      });
      onClose();
    }
  };

  const isFormValid = formData.cardHolderName && formData.cardNumber.length === 16 && formData.expiry.length === 5 && formData.cvc.length === 3;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Add Card"
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
        <div className="flex flex-col gap-6 pt-4">
          {/* Title */}
          <h2 className="text-white font-poppins font-bold text-2xl leading-tight text-center m-0">
            Add Your Card Details
          </h2>

          {/* Instructional Text */}
          <p className="text-white font-poppins font-normal text-sm text-center m-0 text-[#E6E6E6]">
            Kindly Add your debit or credit card details.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Card Holder Name */}
            <div className="flex flex-col gap-2">
              <label className="text-white font-poppins font-normal text-sm">
                Card Holder Name
              </label>
              <input
                type="text"
                value={formData.cardHolderName}
                onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
                placeholder="Enter card holder name here"
                className="w-full px-4 py-3 rounded-xl font-poppins font-normal text-sm text-white placeholder-[#808080] border-none outline-none backdrop-blur-[42px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%), linear-gradient(180deg, rgba(37, 37, 37, 1) 0%, rgba(15, 15, 15, 1) 100%)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  WebkitBackdropFilter: 'blur(42px)'
                }}
              />
            </div>

            {/* Card Number */}
            <div className="flex flex-col gap-2">
              <label className="text-white font-poppins font-normal text-sm">
                Card Number
              </label>
              <input
                type="text"
                value={formatCardNumber(formData.cardNumber)}
                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                placeholder="Enter card number here"
                maxLength={19}
                className="w-full px-4 py-3 rounded-xl font-poppins font-normal text-sm text-white placeholder-[#808080] border-none outline-none backdrop-blur-[42px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%), linear-gradient(180deg, rgba(37, 37, 37, 1) 0%, rgba(15, 15, 15, 1) 100%)',
                  border: '1px solid rgba(97, 203, 8, 0.32)',
                  WebkitBackdropFilter: 'blur(42px)'
                }}
              />
            </div>

            {/* Expiry and CVC */}
            <div className="flex gap-4">
              {/* Expiry */}
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-white font-poppins font-normal text-sm">
                  Expiry
                </label>
                <input
                  type="text"
                  value={formData.expiry}
                  onChange={(e) => handleInputChange('expiry', e.target.value)}
                  placeholder="mm/yy"
                  maxLength={5}
                  className="w-full px-4 py-3 rounded-xl font-poppins font-normal text-sm text-white placeholder-[#808080] border-none outline-none backdrop-blur-[42px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%), linear-gradient(180deg, rgba(37, 37, 37, 1) 0%, rgba(15, 15, 15, 1) 100%)',
                    border: '1px solid rgba(97, 203, 8, 0.32)',
                    WebkitBackdropFilter: 'blur(42px)'
                  }}
                />
              </div>

              {/* CVC */}
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-white font-poppins font-normal text-sm">
                  CVC
                </label>
                <input
                  type="text"
                  value={formData.cvc}
                  onChange={(e) => handleInputChange('cvc', e.target.value)}
                  placeholder="XXX"
                  maxLength={3}
                  className="w-full px-4 py-3 rounded-xl font-poppins font-normal text-sm text-white placeholder-[#808080] border-none outline-none backdrop-blur-[42px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%), linear-gradient(180deg, rgba(37, 37, 37, 1) 0%, rgba(15, 15, 15, 1) 100%)',
                    border: '1px solid rgba(97, 203, 8, 0.32)',
                    WebkitBackdropFilter: 'blur(42px)'
                  }}
                />
              </div>
            </div>

            {/* Add Card Button */}
            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full py-3 rounded-xl font-poppins font-semibold text-sm capitalize cursor-pointer transition-colors duration-200 bg-[#61CB08] text-white hover:bg-[#55b307] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              Add Card
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AddCardModal;












