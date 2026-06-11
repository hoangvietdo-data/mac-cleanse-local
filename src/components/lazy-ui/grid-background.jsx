import React from 'react';
import './grid-background.css';

export function GridBackground({
  variant = 'dots',
  size = 24,
  dotSize = 1.2,
  color = 'rgba(255, 255, 255, 0.06)',
  fade = 'edges',
  className = ''
}) {
  const isDots = variant === 'dots';
  
  const backgroundStyle = isDots
    ? {
        '--grid-color': color,
        backgroundImage: `radial-gradient(var(--grid-color) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${size}px ${size}px`,
      }
    : {
        '--grid-color': color,
        backgroundImage: `linear-gradient(to right, var(--grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
      };

  return (
    <div 
      className={`grid-background-root ${fade === 'edges' ? 'fade-edges' : ''} ${className}`}
      style={backgroundStyle}
    />
  );
}
