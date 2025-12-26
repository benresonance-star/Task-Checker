import React from 'react';

export const FishIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Body */}
    <path d="M2,12 C2,12 5,7 12,7 C19,7 22,12 22,12 C22,12 19,17 12,17 C5,17 2,12 2,12" />
    {/* Tail */}
    <path d="M2,12 L-1,16 L-1,8 L2,12" />
    {/* Fin */}
    <path d="M12,7 L10,5 L14,5 L12,7" opacity="0.5" />
    {/* Eye */}
    <circle cx="18" cy="11" r="0.8" fill="white" />
  </svg>
);

