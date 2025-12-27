import React from 'react';

export const TomatoIcon = React.memo(({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    {/* Tomato Body - Merged path for better performance */}
    <circle cx="12" cy="12" r="9" fill="#EA4335" />
    
    {/* Green Stem */}
    <path 
      d="M12 3C12 3 11 1.5 12 1C13 0.5 14 2 13 3" 
      stroke="#34A853" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M9 3.5L12 4.5L15 3.5" 
      stroke="#34A853" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    
    {/* Clock Face Overlay - Simplified */}
    <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.2)" />
    <path d="M12 9.5V12L13.5 13" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));



