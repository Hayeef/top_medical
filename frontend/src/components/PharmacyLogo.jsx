import React from 'react';

export default function PharmacyLogo({ size = 36, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <defs>
        {/* Blue Ribbon Gradient */}
        <linearGradient id="tmBlueGrad" x1="20" y1="20" x2="130" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0077c8" />
          <stop offset="35%" stopColor="#0284c7" />
          <stop offset="70%" stopColor="#00b4d8" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        <linearGradient id="tmBlueHighlight" x1="30" y1="20" x2="110" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>

        {/* Green Ribbon Gradient */}
        <linearGradient id="tmGreenGrad" x1="180" y1="180" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4d7c0f" />
          <stop offset="30%" stopColor="#65a30d" />
          <stop offset="65%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#a3e635" />
        </linearGradient>

        <linearGradient id="tmGreenHighlight" x1="170" y1="180" x2="90" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3f6212" />
          <stop offset="50%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#bef264" />
        </linearGradient>

        {/* Soft shadow */}
        <filter id="tmLogoGlow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* BLUE UPPER-LEFT ARM RIBBON */}
      <g filter="url(#tmLogoGlow)">
        {/* Main Blue Body */}
        <path
          d="M 74 18 
             L 126 18 
             L 126 74 
             C 126 74, 115 88, 92 106 
             C 74 120, 56 126, 56 126 
             L 20 126 
             L 20 74 
             L 74 74 
             Z"
          fill="url(#tmBlueGrad)"
        />

        {/* Blue Curved Dynamic Inner Flange */}
        <path
          d="M 126 18 
             C 126 65, 112 102, 68 132 
             L 20 126 
             C 54 114, 82 86, 92 50 
             L 74 18 
             Z"
          fill="url(#tmBlueHighlight)"
          opacity="0.9"
        />

        {/* Blue Ribbed Texture Lines */}
        <path
          d="M 82 22 C 100 55, 96 85, 48 116"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.4"
          fill="none"
        />
        <path
          d="M 94 22 C 110 58, 104 92, 60 122"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.4"
          fill="none"
        />
        <path
          d="M 108 22 C 120 55, 114 98, 72 125"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.4"
          fill="none"
        />
        <path
          d="M 118 30 C 124 58, 118 85, 84 112"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.3"
          fill="none"
        />
      </g>

      {/* GREEN LOWER-RIGHT ARM RIBBON */}
      <g filter="url(#tmLogoGlow)">
        {/* Main Green Body */}
        <path
          d="M 126 182 
             L 74 182 
             L 74 126 
             C 74 126, 85 112, 108 94 
             C 126 80, 144 74, 144 74 
             L 180 74 
             L 180 126 
             L 126 126 
             Z"
          fill="url(#tmGreenGrad)"
        />

        {/* Green Curved Dynamic Inner Flange */}
        <path
          d="M 74 182 
             C 74 135, 88 98, 132 68 
             L 180 74 
             C 146 86, 118 114, 108 150 
             L 126 182 
             Z"
          fill="url(#tmGreenHighlight)"
          opacity="0.9"
        />

        {/* Green Ribbed Texture Lines */}
        <path
          d="M 118 178 C 100 145, 104 115, 152 84"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.45"
          fill="none"
        />
        <path
          d="M 106 178 C 90 142, 96 108, 140 78"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.45"
          fill="none"
        />
        <path
          d="M 92 178 C 80 145, 86 102, 128 75"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.45"
          fill="none"
        />
        <path
          d="M 82 170 C 76 142, 82 115, 116 88"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.3"
          fill="none"
        />
      </g>
    </svg>
  );
}
