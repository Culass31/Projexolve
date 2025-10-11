import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Avatar, Tooltip } from '@mui/material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Flag as FlagIcon, 
  CalendarToday as CalendarIcon, 
  HourglassEmpty as HourglassIcon,
  Bolt as BoltIcon,
  Euro as EuroIcon
} from '@mui/icons-material';

const priorityMap = {
  High: { label: 'Haute', color: 'error' },
  Medium: { label: 'Moyenne', color: 'warning' },
  Low: { label: 'Basse', color: 'success' }
};

const KanbanCard = ({ task, isDragging, onClick, isSelected }) => {
  
  const priority = priorityMap[task.priority] || priorityMap.Medium;
  const isOverdue = task.end_date && new Date(task.end_date) < new Date() && task.kanban_column !== 'done';

  return (
    <Card
      onClick={onClick}
      elevation={isSelected ? 4 : 1}
      sx={{
        mb: 1.5,
        transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
        transform: isDragging ? 'rotate(2deg)' : 'none',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'transparent',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[3],
        }
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {task.is_critical && (
          <Chip 
            icon={<BoltIcon />} 
            label="Critique" 
            color="error" 
            size="small" 
            sx={{ mb: 1 }} 
          />
        )}
        <Typography variant="subtitle1" component="h4" sx={{ fontWeight: '600', mb: 1 }}>
          {task.name}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" mb={1.5}>
            <Tooltip title={`Priorité: ${priority.label}`}>
              <FlagIcon fontSize="small" color={priority.color} />
            </Tooltip>
            {task.end_date && (
                <Chip 
                    icon={<CalendarIcon />} 
                    label={format(new Date(task.end_date), 'd MMM', { locale: fr })} 
                    size="small"
                    variant="outlined"
                    color={isOverdue ? 'error' : 'default'}
                />
            )}
            {task.estimated_hours > 0 && (
                <Chip icon={<HourglassIcon />} label={`${task.estimated_hours}h`} size="small" variant="outlined" />
            )}
            {task.estimated_cost > 0 && (
                <Chip icon={<EuroIcon />} label={`${task.estimated_cost}€`} size="small" variant="outlined" />
            )}
        </Box>

        {task.tags && task.tags.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {task.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" />
            ))}
          </Box>
        )}

        <Box display="flex" justifyContent="flex-end" alignItems="center" mt={2}>
          {task.assigned_to && (
            <Tooltip title={`Assigné à ${task.assigned_to}`}>
              <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: 'primary.light' }}>
                {task.assigned_to.substring(0, 2).toUpperCase()}
              </Avatar>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default KanbanCard;
