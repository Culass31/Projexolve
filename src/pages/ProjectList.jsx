// pages/ProjectList.jsx - Liste complète des projets avec filtres et recherche
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProjectList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // États des données
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États des filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // grid ou list

  // Options de filtres
  const statusOptions = [
    { value: 'all', label: 'Tous les statuts', count: 0 },
    { value: 'En cours', label: 'En cours', count: 0 },
    { value: 'Terminé', label: 'Terminés', count: 0 },
    { value: 'En attente', label: 'En attente', count: 0 },
    { value: 'Annulé', label: 'Annulés', count: 0 }
  ];

  const sortOptions = [
    { value: 'updated_at', label: 'Dernière modification' },
    { value: 'created_at', label: 'Date de création' },
    { value: 'name', label: 'Nom du projet' },
    { value: 'start_date', label: 'Date de début' },
    { value: 'total_budget', label: 'Budget' }
  ];

  // Charger les projets
  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_health')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      
    } catch (err) {
      console.error('Erreur chargement projets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer et trier les projets
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Gestion des valeurs nulles
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Gestion des dates
      if (sortBy.includes('_at') || sortBy.includes('_date')) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Gestion des nombres
      if (sortBy === 'total_budget') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Tri alphabétique pour les strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, searchTerm, statusFilter, sortBy, sortOrder]);

  // Calculer les compteurs de statut
  const statusCounts = useMemo(() => {
    const counts = { all: projects.length };
    
    projects.forEach(project => {
      const status = project.status || 'En cours';
      counts[status] = (counts[status] || 0) + 1;
    });

    return statusOptions.map(option => ({
      ...option,
      count: counts[option.value] || 0
    }));
  }, [projects]);

  const getStatusColor = (status) => {
    const colors = {
      'En cours': '#3b82f6',
      'Terminé': '#22c55e',
      'En attente': '#f59e0b',
      'Annulé': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getProjectHealth = (project) => {
    let score = 100;
    
    // Pénalité pour les tâches en retard
    if (project.overdue_tasks > 0) score -= project.overdue_tasks * 10;
    
    // Pénalité pour dépassement budget
    if (project.total_budget > 0 && project.spent_budget > project.total_budget) {
      score -= 20;
    }
    
    // Pénalité pour risques élevés
    if (project.open_risks > 0) score -= project.open_risks * 5;
    
    score = Math.max(0, Math.min(100, score));
    
    if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
    if (score >= 60) return { label: 'Bon', color: '#f59e0b' };
    return { label: 'Attention', color: '#ef4444' };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.project_id !== projectId));
    } catch (err) {
      console.error('Erreur suppression projet:', err);
      alert('Erreur lors de la suppression du projet');
    }
  };

  if (loading) {
    return (
      <div className="project-list-loading">
        <LoadingSpinner />
        <p>Chargement des projets...</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {/* En-tête */}
      <div className="project-list-header">
        <div className="header-title">
          <h1>📋 Mes Projets</h1>
          <p>{filteredAndSortedProjects.length} projet(s) trouvé(s)</p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/projects/new')}
        >
          ➕ Nouveau projet
        </button>
      </div>

      {/* Barre de filtres */}
      <div className="filters-bar">
        <div className="filters-left">
          {/* Recherche */}
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Rechercher un projet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filtres de statut */}
          <div className="status-filters">
            {statusCounts.map(status => (
              <button
                key={status.value}
                className={`filter-chip ${statusFilter === status.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(status.value)}
              >
                {status.label} ({status.count})
              </button>
            ))}
          </div>
        </div>

        <div className="filters-right">
          {/* Tri */}
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('_');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="sort-select"
          >
            {sortOptions.map(option => (
              <React.Fragment key={option.value}>
                <option value={`${option.value}_desc`}>
                  {option.label} (↓)
                </option>
                <option value={`${option.value}_asc`}>
                  {option.label} (↑)
                </option>
              </React.Fragment>
            ))}
          </select>

          {/* Mode d'affichage */}
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vue liste"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="error-message">
          <span>⚠️ Erreur: {error}</span>
          <button className="btn btn-secondary" onClick={loadProjects}>
            Réessayer
          </button>
        </div>
      )}

      {/* Liste des projets */}
      {filteredAndSortedProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>
            {searchTerm || statusFilter !== 'all' 
              ? 'Aucun projet trouvé' 
              : 'Aucun projet créé'
            }
          </h3>
          <p>
            {searchTerm || statusFilter !== 'all'
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Créez votre premier projet pour commencer'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/projects/new')}
            >
              Créer un projet
            </button>
          )}
        </div>
      ) : (
        <div className={`projects-container ${viewMode}`}>
          {filteredAndSortedProjects.map((project) => {
            const health = getProjectHealth(project);
            const completionRate = project.total_tasks > 0 
              ? Math.round(((project.completed_tasks || 0) / project.total_tasks) * 100)
              : 0;

            return (
              <div key={project.project_id} className="project-item">
                {/* En-tête du projet */}
                <div className="project-header">
                  <div className="project-title">
                    <div 
                      className="project-color"
                      style={{ backgroundColor: project.color || '#3b82f6' }}
                    />
                    <div className="project-info">
                      <Link 
                        to={`/projects/${project.project_id}`}
                        className="project-name"
                      >
                        {project.project_name}
                      </Link>
                      <div className="project-meta">
                        <span 
                          className="project-status"
                          style={{ color: getStatusColor(project.status) }}
                        >
                          {project.status}
                        </span>
                        <span className="project-dates">
                          Créé le {formatDate(project.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="project-actions">
                    <div 
                      className="health-indicator"
                      style={{ color: health.color }}
                      title={`Santé du projet: ${health.label}`}
                    >
                      {health.label}
                    </div>
                    
                    <div className="action-buttons">
                      <Link 
                        to={`/projects/${project.project_id}`}
                        className="btn btn-secondary btn-small"
                      >
                        Ouvrir
                      </Link>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteProject(project.project_id)}
                        title="Supprimer le projet"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Métriques du projet */}
                <div className="project-metrics">
                  <div className="metric">
                    <span className="metric-icon">✅</span>
                    <div className="metric-info">
                      <span className="metric-value">
                        {project.completed_tasks || 0} / {project.total_tasks || 0}
                      </span>
                      <span className="metric-label">Tâches</span>
                    </div>
                  </div>

                  {project.total_budget > 0 && (
                    <div className="metric">
                      <span className="metric-icon">💰</span>
                      <div className="metric-info">
                        <span className="metric-value">
                          {formatCurrency(project.spent_budget || 0)}
                        </span>
                        <span className="metric-label">
                          / {formatCurrency(project.total_budget)}
                        </span>
                      </div>
                    </div>
                  )}

                  {project.critical_tasks > 0 && (
                    <div className="metric critical">
                      <span className="metric-icon">⚡</span>
                      <div className="metric-info">
                        <span className="metric-value">{project.critical_tasks}</span>
                        <span className="metric-label">Critiques</span>
                      </div>
                    </div>
                  )}

                  {project.open_risks > 0 && (
                    <div className="metric risks">
                      <span className="metric-icon">⚠️</span>
                      <div className="metric-info">
                        <span className="metric-value">{project.open_risks}</span>
                        <span className="metric-label">Risques</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Barre de progression */}
                <div className="project-progress">
                  <div className="progress-info">
                    <span>Progression</span>
                    <span>{completionRate}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${completionRate}%`,
                        backgroundColor: completionRate === 100 ? '#22c55e' : '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectList;