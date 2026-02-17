import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

const RideEnded = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const status = location.state?.status === "cancelled" ? "cancelled" : "completed";
  const isCancelled = status === "cancelled";

  // Particle effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const color = isCancelled ? "#ef4444" : "#61CB08";
    const particles = Array.from({ length: isCancelled ? 0 : 60 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.random() * 2 + 1),
      size: Math.random() * 4 + 2,
      alpha: Math.random() * 0.6 + 0.4,
      wobble: Math.random() * Math.PI * 2,
    }));

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.wobble) * 0.5;
        p.wobble += 0.04;
        p.alpha -= 0.003;
        if (p.y < -20 || p.alpha <= 0) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
          p.alpha = Math.random() * 0.6 + 0.4;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [isCancelled]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden px-4">

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: isCancelled
            ? "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(239,68,68,0.12) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(97,203,8,0.14) 0%, transparent 70%)",
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-sm"
        style={{ animation: "fadeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* Icon area */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Outer ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: isCancelled
                  ? "conic-gradient(from 0deg, #ef4444, #dc2626, #ef4444)"
                  : "conic-gradient(from 0deg, #61CB08, #4ade80, #61CB08)",
                padding: "2px",
                borderRadius: "9999px",
                animation: "spin 6s linear infinite",
              }}
            />
            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: isCancelled
                  ? "linear-gradient(135deg, #1a0808, #0d0d0d)"
                  : "linear-gradient(135deg, #0a1a02, #0d0d0d)",
                border: isCancelled ? "2px solid #ef444444" : "2px solid #61CB0844",
                boxShadow: isCancelled
                  ? "0 0 40px rgba(239,68,68,0.25), inset 0 0 20px rgba(239,68,68,0.05)"
                  : "0 0 40px rgba(97,203,8,0.25), inset 0 0 20px rgba(97,203,8,0.05)",
              }}
            >
              {isCancelled ? (
                /* X icon */
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <line x1="10" y1="10" x2="30" y2="30" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"
                    style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: "drawLine 0.5s 0.3s ease both" }} />
                  <line x1="30" y1="10" x2="10" y2="30" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"
                    style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: "drawLine 0.5s 0.5s ease both" }} />
                </svg>
              ) : (
                /* Checkmark icon */
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <polyline points="8,22 18,32 36,12" stroke="#61CB08" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ strokeDasharray: 50, strokeDashoffset: 0, animation: "drawLine 0.6s 0.3s ease both" }} />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Car illustration (completed only) */}
        {!isCancelled && (
          <div className="flex justify-center mb-6" style={{ animation: "fadeSlideUp 0.5s 0.2s both" }}>
            <svg width="120" height="48" viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Road */}
              <rect x="0" y="38" width="120" height="4" rx="2" fill="#1a1a1a"/>
              <rect x="10" y="39.5" width="20" height="1" rx="0.5" fill="#61CB08" opacity="0.4"/>
              <rect x="50" y="39.5" width="20" height="1" rx="0.5" fill="#61CB08" opacity="0.4"/>
              <rect x="90" y="39.5" width="20" height="1" rx="0.5" fill="#61CB08" opacity="0.4"/>
              {/* Car body */}
              <rect x="20" y="20" width="80" height="20" rx="4" fill="#1c1c1c" stroke="#61CB08" strokeWidth="1"/>
              {/* Roof */}
              <path d="M35 20 L45 8 L75 8 L85 20Z" fill="#141414" stroke="#61CB08" strokeWidth="1"/>
              {/* Windows */}
              <rect x="47" y="10" width="12" height="8" rx="1" fill="#61CB0820" stroke="#61CB0860" strokeWidth="0.5"/>
              <rect x="62" y="10" width="12" height="8" rx="1" fill="#61CB0820" stroke="#61CB0860" strokeWidth="0.5"/>
              {/* Wheels */}
              <circle cx="38" cy="38" r="7" fill="#111" stroke="#61CB08" strokeWidth="1.5"/>
              <circle cx="38" cy="38" r="3" fill="#61CB0830"/>
              <circle cx="82" cy="38" r="7" fill="#111" stroke="#61CB08" strokeWidth="1.5"/>
              <circle cx="82" cy="38" r="3" fill="#61CB0830"/>
              {/* Headlight */}
              <rect x="97" y="24" width="5" height="3" rx="1" fill="#61CB08" opacity="0.8"/>
              {/* Tail light */}
              <rect x="18" y="24" width="4" height="3" rx="1" fill="#ef4444" opacity="0.6"/>
            </svg>
          </div>
        )}

        {/* Text content */}
        <div className="text-center mb-8" style={{ animation: "fadeSlideUp 0.5s 0.25s both" }}>
          <div
            className="inline-block text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full mb-4"
            style={{
              background: isCancelled ? "rgba(239,68,68,0.1)" : "rgba(97,203,8,0.1)",
              border: isCancelled ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(97,203,8,0.25)",
              color: isCancelled ? "#ef4444" : "#61CB08",
            }}
          >
            {isCancelled ? "Trip Cancelled" : "Trip Complete"}
          </div>

          <h1
            className="text-3xl font-black mb-3 leading-tight"
            style={{
              fontFamily: "'Georgia', serif",
              color: isCancelled ? "#ef4444" : "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            {isCancelled ? "Ride Cancelled" : "Ride Complete"}
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: "#6b7280", fontFamily: "monospace" }}>
            {isCancelled
              ? "This ride was cancelled. Head back\nand request a new one anytime."
              : "Thanks for riding with us.\nWe hope to see you again soon."}
          </p>
        </div>

     

        {/* CTA Button */}
        <div style={{ animation: "fadeSlideUp 0.5s 0.4s both" }}>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 relative overflow-hidden group"
            style={{
              background: isCancelled
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #61CB08, #4ade80)",
              color: isCancelled ? "#fff" : "#000",
              boxShadow: isCancelled
                ? "0 8px 32px rgba(239,68,68,0.3)"
                : "0 8px 32px rgba(97,203,8,0.3)",
            }}
          >
            <span className="relative z-10">
              {isCancelled ? "Back to Home" : "Back to Home"}
            </span>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: "rgba(255,255,255,0.1)" }}
            />
          </button>
        </div>

        {/* Bottom label */}
        <p className="text-center mt-6 text-xs" style={{ color: "#374151", fontFamily: "monospace" }}>
          EPIC RIDES • {new Date().getFullYear()}
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes drawLine {
          from { stroke-dashoffset: 50; }
          to   { stroke-dashoffset: 0;  }
        }
      `}</style>
    </div>
  );
};

export default RideEnded;