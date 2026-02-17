import React from "react";
import { useNavigate } from "react-router";
import { AlertCircle } from "lucide-react";

const RideNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/40">
            <AlertCircle className="text-red-400" size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-3">Ride Not Found</h1>
        <p className="text-gray-400 text-sm mb-6">
          The ride you&apos;re trying to track doesn&apos;t exist anymore or has already been deleted.
        </p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="w-full py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default RideNotFound;

