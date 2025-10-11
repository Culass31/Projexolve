// ProjectPage.js - Version intégrée complète
import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import KanbanBoard from '../components/KanbanBoard';
import SmartGanttChart from '../components/SmartGanttChart';
import ResourceCapacityManager from '../components/ResourceCapacityManager';
import PertChart from '../components/PertChart';
import { calculateSchedule } from '../logic/scheduleEngine';

const ProjectPage = ({ projectId }) => {
  const [currentTab, setCurrentTab] = useState('kanban'); // kanban, gantt, pert, capacity
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [resources, setResources] = useState([]);
  
  // ... vos autres états et fonctions

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Navigation entre vues */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
          <Tab 
            label="📋 Kanban" 
            value="kanban" 
            iconPosition="start"
          />
          <Tab 
            label="📊 Gantt" 
            value="gantt"
            iconPosition="start" 
          />
          <Tab 
            label="🔗 PERT" 
            value="pert"
            iconPosition="start"
          />
          <Tab 
            label="👥 Charge/Capa" 
            value="capacity"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Contenu selon l'onglet */}
      {currentTab === 'kanban' && (
        <KanbanBoard
          projectId={projectId}
          resources={resources}
          onTaskUpdate={() => fetchTasks()}
        />
      )}

      {currentTab === 'gantt' && (
        <SmartGanttChart
          tasks={tasks}
          links={links}
          onTasksChange={handleTasksChange}
          onLinkCreate={handleNewLink}
          onLinkDelete={handleLinkDelete}
          excludeWeekends={true}
          countryCode="FR"
        />
      )}

      {currentTab === 'pert' && (
        <PertChart
          tasks={tasks}
          dependencies={links}
        />
      )}

      {currentTab === 'capacity' && (
        <ResourceCapacityManager
          projectId={projectId}
        />
      )}
    </Box>
  );
};

export default ProjectPage;