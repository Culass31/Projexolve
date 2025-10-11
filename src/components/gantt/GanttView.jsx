// components/gantt/GanttView.jsx - Vue Gantt avec votre composant existant
import React, { useEffect, useRef } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import LoadingSpinner from '../common/LoadingSpinner';

const GanttView = () => {
  const { 
    tasks, 
    dependencies, 
    updateTask, 
    createDependency, 
    deleteDependency, 
    loading,
    scheduleData
  } = useProject();

  const ganttContainerRef = useRef(null);

  // Transformer les données pour le format Gantt
  const formatTasksForGantt = (tasks) => {
    return tasks.map(task => ({
      id: task.id,
      text: task.name,
      start_date: task.start_date || new Date().toISOString().split('T')[0],
      end_date: task.end_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      duration: task.duration || 1,
      progress: (task.progress || 0) / 100,
      priority: task.priority,
      color: task.is_critical ? '#ef4444' : '#3b82f6',
      parent: task.parent_id || 0
    }));
  };

  const formatLinksForGantt = (dependencies) => {
    return dependencies.map((dep, index) => ({
      id: dep.id || index + 1,
      source: dep.predecessor_id,
      target: dep.successor_id,
      type: dep.dependency_type || '0' // 0=FS, 1=SS, 2=FF, 3=SF
    }));
  };

  // Gestionnaires d'événements
  const handleTaskUpdate = async (id, task) => {
    try {
      await updateTask(id, {
        name: task.text,
        start_date: task.start_date,
        end_date: task.end_date,
        duration: task.duration,
        progress: Math.round(task.progress * 100)
      });
    } catch (error) {
      console.error('Erreur mise à jour tâche Gantt:', error);
    }
  };

  const handleLinkCreate = async (link) => {
    try {
      await createDependency(link.source, link.target, link.type);
    } catch (error) {
      console.error('Erreur création lien Gantt:', error);
    }
  };

  const handleLinkDelete = async (linkId) => {
    try {
      await deleteDependency(linkId);
    } catch (error) {
      console.error('Erreur suppression lien Gantt:', error);
    }
  };

  useEffect(() => {
    // Initialiser le composant Gantt ici si vous avez votre propre implementation
    // ou utiliser une librairie comme dhtmlx-gantt, bryntum-gantt, etc.
    
    console.log('Initialisation Gantt:', {
      tasks: formatTasksForGantt(tasks),
      links: formatLinksForGantt(dependencies)
    });
  }, [tasks, dependencies]);

  if (loading) {
    return (
      <div className="gantt-loading">
        <LoadingSpinner size="large" text="Chargement du Gantt..." />
      </div>
    );
  }

  return (
    <div className="gantt-view">
      {/* Barre d'outils Gantt */}
      <div className="gantt-toolbar">
        <div className="toolbar-left">
          <h2>📊 Diagramme de Gantt</h2>
          <p>{tasks.length} tâche(s) • {dependencies.length} dépendance(s)</p>
        </div>
        
        <div className="toolbar-right">
          <button className="btn btn-secondary">
            📅 Aujourd'hui
          </button>
          <button className="btn btn-secondary">
            🔍 Zoom +
          </button>
          <button className="btn btn-secondary">
            🔍 Zoom -
          </button>
          <button className="btn btn-primary">
            💾 Enregistrer
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="gantt-legend">
        <div className="legend-item">
          <div className="legend-color critical"></div>
          <span>Tâches critiques</span>
        </div>
        <div className="legend-item">
          <div className="legend-color normal"></div>
          <span>Tâches normales</span>
        </div>
        <div className="legend-item">
          <div className="legend-color milestone"></div>
          <span>Jalons</span>
        </div>
      </div>

      {/* Conteneur Gantt */}
      <div className="gantt-container" ref={ganttContainerRef}>
        {tasks.length === 0 ? (
          <div className="gantt-empty">
            <div className="empty-icon">📊</div>
            <h3>Aucune tâche à afficher</h3>
            <p>Ajoutez des tâches via la vue Kanban pour les voir ici</p>
          </div>
        ) : (
          <div className="gantt-placeholder">
            {/* ICI: Intégrer votre composant Gantt existant */}
            <div className="gantt-info">
              <h3>🚧 Vue Gantt en développement</h3>
              <p>Cette vue intégrera votre composant Gantt existant</p>
              
              <div className="gantt-data-preview">
                <h4>Données disponibles:</h4>
                <ul>
                  <li><strong>{tasks.length}</strong> tâches formatées</li>
                  <li><strong>{dependencies.length}</strong> dépendances</li>
                  <li><strong>{tasks.filter(t => t.is_critical).length}</strong> tâches critiques</li>
                  <li><strong>Callbacks</strong> pour mise à jour temps réel</li>
                </ul>
              </div>

              <div className="integration-note">
                <h4>Intégration:</h4>
                <p>Remplacez ce placeholder par votre composant GanttChart existant en utilisant:</p>
                <code>
                  {`<GanttChart 
  tasks={formatTasksForGantt(tasks)}
  links={formatLinksForGantt(dependencies)}
  onTaskUpdate={handleTaskUpdate}
  onLinkCreate={handleLinkCreate}
  onLinkDelete={handleLinkDelete}
/>`}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informations de planification */}
      {scheduleData && (
        <div className="gantt-schedule-info">
          <h4>Informations de planification:</h4>
          <div className="schedule-metrics">
            <div className="metric">
              <span className="metric-label">Chemin critique:</span>
              <span className="metric-value">{scheduleData.criticalPath?.length || 0} tâches</span>
            </div>
            <div className="metric">
              <span className="metric-label">Durée totale:</span>
              <span className="metric-value">{scheduleData.projectDuration || 0} jours</span>
            </div>
            <div className="metric">
              <span className="metric-label">Fin prévue:</span>
              <span className="metric-value">
                {scheduleData.projectEndDate?.toLocaleDateString('fr-FR') || 'Non calculée'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttView;