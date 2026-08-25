import React from 'react';
import topLogoImg from '../assets/logo_top.png';

export default function PharmacyLogo({ size = 36, className = '', style = {}, alt = 'Top Medical Pharmacy' }) {
  return (
    <img
      src={topLogoImg}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        flexShrink: 0,
        borderRadius: '6px',
        ...style
      }}
    />
  );
}
