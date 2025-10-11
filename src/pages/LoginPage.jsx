// pages/LoginPage.jsx - Page de connexion moderne et élégante
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const LoginPage = () => {
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  
  // États du formulaire
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  // États UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect si déjà connecté
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <LoadingSpinner />
        <p>Vérification de l'authentification...</p>
      </div>
    );
  }

  const validateForm = () => {
    if (!email || !password) {
      setError('Email et mot de passe sont requis');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format d\'email invalide');
      return false;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (isSignUp) {
      if (!name.trim()) {
        setError('Le nom est requis pour l\'inscription');
        return false;
      }
      
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(email, password, { 
          full_name: name,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`
        });
        setSuccess('Compte créé ! Vérifiez votre email pour activer votre compte.');
        // Reset form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        // La redirection se fera automatiquement via useAuth
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'authentification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Erreur lors de la connexion avec Google');
    }
  };

  return (
    <div className="login-page">
      {/* Arrière-plan */}
      <div className="login-background">
        <div className="bg-pattern"></div>
        <div className="bg-gradient"></div>
      </div>

      {/* Contenu principal */}
      <div className="login-container">
        {/* Logo et branding */}
        <div className="login-header">
          <div className="logo">
            <div className="logo-icon">
              <span>🚀</span>
            </div>
            <h1>PROJEXOLVE</h1>
          </div>
          <p className="tagline">
            L'outil de gestion de projet révolutionnaire
          </p>
        </div>

        {/* Formulaire */}
        <div className="login-form-container">
          <div className="form-tabs">
            <button
              type="button"
              className={`tab ${!isSignUp ? 'active' : ''}`}
              onClick={() => {
                setIsSignUp(false);
                setError('');
                setSuccess('');
              }}
            >
              Connexion
            </button>
            <button
              type="button"
              className={`tab ${isSignUp ? 'active' : ''}`}
              onClick={() => {
                setIsSignUp(true);
                setError('');
                setSuccess('');
              }}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Messages */}
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                {success}
              </div>
            )}

            {/* Nom (inscription seulement) */}
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="name">Nom complet</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  required
                />
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Mot de passe */}
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {/* Confirmation mot de passe (inscription) */}
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Bouton principal */}
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-loading">
                  <LoadingSpinner size="small" />
                  {isSignUp ? 'Création...' : 'Connexion...'}
                </span>
              ) : (
                isSignUp ? 'Créer mon compte' : 'Se connecter'
              )}
            </button>

            {/* Séparateur */}
            <div className="divider">
              <span>ou</span>
            </div>

            {/* Connexion Google */}
            <button
              type="button"
              className="btn btn-google"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </button>
          </form>

          {/* Liens utiles */}
          <div className="login-footer">
            {!isSignUp && (
              <p>
                <Link to="/forgot-password" className="forgot-password">
                  Mot de passe oublié ?
                </Link>
              </p>
            )}
            
            <p className="terms">
              En continuant, vous acceptez nos{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Conditions d'utilisation
              </a>{' '}
              et notre{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Politique de confidentialité
              </a>
            </p>
          </div>
        </div>

        {/* Features highlight */}
        <div className="features-showcase">
          <h3>Pourquoi choisir PROJEXOLVE ?</h3>
          <div className="features-grid">
            <div className="feature">
              <span className="feature-icon">🎯</span>
              <div>
                <h4>Kanban Élégant</h4>
                <p>Tableaux drag & drop avec swim lanes intelligentes</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">📊</span>
              <div>
                <h4>Gantt Interactif</h4>
                <p>Planification visuelle avec dépendances automatiques</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">💰</span>
              <div>
                <h4>Budget Intégré</h4>
                <p>Suivi temps réel des coûts avec alertes prédictives</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">⚠️</span>
              <div>
                <h4>Gestion des Risques</h4>
                <p>Matrice intelligente avec plans de mitigation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;