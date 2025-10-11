// components/common/LoadingSpinner.jsx - Composant de chargement réutilisable
import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = '', 
  overlay = false,
  className = '' 
}) => {
  
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium', 
    large: 'spinner-large'
  };

  const colorClasses = {
    primary: 'spinner-primary',
    secondary: 'spinner-secondary',
    white: 'spinner-white',
    dark: 'spinner-dark'
  };

  const spinnerClass = `
    loading-spinner 
    ${sizeClasses[size] || sizeClasses.medium}
    ${colorClasses[color] || colorClasses.primary}
    ${className}
  `.trim();

  const SpinnerElement = () => (
    <div className="spinner-container">
      <div className={spinnerClass}>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
      </div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );

  // Spinner avec overlay
  if (overlay) {
    return (
      <div className="spinner-overlay">
        <SpinnerElement />
      </div>
    );
  }

  // Spinner simple
  return <SpinnerElement />;
};

// Variantes spécialisées
export const PageLoader = ({ message = 'Chargement...' }) => (
  <div className="page-loader">
    <LoadingSpinner size="large" text={message} />
  </div>
);

export const InlineLoader = ({ text = '' }) => (
  <LoadingSpinner size="small" text={text} />
);

export const ButtonLoader = () => (
  <LoadingSpinner size="small" color="white" className="button-spinner" />
);

export const OverlayLoader = ({ message = 'Traitement en cours...' }) => (
  <LoadingSpinner size="medium" text={message} overlay={true} />
);

export default LoadingSpinner;