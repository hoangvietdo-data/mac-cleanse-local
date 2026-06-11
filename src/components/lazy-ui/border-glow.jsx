import React, { useRef, useState } from 'react';
import './border-glow.css';

export function BorderGlow({ 
  children, 
  mode = 'cursor', 
  cursorRadius = 180, 
  colors = ["#262626", "#525252", "#ffffff"],
  className = '' 
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current || mode !== 'cursor') return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const gradientColors = colors.join(', ');

  return (
    <div
      ref={containerRef}
      className={`border-glow-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--mouse-x': `${mousePos.x}px`,
        '--mouse-y': `${mousePos.y}px`,
        '--glow-radius': `${cursorRadius}px`,
        '--glow-colors': gradientColors,
      }}
    >
      <div 
        className="border-glow-effect" 
        style={{ opacity: isHovered ? 1 : 0 }}
      />
      <div className="border-glow-content">
        {children}
      </div>
    </div>
  );
}
