
import React, { useId } from 'react';

export const LuckyLogo: React.FC<{ size?: number }> = ({ size = 24 }) => {
  const uniqueId = useId().replace(/:/g, "");
  const bodyGradId = `koi-body-grad-${uniqueId}`;
  const finGradId = `koi-fin-grad-${uniqueId}`;
  const glowId = `koi-glow-${uniqueId}`;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={bodyGradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="40%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={finGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F87171" stopOpacity="0.5" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <circle cx="60" cy="60" r="50" stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.2">
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="40s" repeatCount="indefinite"/>
      </circle>
      <circle cx="60" cy="60" r="35" stroke="#F59E0B" strokeWidth="0.3" opacity="0.1">
         <animate attributeName="r" values="35;40;35" dur="4s" repeatCount="indefinite" />
      </circle>
      <g transform="translate(60, 60)" filter={`url(#${glowId})`}>
        <g transform="translate(-60, -60)">
          <path d="M60 95 C 45 115, 25 105, 20 115 M60 95 C 75 115, 95 105, 100 115" stroke="none" fill="none" /> 
          <path d="M60 92 Q 40 115 25 105 L 60 98 L 95 105 Q 80 115 60 92 Z" fill={`url(#${finGradId})`}>
             <animate attributeName="d" values="M60 92 Q 40 115 25 105 L 60 98 L 95 105 Q 80 115 60 92 Z; M60 92 Q 35 120 20 110 L 60 98 L 100 110 Q 85 120 60 92 Z; M60 92 Q 40 115 25 105 L 60 98 L 95 105 Q 80 115 60 92 Z" dur="2s" repeatCount="indefinite"/>
          </path>
          <path d="M38 52 Q 15 55 10 40 Q 25 35 40 45" fill={`url(#${finGradId})`}>
             <animate attributeName="d" values="M38 52 Q 15 55 10 40 Q 25 35 40 45; M38 52 Q 10 60 5 45 Q 25 40 40 45; M38 52 Q 15 55 10 40 Q 25 35 40 45" dur="3s" repeatCount="indefinite"/>
          </path>
          <path d="M82 52 Q 105 55 110 40 Q 95 35 80 45" fill={`url(#${finGradId})`}>
             <animate attributeName="d" values="M82 52 Q 105 55 110 40 Q 95 35 80 45; M82 52 Q 110 60 115 45 Q 95 40 80 45; M82 52 Q 105 55 110 40 Q 95 35 80 45" dur="3s" repeatCount="indefinite"/>
          </path>
          <path d="M60 15 C 32 30, 28 75, 60 95 C 92 75, 88 30, 60 15 Z" fill={`url(#${bodyGradId})`} />
          <path d="M48 22 C 35 20, 25 28, 28 15" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none">
             <animate attributeName="d" values="M48 22 C 35 20, 25 28, 28 15; M48 22 C 30 18, 20 22, 25 10; M48 22 C 35 20, 25 28, 28 15" dur="4s" repeatCount="indefinite"/>
          </path>
          <path d="M72 22 C 85 20, 95 28, 92 15" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none">
             <animate attributeName="d" values="M72 22 C 85 20, 95 28, 92 15; M72 22 C 90 18, 100 22, 95 10; M72 22 C 85 20, 95 28, 92 15" dur="4s" repeatCount="indefinite"/>
          </path>
          <circle cx="48" cy="35" r="3.5" fill="white" />
          <circle cx="48" cy="35" r="1.5" fill="#1F2937" />
          <circle cx="72" cy="35" r="3.5" fill="white" />
          <circle cx="72" cy="35" r="1.5" fill="#1F2937" />
        </g>
      </g>
    </svg>
  );
};
