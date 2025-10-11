// components/pert/PertView.jsx - Vue PERT avec calculs automatiques
import React, { useEffect, useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PertView = () => {
  const { 
    tasks, 
    dependencies, 
    loading,
    scheduleData
  } = useProject();

  const [pertData, setPertData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Calculer les données PERT
  useEffect(() => {
    if (tasks.length > 0) {
      calculatePertData();
    }
  }, [tasks, dependencies, scheduleData]);

  const calculatePertData = () => {
    // Créer les noeuds PERT
    const nodes = tasks.map(task => ({
      id: task.id,
      name: task.name,
      duration: task.duration || 1,
      earlyStart: task.early_start ? new Date(task.early_start) : null,
      earlyFinish: task.early_finish ? new Date(task.early_finish) : null,
      lateStart: task.late_start ? new Date(task.late_start) : null,
      lateFinish: task.late_finish ? new Date(task.late_finish) : null,
      totalFloat: task.total_float || 0,
      freeFloat: task.free_float || 0,
      isCritical: task.is_critical || false,
      // Position pour le rendu (à calculer)
      x: 0,
      y: 0
    }));

    // Créer les liens
    const links = dependencies.map(dep => ({
      from: dep.predecessor_id,
      to: dep.successor_id,
      type: dep.dependency_type || 'FS'
    }));

    // Calculer les positions (algorithme simple)
    calculateNodePositions(nodes, links);

    setPertData({ nodes, links });
  };

  const calculateNodePositions = (nodes, links) => {
    // Algorithme simple de positionnement par niveaux
    const levels = [];
    const visited = new Set();
    
    // Trouver les nœuds de départ (sans prédécesseurs)
    const startNodes = nodes.filter(node => 
      !links.some(link => link.to === node.id)
    );

    // BFS pour calculer les niveaux
    let queue = startNodes.map(node => ({ node, level: 0 }));
    
    while (queue.length > 0) {
      const { node, level } = queue.shift();
      
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      
      if (!levels[level]) levels[level] = [];
      levels[level].push(node);
      
      // Ajouter les successeurs au niveau suivant
      const successors = links
        .filter(link => link.from === node.id)
        .map(link => nodes.find(n => n.id === link.to))
        .filter(Boolean);
        
      successors.forEach(successor => {
        if (!visited.has(successor.id)) {
          queue.push({ node: successor, level: level + 1 });
        }
      });
    }

    // Positionner les nœuds
    const nodeWidth = 150;
    const nodeHeight = 100;
    const horizontalSpacing = 200;
    const verticalSpacing = 150;

    levels.forEach((levelNodes, levelIndex) => {
      levelNodes.forEach((node, nodeIndex) => {
        node.x = levelIndex * horizontalSpacing + 100;
        node.y = (nodeIndex - (levelNodes.length - 1) / 2) * verticalSpacing + 300;
      });
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const formatFloat = (float) => {
    return float || float === 0 ? `${float}j` : 'N/A';
  };

  if (loading) {
    return (
      <div className="pert-loading">
        <LoadingSpinner size="large" text="Chargement du PERT..." />
      </div>
    );
  }

  return (
    <div className="pert-view">
      {/* Barre d'outils PERT */}
      <div className="pert-toolbar">
        <div className="toolbar-left">
          <h2>🔗 Réseau PERT</h2>
          <p>
            {tasks.length} tâche(s) • 
            {dependencies.length} dépendance(s) • 
            {tasks.filter(t => t.is_critical).length} critique(s)
          </p>
        </div>
        
        <div className="toolbar-right">
          <button className="btn btn-secondary">
            🔍 Ajuster à l'écran
          </button>
          <button className="btn btn-secondary">
            📐 Réorganiser
          </button>
          <button className="btn btn-primary">
            📊 Statistiques
          </button>
        </div>
      </div>

      {/* Légende PERT */}
      <div className="pert-legend">
        <div className="legend-item">
          <div className="legend-node critical-node"></div>
          <span>Tâches critiques (marge = 0)</span>
        </div>
        <div className="legend-item">
          <div className="legend-node normal-node"></div>
          <span>Tâches normales</span>
        </div>
        <div className="legend-item">
          <div className="legend-arrow"></div>
          <span>Dépendances</span>
        </div>
        <div className="legend-item">
          <div className="legend-path"></div>
          <span>Chemin critique</span>
        </div>
      </div>

      {/* Diagramme PERT */}
      <div className="pert-container">
        {tasks.length === 0 ? (
          <div className="pert-empty">
            <div className="empty-icon">🔗</div>
            <h3>Aucune tâche à afficher</h3>
            <p>Ajoutez des tâches et des dépendances pour voir le réseau PERT</p>
          </div>
        ) : !pertData ? (
          <div className="pert-calculating">
            <LoadingSpinner text="Calcul du réseau PERT..." />
          </div>
        ) : (
          <div className="pert-diagram">
            {/* SVG Container */}
            <svg className="pert-svg" viewBox="0 0 1200 800">
              {/* Liens entre nœuds */}
              {pertData.links.map((link, index) => {
                const fromNode = pertData.nodes.find(n => n.id === link.from);
                const toNode = pertData.nodes.find(n => n.id === link.to);
                
                if (!fromNode || !toNode) return null;
                
                const isCriticalPath = fromNode.isCritical && toNode.isCritical;
                
                return (
                  <g key={`link-${index}`}>
                    <line
                      x1={fromNode.x + 75}
                      y1={fromNode.y + 50}
                      x2={toNode.x + 75}
                      y2={toNode.y + 50}
                      stroke={isCriticalPath ? '#ef4444' : '#6b7280'}
                      strokeWidth={isCriticalPath ? 3 : 2}
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}
              
              {/* Nœuds de tâches */}
              {pertData.nodes.map(node => (
                <g key={node.id}>
                  {/* Rectangle du nœud */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width="150"
                    height="100"
                    fill={node.isCritical ? '#fef2f2' : '#f8fafc'}
                    stroke={node.isCritical ? '#ef4444' : '#3b82f6'}
                    strokeWidth={node.isCritical ? 3 : 2}
                    rx="8"
                    className="pert-node"
                    onClick={() => setSelectedNode(node)}
                    style={{ cursor: 'pointer' }}
                  />
                  
                  {/* Nom de la tâche */}
                  <text
                    x={node.x + 75}
                    y={node.y + 20}
                    textAnchor="middle"
                    className="node-title"
                    fill={node.isCritical ? '#dc2626' : '#1f2937'}
                  >
                    {node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name}
                  </text>
                  
                  {/* Informations de planification */}
                  <text x={node.x + 10} y={node.y + 40} className="node-info" fill="#6b7280">
                    ES: {formatDate(node.earlyStart)}
                  </text>
                  <text x={node.x + 10} y={node.y + 55} className="node-info" fill="#6b7280">
                    EF: {formatDate(node.earlyFinish)}
                  </text>
                  <text x={node.x + 10} y={node.y + 75} className="node-info" fill="#6b7280">
                    Marge: {formatFloat(node.totalFloat)}
                  </text>
                  
                  {/* Durée */}
                  <text x={node.x + 140} y={node.y + 40} textAnchor="end" className="node-duration" fill="#374151">
                    {node.duration}j
                  </text>
                </g>
              ))}

              {/* Définition des flèches */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6b7280"
                  />
                </marker>
              </defs>
            </svg>

            {/* Panneau de détails du nœud sélectionné */}
            {selectedNode && (
              <div className="pert-node-details">
                <div className="node-details-header">
                  <h4>{selectedNode.name}</h4>
                  <button 
                    className="close-details"
                    onClick={() => setSelectedNode(null)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="node-details-content">
                  <div className="detail-row">
                    <span className="detail-label">Durée:</span>
                    <span className="detail-value">{selectedNode.duration} jour(s)</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Début au plus tôt:</span>
                    <span className="detail-value">{formatDate(selectedNode.earlyStart)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Fin au plus tôt:</span>
                    <span className="detail-value">{formatDate(selectedNode.earlyFinish)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Début au plus tard:</span>
                    <span className="detail-value">{formatDate(selectedNode.lateStart)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Fin au plus tard:</span>
                    <span className="detail-value">{formatDate(selectedNode.lateFinish)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Marge totale:</span>
                    <span className={`detail-value ${selectedNode.isCritical ? 'critical' : ''}`}>
                      {formatFloat(selectedNode.totalFloat)}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Marge libre:</span>
                    <span className="detail-value">{formatFloat(selectedNode.freeFloat)}</span>
                  </div>
                  
                  {selectedNode.isCritical && (
                    <div className="critical-badge">
                      ⚡ Tâche critique
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistiques du chemin critique */}
      {scheduleData && (
        <div className="pert-statistics">
          <h4>Analyse du chemin critique</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Tâches critiques:</span>
              <span className="stat-value">
                {scheduleData.criticalPath?.length || 0} / {tasks.length}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Durée projet:</span>
              <span className="stat-value">{scheduleData.projectDuration || 0} jours</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Marge moyenne:</span>
              <span className="stat-value">
                {tasks.length > 0 
                  ? Math.round(tasks.reduce((sum, t) => sum + (t.total_float || 0), 0) / tasks.length)
                  : 0} jours
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Fin prévue:</span>
              <span className="stat-value">
                {scheduleData.projectEndDate?.toLocaleDateString('fr-FR') || 'Non calculée'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PertView;