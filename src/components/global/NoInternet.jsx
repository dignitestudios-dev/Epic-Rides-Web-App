import Modal from "react-modal";
import { NoInternetImage } from "../../assets/export";

const NoInternetModal = ({ isOpen }) => {
  return (
    <Modal
      isOpen={isOpen}
      contentLabel="Page Not Found"
      shouldCloseOnOverlayClick={false} // Prevent closing by clicking outside
      shouldCloseOnEsc={false}
      className="flex items-center justify-center border-none outline-none z-[1000] "
      overlayClassName="fixed inset-0 bg-[#C6C6C6] bg-opacity-50 backdrop-blur-sm z-[1000]  flex justify-center items-center"
    >
      <div className="bg-white rounded-[16px] shadow-lg   items-center flex flex-col justify-center gap-3   text-center">
        <div className="flex justify-center mb-4">
          <img
            src={NoInternetImage}
            alt=""
            className="h-full w-full object-cover mix-blend-multiply rounded-[16px]"
          />
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-white w-auto h-auto mb-4 border border-black flex items-center justify-center text-black font-medium px-4 py-2 rounded-lg  transition"
        >
          Reload Page
        </button>
      </div>
    </Modal>
  );
};

export default NoInternetModal;
