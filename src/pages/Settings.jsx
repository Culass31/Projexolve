// pages/Settings.jsx - Page de paramètres utilisateur complète
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Settings = () => {
  const { user, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // États des données
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    avatar_url: '',
    company: '',
    position: '',
    phone: '',
    timezone: 'Europe/Paris',
    language: 'fr'
  });
  
  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications_email: true,
    notifications_browser: true,
    default_view: 'kanban',
    work_hours_start: '09:00',
    work_hours_end: '18:00',
    work_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    currency: 'EUR'
  });

  // États UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Onglets des paramètres
  const tabs = [
    { id: 'profile', label: '👤 Profil', icon: '👤' },
    { id: 'preferences', label: '⚙️ Préférences', icon: '⚙️' },
    { id: 'security', label: '🔒 Sécurité', icon: '🔒' },
    { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
    { id: 'account', label: '🗑️ Compte', icon: '🗑️' }
  ];

  const timezones = [
    { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
    { value: 'Europe/London', label: 'Londres (GMT+0)' },
    { value: 'America/New_York', label: 'New York (GMT-5)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' }
  ];

  const currencies = [
    { value: 'EUR', label: '€ Euro' },
    { value: 'USD', label: '$ Dollar US' },
    { value: 'GBP', label: '£ Livre Sterling' },
    { value: 'JPY', label: '¥ Yen' }
  ];

  const workDays = [
    { value: 'monday', label: 'Lundi' },
    { value: 'tuesday', label: 'Mardi' },
    { value: 'wednesday', label: 'Mercredi' },
    { value: 'thursday', label: 'Jeudi' },
    { value: 'friday', label: 'Vendredi' },
    { value: 'saturday', label: 'Samedi' },
    { value: 'sunday', label: 'Dimanche' }
  ];

  // Charger les données utilisateur
  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Charger le profil depuis les métadonnées user
      const userProfile = {
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        company: user.user_metadata?.company || '',
        position: user.user_metadata?.position || '',
        phone: user.user_metadata?.phone || '',
        timezone: user.user_metadata?.timezone || 'Europe/Paris',
        language: user.user_metadata?.language || 'fr'
      };

      // Charger les préférences depuis une table de préférences (optionnel)
      // Pour l'instant, on utilise les valeurs par défaut
      
      setProfile(userProfile);

    } catch (err) {
      console.error('Erreur chargement données utilisateur:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(profile);
      setSuccess('Profil mis à jour avec succès');
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Sauvegarder les préférences (à implémenter selon vos besoins)
      // Pour l'instant, on simule la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Préférences sauvegardées');
    } catch (err) {
      console.error('Erreur sauvegarde préférences:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      
      setSuccess('Email de réinitialisation envoyé');
    } catch (err) {
      console.error('Erreur reset password:', err);
      setError('Erreur lors de l\'envoi de l\'email');
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      // Supprimer les données utilisateur (projets, tâches, etc.)
      await supabase.from('projects').delete().eq('user_id', user.id);
      
      // Déconnecter l'utilisateur
      await signOut();
      
      navigate('/login');
    } catch (err) {
      console.error('Erreur suppression compte:', err);
      setError('Erreur lors de la suppression du compte');
    }
  };

  const handleWorkDayToggle = (day) => {
    setPreferences(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter(d => d !== day)
        : [...prev.work_days, day]
    }));
  };

  const renderProfileTab = () => (
    <form onSubmit={handleProfileSubmit} className="settings-form">
      <div className="form-section">
        <h3>Informations personnelles</h3>
        
        <div className="avatar-section">
          <div className="current-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" />
            ) : (
              <div className="default-avatar">
                {profile.full_name?.charAt(0) || profile.email?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="avatar-actions">
            <input
              type="url"
              placeholder="URL de l'avatar"
              value={profile.avatar_url}
              onChange={(e) => setProfile({...profile, avatar_url: e.target.value})}
            />
            <small>Ou utilisez un service comme gravatar.com</small>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Nom complet</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
              placeholder="Jean Dupont"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="disabled-input"
            />
            <small>L'email ne peut pas être modifié</small>
          </div>

          <div className="form-group">
            <label>Entreprise</label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile({...profile, company: e.target.value})}
              placeholder="Mon Entreprise"
            />
          </div>

          <div className="form-group">
            <label>Poste</label>
            <input
              type="text"
              value={profile.position}
              onChange={(e) => setProfile({...profile, position: e.target.value})}
              placeholder="Chef de projet"
            />
          </div>

          <div className="form-group">
            <label>Téléphone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <div className="form-group">
            <label>Fuseau horaire</label>
            <select
              value={profile.timezone}
              onChange={(e) => setProfile({...profile, timezone: e.target.value})}
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <LoadingSpinner size="small" /> : '💾'} Enregistrer
        </button>
      </div>
    </form>
  );

  const renderPreferencesTab = () => (
    <form onSubmit={handlePreferencesSubmit} className="settings-form">
      <div className="form-section">
        <h3>Interface</h3>
        
        <div className="form-group">
          <label>Thème</label>
          <div className="radio-group">
            <label className="radio-item">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={preferences.theme === 'light'}
                onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
              />
              ☀️ Clair
            </label>
            <label className="radio-item">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={preferences.theme === 'dark'}
                onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
              />
              🌙 Sombre
            </label>
            <label className="radio-item">
              <input
                type="radio"
                name="theme"
                value="auto"
                checked={preferences.theme === 'auto'}
                onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
              />
              🔄 Automatique
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Vue par défaut</label>
          <select
            value={preferences.default_view}
            onChange={(e) => setPreferences({...preferences, default_view: e.target.value})}
          >
            <option value="kanban">🎯 Kanban</option>
            <option value="gantt">📊 Gantt</option>
            <option value="pert">🔗 PERT</option>
            <option value="budget">💰 Budget</option>
          </select>
        </div>

        <div className="form-group">
          <label>Devise</label>
          <select
            value={preferences.currency}
            onChange={(e) => setPreferences({...preferences, currency: e.target.value})}
          >
            {currencies.map(currency => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-section">
        <h3>Heures de travail</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Début de journée</label>
            <input
              type="time"
              value={preferences.work_hours_start}
              onChange={(e) => setPreferences({...preferences, work_hours_start: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Fin de journée</label>
            <input
              type="time"
              value={preferences.work_hours_end}
              onChange={(e) => setPreferences({...preferences, work_hours_end: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Jours de travail</label>
          <div className="checkbox-group">
            {workDays.map(day => (
              <label key={day.value} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={preferences.work_days.includes(day.value)}
                  onChange={() => handleWorkDayToggle(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <LoadingSpinner size="small" /> : '💾'} Enregistrer
        </button>
      </div>
    </form>
  );

  const renderSecurityTab = () => (
    <div className="settings-form">
      <div className="form-section">
        <h3>Sécurité du compte</h3>
        
        <div className="security-info">
          <div className="info-item">
            <strong>Email:</strong> {user?.email}
          </div>
          <div className="info-item">
            <strong>Dernière connexion:</strong> {
              user?.last_sign_in_at 
                ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR')
                : 'N/A'
            }
          </div>
        </div>

        <div className="form-group">
          <label>Mot de passe</label>
          <div className="password-actions">
            <p>Pour changer votre mot de passe, nous vous enverrons un email de réinitialisation.</p>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handlePasswordReset}
            >
              📧 Réinitialiser le mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="settings-form">
      <div className="form-section">
        <h3>Préférences de notification</h3>
        
        <div className="form-group">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={preferences.notifications_email}
              onChange={(e) => setPreferences({...preferences, notifications_email: e.target.checked})}
            />
            📧 Notifications par email
          </label>
          <small>Recevez des emails pour les mises à jour importantes</small>
        </div>

        <div className="form-group">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={preferences.notifications_browser}
              onChange={(e) => setPreferences({...preferences, notifications_browser: e.target.checked})}
            />
            🔔 Notifications navigateur
          </label>
          <small>Recevez des notifications push dans votre navigateur</small>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="settings-form">
      <div className="form-section danger-section">
        <h3>Zone dangereuse</h3>
        <div className="danger-warning">
          ⚠️ Ces actions sont irréversibles. Procédez avec prudence.
        </div>

        <div className="danger-actions">
          <div className="danger-item">
            <div className="danger-info">
              <h4>Supprimer mon compte</h4>
              <p>Supprime définitivement votre compte et toutes vos données (projets, tâches, etc.)</p>
            </div>
            <button 
              className={`btn ${showDeleteConfirm ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={handleDeleteAccount}
            >
              {showDeleteConfirm ? '⚠️ Confirmer la suppression' : '🗑️ Supprimer le compte'}
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="confirm-delete">
              <p><strong>Êtes-vous absolument sûr ?</strong></p>
              <p>Cette action supprimera définitivement votre compte et toutes vos données.</p>
              <div className="confirm-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Annuler
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                >
                  Oui, supprimer définitivement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'preferences': return renderPreferencesTab();
      case 'security': return renderSecurityTab();
      case 'notifications': return renderNotificationsTab();
      case 'account': return renderAccountTab();
      default: return renderProfileTab();
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <LoadingSpinner />
        <p>Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Paramètres</h1>
        <p>Gérez votre profil et vos préférences</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      <div className="settings-container">
        {/* Navigation des onglets */}
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-user-info">
            <div className="user-avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" />
              ) : (
                <div className="default-avatar">
                  {profile.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="user-details">
              <div className="user-name">{profile.full_name || 'Utilisateur'}</div>
              <div className="user-email">{profile.email}</div>
            </div>
          </div>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="settings-content">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default Settings;