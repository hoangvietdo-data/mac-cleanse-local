import React, { useEffect, useState } from 'react';
import './text-warp.css';

export function TextWarp({ text, trigger, className = '' }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey(prev => prev + 1);
  }, [trigger, text]);

  return (
    <span key={key} className={`text-warp-container ${className}`}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="text-warp-char"
          style={{ animationDelay: `${index * 15}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
