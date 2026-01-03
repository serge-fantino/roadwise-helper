import { useEffect, useState } from 'react';
import roadBackground from '../assets/splashscreen.jpg';
import '../styles/matrix.css';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div className="fixed inset-0 bg-[#222222] flex flex-col items-center justify-center overflow-hidden">
      {/* Route arc-en-ciel avec image de base */}
      <div className="absolute inset-0 w-full h-full">
        {/* Image de base de la route */}
        <div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-full"
          style={{
            backgroundImage: `url(${roadBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
          }}
        />
        {/* Superposition arc-en-ciel */}
        <div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-full"
          style={{
            background: `linear-gradient(180deg, 
              #F97316 0%,
              #D946EF 20%,
              #8B5CF6 40%,
              #0EA5E9 60%,
              #33C3F0 80%,
              #F2FCE2 100%
            )`,
            opacity: 0.6,
            mixBlendMode: 'overlay',
            animation: "colorPulse 2s infinite alternate"
          }}
        />
      </div>

      {/* Contenu texte au premier plan */}
      <div className="relative z-10 flex flex-col items-center">
        <h1 
          className="text-6xl font-bold mb-8 tracking-wider crt-text rainbow-text"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            animation: "textShadowPulse 2s infinite"
          }}
        >
          ROADWISE
        </h1>
        <div 
          className="matrix-text text-center space-y-4 mb-8"
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            color: '#00ff00',
            textShadow: '0 0 5px #00ff00'
          }}
        >
          <div className="text-2xl mb-2">Advanced Driver Assistance System v0.2 05012025</div>
          <div className="text-sm opacity-80 mb-6">
            Turn detection default: <span className="text-green-300 font-semibold">V1</span> (V2 experimental)
          </div>
          
          <div className="text-xl opacity-80">
            <p className="mb-4">Project Information:</p>
            <p>Original Concept & Design: Serge Fantino</p>
            <p className="mb-4">AI-Powered Development Stack:</p>
            <ul className="list-none space-y-2">
              <li>» Core Application: Lovable AI</li>
              <li>» Code Optimization: Claude & Cursor AI</li>
              <li>» Algorithm Design: Gemini 2 AI</li>
            </ul>
            <p className="mt-4 text-orange-400">
              Human Intelligence: Essential for Integration & Refinement
            </p>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-4 px-8 py-3 bg-green-500 text-black rounded-full text-xl font-mono
                   hover:bg-green-400 transition-colors duration-300 
                   shadow-lg hover:shadow-xl transform hover:scale-105
                   border-2 border-green-300"
          style={{
            textShadow: "0 0 5px rgba(0,255,0,0.5)"
          }}
        >
          INITIALIZE SYSTEM
        </button>
      </div>

      <style>
        {`
          @keyframes colorPulse {
            from { opacity: 0.6; }
            to { opacity: 0.8; }
          }

          .matrix-text {
            animation: textFlicker 0.1s infinite;
          }

          @keyframes textFlicker {
            0% { opacity: 0.95; }
            50% { opacity: 1; }
            100% { opacity: 0.95; }
          }

          .rainbow-text {
            background: linear-gradient(
              to right,
              #F97316,
              #D946EF,
              #8B5CF6,
              #0EA5E9,
              #33C3F0,
              #F2FCE2
            );
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: rainbow-move 8s linear infinite;
          }

          .crt-text {
            text-shadow: 
              0.1px 0 1px rgba(0,255,0,0.7),
              -0.1px 0 1px rgba(255,0,0,0.7),
              0 0 3px rgba(255,255,255,0.3);
            animation: textDistort 0.05s infinite;
          }

          @keyframes rainbow-move {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          @keyframes textDistort {
            0% { transform: skew(0deg); }
            25% { transform: skew(-0.5deg); }
            75% { transform: skew(0.5deg); }
            100% { transform: skew(0deg); }
          }

          @keyframes textShadowPulse {
            0% { text-shadow: 0 0 4px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3); }
            50% { text-shadow: 0 0 4px rgba(255,255,255,0.3), 0 0 5px rgba(255,255,255,0.2); }
            100% { text-shadow: 0 0 4px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3); }
          }

          /* Effet de scanlines */
          .crt-text::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              0deg,
              rgba(0,0,0,0.1),
              rgba(0,0,0,0.1) 1px,
              transparent 1px,
              transparent 2px
            );
            pointer-events: none;
          }
        `}
      </style>
    </div>
  );
};

export default SplashScreen;