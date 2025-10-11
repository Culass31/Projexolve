import React from 'react';
import { Typography, Box, Chip } from '@mui/material';
import { 
  PriorityHigh as HighPriorityIcon,
  ArrowUpward as MediumPriorityIcon,
  ArrowDownward as LowPriorityIcon,
  Person as AssigneeIcon,
  Bolt as CriticalIcon,
  List as DefaultIcon
} from '@mui/icons-material';

const SwimLaneHeader = ({ title, mode, taskCount }) => {
  
  const getSwimLaneDetails = () => {
    switch (mode) {
      case 'priority':
        if (title === 'High') return { icon: <HighPriorityIcon />, color: 'error.main' };
        if (title === 'Medium') return { icon: <MediumPriorityIcon />, color: 'warning.main' };
        if (title === 'Low') return { icon: <LowPriorityIcon />, color: 'success.main' };
        break;
      case 'assignee':
        return { icon: <AssigneeIcon />, color: 'primary.main' };
      case 'critical':
        if (title === 'Critique') return { icon: <CriticalIcon />, color: 'error.dark' };
        return { icon: <DefaultIcon />, color: 'text.secondary' };
      default:
        break;
    }
    return { icon: <DefaultIcon />, color: 'text.secondary' };
  };

  const { icon, color } = getSwimLaneDetails();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 1,
        mb: 2,
        borderBottom: 2,
        borderColor: color,
        color: color
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          {title === 'null' ? 'Non assigné' : title}
        </Typography>
      </Box>
      <Chip label={`${taskCount} Tâches`} size="small" />
    </Box>
  );
};

export default SwimLaneHeader;
