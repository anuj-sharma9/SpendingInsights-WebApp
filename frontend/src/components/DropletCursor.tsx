import React, { useEffect, useState, useCallback } from "react";
import "./DropletCursor.css";

interface Splash {
  id: number;
  x: number;
  y: number;
}

export default function ClickSplash() {
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const splashIdRef = React.useRef(0);

  const handleClick = useCallback((e: MouseEvent) => {
    const id = ++splashIdRef.current;
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
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [handleClick]);

  return (
    <>
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
