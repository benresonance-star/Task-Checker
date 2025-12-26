import React from 'react';

export const FishIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg 
    viewBox="0 0 30 24" 
    fill="currentColor" 
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Tail - Bigger and more flowing */}
    <path d="M8,12 C8,12 3,19 1,21 L1,3 C3,5 8,12 8,12" />
    {/* Body - Slightly wider and smoother */}
    <path d="M8,12 C8,12 11,6 18,6 C25,6 29,12 29,12 C29,12 25,18 18,18 C11,18 8,12 8,12" />
    {/* Top Fin */}
    <path d="M18,6 L16,3 L20,3 L18,6" opacity="0.6" />
    {/* Bottom Fin */}
    <path d="M18,18 L16,21 L20,21 L18,18" opacity="0.4" />
    {/* Eye */}
    <circle cx="24" cy="11" r="1" fill="white" />
  </svg>
);

