import { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#222222] flex flex-col items-center justify-center overflow-hidden">
      <h1 
        className="text-6xl font-bold text-white mb-8 tracking-wider"
        style={{
          textShadow: "0 0 10px rgba(255,255,255,0.5)",
          fontFamily: "'Orbitron', sans-serif"
        }}
      >
        ROADWISE
      </h1>
      
      {/* Route arc-en-ciel en S */}
      <div className="relative w-full h-[60vh]">
        <div 
          className="absolute bottom-0 left-1/2 w-32 h-full transform -translate-x-1/2"
          style={{
            background: `linear-gradient(180deg, 
              #F97316 0%,
              #D946EF 20%,
              #8B5CF6 40%,
              #0EA5E9 60%,
              #33C3F0 80%,
              #F2FCE2 100%
            )`,
            clipPath: "path('M 0,400 C 50,300 -50,200 0,100 C 50,0 -50,-100 0,-200')",
            filter: "blur(20px)",
            opacity: 0.7,
            animation: "roadPulse 2s infinite alternate"
          }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;