// components/auth/ProtectedRoute.jsx - Protection des routes authentifiées
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Afficher le spinner pendant le chargement
  if (loading) {
    return (
      <div className="auth-checking">
        <LoadingSpinner 
          size="large" 
          text="Vérification des permissions..." 
        />
      </div>
    );
  }

  // Rediriger vers login si pas connecté
  if (!user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Vérifier le rôle si requis (pour extension future)
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <div className="access-denied-icon">🚫</div>
          <h2>Accès refusé</h2>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.history.back()}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Afficher le contenu protégé
  return children;
};

export default ProtectedRoute;