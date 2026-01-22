import React, { useEffect, useRef, useState, useCallback } from "react";
import "./DropletCursor.css";

interface Splash {
  id: number;
  x: number;
  y: number;
}

export default function DropletCursor() {
  const dropletRef = useRef<HTMLDivElement>(null);
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const animationFrame = useRef<number>();
  const moveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const splashId = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const droplet = dropletRef.current;
    if (!droplet) return;

    // Calculate velocity for sway effect
    const newVelocity = {
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y
    };
    
    setVelocity(newVelocity);
    lastPos.current = { x: e.clientX, y: e.clientY };

    // Position the droplet
    droplet.style.left = `${e.clientX}px`;
    droplet.style.top = `${e.clientY}px`;

    // Calculate rotation based on movement direction
    const angle = Math.atan2(newVelocity.y, newVelocity.x) * (180 / Math.PI);
    const speed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2);
    const skewAmount = Math.min(speed * 0.8, 25);
    
    droplet.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg) skewX(${skewAmount}deg)`;

    setIsMoving(true);
    
    // Clear existing timeout
    if (moveTimeout.current) {
      clearTimeout(moveTimeout.current);
    }
    
    // Reset to neutral position after stopping
    moveTimeout.current = setTimeout(() => {
      setIsMoving(false);
      if (droplet) {
        droplet.style.transform = `translate(-50%, -50%) rotate(0deg) skewX(0deg)`;
      }
    }, 100);
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    const id = ++splashId.current;
    const newSplash: Splash = {
      id,
      x: e.clientX,
      y: e.clientY
    };

    setSplashes(prev => [...prev, newSplash]);

    // Remove splash after animation completes
    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== id));
    }, 700);
  }, []);

  useEffect(() => {
    // Hide default cursor
    document.body.style.cursor = "none";
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);

    return () => {
      document.body.style.cursor = "auto";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      if (moveTimeout.current) {
        clearTimeout(moveTimeout.current);
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [handleMouseMove, handleClick]);

  return (
    <>
      <div 
        ref={dropletRef} 
        className={`droplet-cursor ${isMoving ? "moving" : ""}`}
      >
        <svg viewBox="0 0 32 42" className="droplet-svg">
          <defs>
            <linearGradient id="dropletGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#5BA3D9" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#4A90C2" stopOpacity="0.8" />
            </linearGradient>
            <filter id="dropletShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2D5A7B" floodOpacity="0.3"/>
            </filter>
          </defs>
          <path 
            d="M16 0 C16 0 0 18 0 26 C0 34.837 7.163 42 16 42 C24.837 42 32 34.837 32 26 C32 18 16 0 16 0 Z" 
            fill="url(#dropletGradient)"
            filter="url(#dropletShadow)"
          />
          {/* Shine highlight */}
          <ellipse 
            cx="10" 
            cy="24" 
            rx="4" 
            ry="6" 
            fill="rgba(255,255,255,0.4)"
            transform="rotate(-20, 10, 24)"
          />
          <circle cx="8" cy="20" r="2" fill="rgba(255,255,255,0.6)" />
        </svg>
      </div>

      {/* Splash effects */}
      {splashes.map(splash => (
        <div 
          key={splash.id}
          className="splash-container"
          style={{ left: splash.x, top: splash.y }}
        >
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="splash-droplet"
              style={{
                "--angle": `${i * 45}deg`,
                "--delay": `${i * 20}ms`,
                "--distance": `${30 + Math.random() * 20}px`,
                "--size": `${4 + Math.random() * 4}px`
              } as React.CSSProperties}
            />
          ))}
          <div className="splash-ring" />
          <div className="splash-ring splash-ring-2" />
        </div>
      ))}
    </>
  );
}

