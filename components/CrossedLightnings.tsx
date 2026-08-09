import React from 'react';

interface CrossedLightningsProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export const CrossedLightnings: React.FC<CrossedLightningsProps> = ({
  size = 28,
  primaryColor = '#004a99', // Azul Energisa
  secondaryColor = '#ffcc00', // Amarelo Energisa
  className = ''
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Prime - Raio 1 (-26deg) */}
        <g transform="rotate(-26 12 12)">
          <path
            d="M13 2L4 13H11L9 22L20 10H12L13 2Z"
            fill={primaryColor}
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>
        {/* Segundo - Raio 2 (+26deg) */}
        <g transform="rotate(26 12 12)">
          <path
            d="M13 2L4 13H11L9 22L20 10H12L13 2Z"
            fill={secondaryColor}
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
};

export default CrossedLightnings;
