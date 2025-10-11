import React from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Box, Container, CircularProgress, Typography, Alert } from '@mui/material';

// Composants des vues
import KanbanView from '../components/kanban/KanbanView';
import GanttView from '../components/gantt/GanttView';
import PertView from '../components/pert/PertView';
import BudgetView from '../components/budget/BudgetView';
import RisksView from '../components/risks/RisksView';

// Composants communs
import ViewTabs from '../components/common/ViewTabs';
import ProjectHeader from '../components/common/ProjectHeader';

const ProjectDetail = () => {
  const {
    project,
    loading,
    error,
    activeView,
    setActiveView,
    tasks,
    risks,
    budgetMetrics
  } = useProject();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement du projet...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }
  
  if (!project) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Projet non trouvé. Il n'existe pas ou vous n'avez pas les permissions pour le voir.
      </Alert>
    );
  }

  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.kanban_column === 'done').length,
    criticalTasks: tasks.filter(t => t.is_critical).length,
    overdueTasks: tasks.filter(t => 
      t.end_date && new Date(t.end_date) < new Date() && t.kanban_column !== 'done'
    ).length,
    highRisks: risks.filter(r => r.risk_score >= 15).length,
    budgetUsed: budgetMetrics ? Math.round((budgetMetrics.spent / budgetMetrics.total) * 100) : 0
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'kanban': return <KanbanView />;
      case 'gantt': return <GanttView />;
      case 'pert': return <PertView />;
      case 'budget': return <BudgetView />;
      case 'risks': return <RisksView />;
      default: return <KanbanView />;
    }
  };

  return (
    <Container maxWidth="xl">
      {/* En-tête du projet */}
      <ProjectHeader project={project} stats={stats} />

      {/* Onglets de navigation */}
      <ViewTabs activeView={activeView} onViewChange={setActiveView} />

      {/* Contenu de la vue active */}
      <Box component="main">
        {renderActiveView()}
      </Box>
    </Container>
  );
};

export default ProjectDetail;
