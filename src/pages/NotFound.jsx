import React from "react";
import { useNavigate } from "react-router";
import { loginbackgroundimage, notfound } from "../assets/export";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${loginbackgroundimage})` }}
      />

      {/* Animated grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(97,203,8,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(97,203,8,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          animation: "gridPan 20s linear infinite",
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(97,203,8,0.08) 0%, transparent 70%)",
          animation: "pulse 4s ease-in-out infinite",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[520px] mx-4 rounded-2xl text-center"
        style={{
          border: "1px solid rgba(97,203,8,0.25)",
          background: "#000",
          padding: "2.5rem 2rem",
          backdropFilter: "blur(20px)",
          animation: "cardIn 0.6s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
       
        <img src={notfound} alt="" />

        {/* Divider */}
        <div
          className="mx-auto my-4"
          style={{
            width: 48,
            height: 2,
            background: "linear-gradient(90deg, transparent, #61CB08, transparent)",
          }}
        />

        <h2 className="text-white text-2xl font-bold mb-3">Page Not Found</h2>
        <p className="text-sm mb-8" style={{ color: "#8a8a8a", lineHeight: 1.7 }}>
          The page you're looking for doesn't exist or may have been moved to another location.
        </p>

        {/* Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
        
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              border: "1px solid #61CB08",
              background: "#61CB08",
              color: "#0B0B0B",
            }}
          >
            Go Home
          </button>
        </div>

      
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap');
        @keyframes gridPan { from { transform: translateY(0); } to { transform: translateY(40px); } }
        @keyframes pulse { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.15); } }
        @keyframes cardIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes iconBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
      `}</style>
    </div>
  );
};

export default NotFound;