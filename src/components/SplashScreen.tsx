import { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#222222] flex flex-col items-center justify-center overflow-hidden">
      {/* Route arc-en-ciel avec image de base */}
      <div className="absolute inset-0 w-full h-full">
        {/* Image de base de la route */}
        <div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-full"
          style={{
            backgroundImage: "url('/artefacts/route2.jpg')",
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
          className="text-6xl font-bold text-white mb-8 tracking-wider"
          style={{
            textShadow: "0 0 10px rgba(255,255,255,0.5)",
            fontFamily: "'Orbitron', sans-serif"
          }}
        >
          ROADWISE
        </h1>
        <h2 className="text-2xl text-white mb-8 tracking-wider">
          <span className="text-orange-500">Driver Assistant</span>
        </h2>
        <h3 className="text-xl text-white mb-8 tracking-wider">
          <span className="text-orange-500">Original Idea & Design by Serge Fantino</span><br/>
          <span className="text-orange-500">Coded with lot's of IA:</span><br/>
          <ul className="list-disc list-inside">
            <li>Lovable for the main application code</li>
            <li>Claude & Cursor for editing code & optimisation</li>
            <li>Gemini2 for advanced algorithms conceptions and documentation</li>
          </ul>
          <span className="text-orange-500">Still this need lot's of Human work to make sense of it all!</span><br/>
        </h3>

        {/* Nouveau bouton */}
        <button
          onClick={onComplete}
          className="mt-4 px-8 py-3 bg-orange-500 text-white rounded-full text-xl font-semibold 
                   hover:bg-orange-600 transition-colors duration-300 
                   shadow-lg hover:shadow-xl transform hover:scale-105"
          style={{
            textShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}
        >
          Drive Safely
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;