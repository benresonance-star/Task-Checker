import React from 'react';

export const FishIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M22,12C22,12 19,15 15,15C11,15 8,11 2,12C2,12 5,13 5,16C5,19 2,20 2,20C8,21 11,17 15,17C19,17 22,20 22,20V12Z" />
    <circle cx="18" cy="13.5" r="1" fill="white" />
  </svg>
);

