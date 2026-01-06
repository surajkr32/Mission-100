
import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setOpacity(1);
    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(onComplete, 800); // Wait for fade out
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-600 transition-opacity duration-700 ease-in-out"
      style={{ opacity }}
    >
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-white p-6 rounded-full shadow-2xl animate-pulse">
            <Target className="w-20 h-20 text-blue-600" />
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4 italic drop-shadow-lg">
          MISSION 100%
        </h1>
        <p className="text-blue-100 text-xl font-medium tracking-widest uppercase">
          Your Journey to Board Excellence
        </p>
      </div>
      
      <div className="absolute bottom-12 text-white/60 animate-bounce">
        Preparing your study material...
      </div>
    </div>
  );
};

export default SplashScreen;
