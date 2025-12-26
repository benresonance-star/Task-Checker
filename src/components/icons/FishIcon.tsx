import React from 'react';

export const FishIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg 
    viewBox="0 0 32 24" 
    fill="currentColor" 
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Tail - Extra large and flowing */}
    <path d="M10,12 C10,12 4,22 0,24 L0,0 C4,2 10,12 10,12" />
    {/* Body */}
    <path d="M10,12 C10,12 14,5 20,5 C27,5 32,12 32,12 C32,12 27,19 20,19 C14,19 10,12 10,12" />
    {/* Fins */}
    <path d="M20,5 L17,1 L23,1 L20,5" opacity="0.6" />
    <path d="M20,19 L17,23 L23,23 L20,19" opacity="0.4" />
    {/* Eye */}
    <circle cx="27" cy="11" r="1.2" fill="white" />
  </svg>
);

