import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
}

const Logo: React.FC<LogoProps> = ({ width = 100, height = 110 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield Background */}
      <path
        d="M50 5 L90 20 L90 60 Q90 85 50 105 Q10 85 10 60 L10 20 Z"
        fill="#002766"
        stroke="#c62828"
        strokeWidth="3"
      />
      
      {/* Alert Triangle */}
      <path
        d="M50 30 L65 55 L35 55 Z"
        fill="#c62828"
      />
      
      {/* DRS Text */}
      <text
        x="50"
        y="75"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
      >
        DRS
      </text>
    </svg>
  );
};

export default Logo;