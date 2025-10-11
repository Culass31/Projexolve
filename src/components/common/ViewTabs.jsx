import React from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { 
  ViewKanban as KanbanIcon,
  Timeline as GanttIcon,
  AccountTree as PertIcon,
  MonetizationOn as BudgetIcon,
  Warning as RisksIcon
} from '@mui/icons-material';

const ViewTabs = ({ activeView, onViewChange }) => {
  
  const tabs = [
    { id: 'kanban', label: 'Kanban', icon: <KanbanIcon /> },
    { id: 'gantt', label: 'Gantt', icon: <GanttIcon /> },
    { id: 'pert', label: 'PERT', icon: <PertIcon /> },
    { id: 'budget', label: 'Budget', icon: <BudgetIcon /> },
    { id: 'risks', label: 'Risques', icon: <RisksIcon /> }
  ];

  const handleChange = (event, newValue) => {
    onViewChange(newValue);
  };

  return (
    <Paper 
      elevation={0} 
      variant="outlined"
      sx={{ 
        position: 'sticky', 
        top: 64, // Hauteur de l'AppBar
        zIndex: 1000,
        bgcolor: 'background.paper',
        mb: 3
      }}
    >
      <Tabs
        value={activeView}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="project view tabs"
      >
        {tabs.map((tab) => (
          <Tab 
            key={tab.id} 
            value={tab.id}
            label={tab.label} 
            icon={tab.icon} 
            iconPosition="start"
            sx={{ minHeight: 'auto', textTransform: 'none', fontWeight: 500 }}
          />
        ))}
      </Tabs>
    </Paper>
  );
};

export default ViewTabs;
