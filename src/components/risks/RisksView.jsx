// components/risks/RisksView.jsx - Vue gestion des risques avec matrice
import React, { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import LoadingSpinner from '../common/LoadingSpinner';

const RisksView = () => {
  const { 
    risks, 
    createRisk, 
    updateRisk,
    loading 
  } = useProject();

  const [activeView, setActiveView] = useState('matrix');
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showAddRisk, setShowAddRisk] = useState(false);

  const views = [
    { id: 'matrix', label: 'Matrice', icon: '🎯' },
    { id: 'list', label: 'Liste', icon: '📋' },
    { id: 'categories', label: 'Catégories', icon: '📂' }
  ];

  // Matrice 5x5 Probabilité × Impact
  const probabilityLevels = [
    { id: 5, label: 'Très élevée', color: '#dc2626' },
    { id: 4, label: 'Élevée', color: '#ea580c' },
    { id: 3, label: 'Moyenne', color: '#ca8a04' },
    { id: 2, label: 'Faible', color: '#65a30d' },
    { id: 1, label: 'Très faible', color: '#059669' }
  ];

  const impactLevels = [
    { id: 1, label: 'Très faible', color: '#059669' },
    { id: 2, label: 'Faible', color: '#65a30d' },
    { id: 3, label: 'Moyen', color: '#ca8a04' },
    { id: 4, label: 'Élevé', color: '#ea580c' },
    { id: 5, label: 'Très élevé', color: '#dc2626' }
  ];

  const getRiskColor = (score) => {
    if (score >= 20) return '#dc2626'; // Rouge foncé
    if (score >= 15) return '#ea580c'; // Rouge
    if (score >= 10) return '#ca8a04'; // Orange
    if (score >= 5) return '#65a30d';  // Vert/jaune
    return '#059669'; // Vert
  };

  const getRiskLevel = (score) => {
    if (score >= 20) return 'Critique';
    if (score >= 15) return 'Élevé';
    if (score >= 10) return 'Moyen';
    if (score >= 5) return 'Faible';
    return 'Très faible';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="risks-loading">
        <LoadingSpinner size="large" text="Chargement des risques..." />
      </div>
    );
  }

  const renderMatrix = () => (
    <div className="risks-matrix-view">
      <div className="matrix-container">
        <div className="matrix-grid">
          {/* Légendes */}
          <div className="matrix-legend-corner"></div>
          
          {/* Légende horizontale (Impact) */}
          {impactLevels.map(level => (
            <div key={`impact-${level.id}`} className="matrix-legend-horizontal">
              <div className="legend-label">{level.label}</div>
              <div className="legend-sublabel">Impact {level.id}</div>
            </div>
          ))}
          
          {/* Grille principale */}
          {probabilityLevels.map(probLevel => (
            <React.Fragment key={`prob-${probLevel.id}`}>
              {/* Légende verticale (Probabilité) */}
              <div className="matrix-legend-vertical">
                <div className="legend-label">{probLevel.label}</div>
                <div className="legend-sublabel">Prob. {probLevel.id}</div>
              </div>
              
              {/* Cellules de la matrice */}
              {impactLevels.map(impactLevel => {
                const score = probLevel.id * impactLevel.id;
                const cellRisks = risks.filter(risk => 
                  risk.probability_score === probLevel.id && 
                  risk.impact_score === impactLevel.id
                );
                
                return (
                  <div
                    key={`cell-${probLevel.id}-${impactLevel.id}`}
                    className={`matrix-cell level-${getRiskLevel(score).toLowerCase().replace(' ', '-')}`}
                    style={{ 
                      backgroundColor: `${getRiskColor(score)}20`,
                      borderColor: getRiskColor(score)
                    }}
                    onClick={() => {
                      if (cellRisks.length === 0) {
                        // Créer nouveau risque avec ces coordonnées
                        setShowAddRisk({ probability: probLevel.id, impact: impactLevel.id });
                      }
                    }}
                  >
                    <div className="cell-score">{score}</div>
                    <div className="cell-risks">
                      {cellRisks.map(risk => (
                        <div
                          key={risk.id}
                          className="risk-dot"
                          title={risk.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRisk(risk);
                          }}
                        >
                          {risk.title.charAt(0)}
                        </div>
                      ))}
                    </div>
                    {cellRisks.length === 0 && (
                      <div className="cell-add">+</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Légende des niveaux */}
        <div className="matrix-levels">
          <div className="level critique">Critique (20-25)</div>
          <div className="level elevé">Élevé (15-19)</div>
          <div className="level moyen">Moyen (10-14)</div>
          <div className="level faible">Faible (5-9)</div>
          <div className="level très-faible">Très faible (1-4)</div>
        </div>
      </div>

      {/* Panneau de détails du risque */}
      {selectedRisk && (
        <div className="risk-details-panel">
          <div className="risk-details-header">
            <h4>{selectedRisk.title}</h4>
            <button 
              className="close-details"
              onClick={() => setSelectedRisk(null)}
            >
              ×
            </button>
          </div>
          
          <div className="risk-details-content">
            <div className="risk-score-display">
              <div 
                className="score-badge"
                style={{ backgroundColor: getRiskColor(selectedRisk.risk_score) }}
              >
                {selectedRisk.risk_score}
              </div>
              <div className="score-level">
                {getRiskLevel(selectedRisk.risk_score)}
              </div>
            </div>

            <div className="risk-info">
              <p className="risk-description">{selectedRisk.description}</p>
              
              <div className="risk-meta">
                <div className="meta-item">
                  <span className="meta-label">Catégorie:</span>
                  <span className="meta-value">{selectedRisk.category || 'Non définie'}</span>
                </div>
                
                <div className="meta-item">
                  <span className="meta-label">Statut:</span>
                  <span className={`meta-value status ${selectedRisk.status?.toLowerCase()}`}>
                    {selectedRisk.status || 'Identifié'}
                  </span>
                </div>
                
                <div className="meta-item">
                  <span className="meta-label">Date limite:</span>
                  <span className="meta-value">
                    {formatDate(selectedRisk.target_resolution_date)}
                  </span>
                </div>
              </div>

              <div className="risk-actions">
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => {/* TODO: Modifier */}}
                >
                  Modifier
                </button>
                <button 
                  className="btn btn-primary btn-small"
                  onClick={() => {/* TODO: Plan mitigation */}}
                >
                  Plan de mitigation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderList = () => (
    <div className="risks-list-view">
      <div className="risks-header">
        <h3>📋 Liste des risques</h3>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddRisk(true)}
        >
          ➕ Nouveau risque
        </button>
      </div>

      {risks.length === 0 ? (
        <div className="no-risks">
          <div className="empty-icon">⚠️</div>
          <h4>Aucun risque identifié</h4>
          <p>Commencez par identifier les risques de votre projet</p>
        </div>
      ) : (
        <div className="risks-table">
          <div className="table-header">
            <div className="col-title">Risque</div>
            <div className="col-category">Catégorie</div>
            <div className="col-score">Score</div>
            <div className="col-status">Statut</div>
            <div className="col-date">Échéance</div>
            <div className="col-actions">Actions</div>
          </div>
          
          {risks
            .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
            .map(risk => (
              <div key={risk.id} className="table-row">
                <div className="col-title">
                  <div className="risk-title">{risk.title}</div>
                  <div className="risk-description">
                    {risk.description?.substring(0, 100)}...
                  </div>
                </div>
                
                <div className="col-category">
                  <span className="category-badge">
                    {risk.category || 'Non définie'}
                  </span>
                </div>
                
                <div className="col-score">
                  <div 
                    className="score-indicator"
                    style={{ backgroundColor: getRiskColor(risk.risk_score || 0) }}
                  >
                    {risk.risk_score || 0}
                  </div>
                  <span className="score-level">
                    {getRiskLevel(risk.risk_score || 0)}
                  </span>
                </div>
                
                <div className="col-status">
                  <span className={`status-badge ${risk.status?.toLowerCase()}`}>
                    {risk.status || 'Identifié'}
                  </span>
                </div>
                
                <div className="col-date">
                  {formatDate(risk.target_resolution_date)}
                </div>
                
                <div className="col-actions">
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => setSelectedRisk(risk)}
                  >
                    Voir
                  </button>
                  <button 
                    className="btn btn-primary btn-small"
                    onClick={() => {/* TODO: Modifier */}}
                  >
                    Modifier
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderCategories = () => (
    <div className="risks-categories-view">
      <h3>📂 Catégories de risques</h3>
      <div className="categories-placeholder">
        <p>Gestion des catégories de risques à implémenter</p>
        <div className="category-examples">
          <div className="category-item">🔧 Technique</div>
          <div className="category-item">💰 Budget</div>
          <div className="category-item">📅 Planning</div>
          <div className="category-item">👥 Ressources</div>
          <div className="category-item">🌍 Externe</div>
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'matrix': return renderMatrix();
      case 'list': return renderList();
      case 'categories': return renderCategories();
      default: return renderMatrix();
    }
  };

  return (
    <div className="risks-view">
      {/* En-tête */}
      <div className="risks-header">
        <h2>⚠️ Gestion des Risques</h2>
        <div className="risks-summary">
          <span className="total-risks">{risks.length} risque(s)</span>
          <span className="high-risks">
            {risks.filter(r => (r.risk_score || 0) >= 15).length} critique(s)
          </span>
        </div>
      </div>

      {/* Navigation des vues */}
      <div className="risks-views">
        {views.map(view => (
          <button
            key={view.id}
            className={`risks-view-tab ${activeView === view.id ? 'active' : ''}`}
            onClick={() => setActiveView(view.id)}
          >
            <span className="tab-icon">{view.icon}</span>
            {view.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="risks-content">
        {renderActiveView()}
      </div>

      {/* Modal d'ajout de risque */}
      {showAddRisk && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nouveau risque</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddRisk(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Formulaire d'ajout de risque à implémenter</p>
              {typeof showAddRisk === 'object' && (
                <p>Pré-rempli: Probabilité {showAddRisk.probability}, Impact {showAddRisk.impact}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RisksView;