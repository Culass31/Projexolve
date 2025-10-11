// KanbanBoard.js - Kanban à la Trello mais en mieux
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Box, Paper, Typography, Card, CardContent, CardActions,
  Avatar, Chip, IconButton, Button, Dialog, TextField,
  LinearProgress, Tooltip, Badge, Stack, Divider,
  Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Add as AddIcon, MoreVert as MoreIcon, Person as PersonIcon,
  Schedule as TimeIcon, Flag as FlagIcon, Warning as RiskIcon,
  Comment as CommentIcon, Attachment as AttachIcon,
  TrendingUp as TrendingUpIcon, AutoAwesome as AIIcon
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';

const COLUMN_CONFIG = {
  todo: { 
    title: '📋 À faire', 
    color: '#64748b', 
    bgColor: '#f1f5f9',
    maxCards: 20
  },
  in_progress: { 
    title: '🚀 En cours', 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    maxCards: 5 // Limite WIP
  },
  review: { 
    title: '👁️ Review', 
    color: '#f59e0b', 
    bgColor: '#fef3c7',
    maxCards: 10
  },
  done: { 
    title: '✅ Terminé', 
    color: '#10b981', 
    bgColor: '#d1fae5',
    maxCards: Infinity
  }
};

const PRIORITY_CONFIG = {
  critical: { color: '#dc2626', icon: '🔴', label: 'Critique' },
  high: { color: '#ea580c', icon: '🟠', label: 'Haute' },
  medium: { color: '#ca8a04', icon: '🟡', label: 'Moyenne' },
  low: { color: '#16a34a', icon: '🟢', label: 'Basse' }
};

const KanbanBoard = ({ projectId, resources = [], onTaskUpdate }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [dragDisabled, setDragDisabled] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [quickAddColumn, setQuickAddColumn] = useState(null);

  // Chargement des tâches
  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_resource:resources(name, avatar_url),
          comments(count),
          time_entries(sum(hours_logged))
        `)
        .eq('project_id', projectId)
        .order('position');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
    
    // Abonnement temps réel
    const subscription = supabase
      .channel(`project_${projectId}_tasks`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        () => fetchTasks()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [projectId, fetchTasks]);

  // Suggestions IA intelligentes
  const generateAISuggestions = useMemo(() => {
    const suggestions = [];
    
    // Détection goulots d'étranglement
    const reviewTasks = tasks.filter(t => t.kanban_column === 'review').length;
    if (reviewTasks > 5) {
      suggestions.push({
        type: 'bottleneck',
        icon: '⚠️',
        message: `Goulot en Review (${reviewTasks} tâches). Ajouter un reviewer?`,
        action: 'assign_reviewer'
      });
    }

    // Détection surcharge ressource
    const inProgressByResource = {};
    tasks.filter(t => t.kanban_column === 'in_progress').forEach(task => {
      const resourceId = task.assigned_to;
      if (resourceId) {
        inProgressByResource[resourceId] = (inProgressByResource[resourceId] || 0) + 1;
      }
    });

    Object.entries(inProgressByResource).forEach(([resourceId, count]) => {
      if (count > 3) {
        const resource = resources.find(r => r.id === resourceId);
        suggestions.push({
          type: 'overload',
          icon: '🔥',
          message: `${resource?.name} surchargé (${count} tâches). Redistribuer?`,
          action: 'redistribute'
        });
      }
    });

    // Suggestions d'optimisation
    const staleTasks = tasks.filter(t => 
      t.kanban_column === 'in_progress' && 
      new Date() - new Date(t.updated_at) > 7 * 24 * 60 * 60 * 1000 // 7 jours
    );
    
    if (staleTasks.length > 0) {
      suggestions.push({
        type: 'stale',
        icon: '⏰',
        message: `${staleTasks.length} tâches inactives depuis >7j. Check status?`,
        action: 'check_progress'
      });
    }

    return suggestions;
  }, [tasks, resources]);

  // Gestion du drag & drop avec logique métier
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // Vérifications business rules
    const task = tasks.find(t => t.id === parseInt(draggableId));
    const newColumn = destination.droppableId;
    
    // Rule 1: Limite WIP
    const tasksInDestination = tasks.filter(t => t.kanban_column === newColumn).length;
    if (tasksInDestination >= COLUMN_CONFIG[newColumn].maxCards) {
      alert(`⚠️ Limite WIP atteinte pour "${COLUMN_CONFIG[newColumn].title}"`);
      return;
    }

    // Rule 2: Validation automatique "Done"
    if (newColumn === 'done' && task.progress < 100) {
      const confirmComplete = window.confirm(
        `Cette tâche n'est pas à 100%. Marquer comme terminée quand même?`
      );
      if (!confirmComplete) return;
    }

    // Rule 3: Auto-promotion vers Review si 100%
    const finalColumn = (newColumn === 'in_progress' && task.progress === 100) ? 'review' : newColumn;

    try {
      // Mise à jour optimiste
      const updatedTasks = Array.from(tasks);
      const taskIndex = updatedTasks.findIndex(t => t.id === parseInt(draggableId));
      if (taskIndex !== -1) {
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          kanban_column: finalColumn,
          position: destination.index
        };
        setTasks(updatedTasks);
      }

      // Mise à jour base de données
      const { error } = await supabase
        .from('tasks')
        .update({
          kanban_column: finalColumn,
          position: destination.index,
          ...(finalColumn === 'done' && { progress: 100 })
        })
        .eq('id', draggableId);

      if (error) throw error;

      // Notification si auto-promotion
      if (finalColumn === 'review' && newColumn === 'in_progress') {
        // TODO: Envoyer notification au reviewer
        console.log('🤖 Auto-promotion vers Review!');
      }

      if (onTaskUpdate) onTaskUpdate();

    } catch (error) {
      console.error('Erreur mise à jour tâche:', error);
      fetchTasks(); // Rollback
    }
  };

  // Composant Card de tâche enrichie
  const TaskCard = ({ task, index }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    const handleQuickAction = async (action) => {
      setAnchorEl(null);
      
      switch(action) {
        case 'quick_complete':
          await supabase.from('tasks').update({ 
            progress: 100, 
            kanban_column: 'done' 
          }).eq('id', task.id);
          break;
          
        case 'add_time':
          // Modal ajout temps
          break;
          
        case 'assign_to_me':
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('tasks').update({ 
            assigned_to: user.id 
          }).eq('id', task.id);
          break;
      }
      
      fetchTasks();
    };

    return (
      <Draggable 
        draggableId={task.id.toString()} 
        index={index}
        isDragDisabled={dragDisabled}
      >
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            sx={{
              mb: 1,
              cursor: 'grab',
              transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
              boxShadow: snapshot.isDragging ? 4 : 1,
              '&:hover': { boxShadow: 2 }
            }}
            onDoubleClick={() => {
              setSelectedTask(task);
              setEditDialog(true);
            }}
          >
            <CardContent sx={{ pb: 1 }}>
              {/* Header avec priorité et menu */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontSize: '12px' }}>
                    {PRIORITY_CONFIG[task.priority]?.icon}
                  </span>
                  {task.is_milestone && <span>🏁</span>}
                  {task.risk_score > 3 && <span>⚠️</span>}
                </Box>
                
                <IconButton 
                  size="small" 
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Titre de la tâche */}
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                {task.name}
              </Typography>

              {/* Progress bar */}
              {task.progress > 0 && (
                <Box sx={{ mb: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={task.progress}
                    sx={{ 
                      height: 4, 
                      borderRadius: 2,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: task.progress === 100 ? '#10b981' : '#3b82f6'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {task.progress}%
                  </Typography>
                </Box>
              )}

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap' }}>
                  {task.tags.slice(0, 3).map((tag, idx) => (
                    <Chip 
                      key={idx}
                      label={tag} 
                      size="small" 
                      variant="outlined"
                      sx={{ fontSize: '10px', height: '16px' }}
                    />
                  ))}
                  {task.tags.length > 3 && (
                    <Chip 
                      label={`+${task.tags.length - 3}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '10px', height: '16px' }}
                    />
                  )}
                </Stack>
              )}

              {/* Estimations et temps */}
              {(task.estimated_hours || task.actual_hours) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TimeIcon fontSize="small" color="action" />
                  <Typography variant="caption">
                    {task.actual_hours || 0}h / {task.estimated_hours || 0}h
                  </Typography>
                  {task.actual_hours > task.estimated_hours && (
                    <Chip label="Dépassé" size="small" color="warning" />
                  )}
                </Box>
              )}
            </CardContent>

            {/* Footer avec assigné et actions */}
            <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {task.assigned_resource?.avatar_url ? (
                  <Avatar 
                    src={task.assigned_resource.avatar_url} 
                    sx={{ width: 24, height: 24, fontSize: '12px' }}
                  />
                ) : task.assigned_resource?.name ? (
                  <Avatar sx={{ width: 24, height: 24, fontSize: '12px' }}>
                    {task.assigned_resource.name.substring(0, 2).toUpperCase()}
                  </Avatar>
                ) : (
                  <Avatar sx={{ width: 24, height: 24, fontSize: '12px' }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {task.comments?.length > 0 && (
                  <Badge badgeContent={task.comments.length} color="primary" max={9}>
                    <CommentIcon fontSize="small" color="action" />
                  </Badge>
                )}
                
                {task.risk_score > 2 && (
                  <Tooltip title={`Risque: ${task.risk_score}/5`}>
                    <RiskIcon fontSize="small" color="warning" />
                  </Tooltip>
                )}
              </Box>
            </CardActions>

            {/* Menu contextuel */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => handleQuickAction('quick_complete')}>
                <ListItemIcon><TrendingUpIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Marquer terminé</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleQuickAction('assign_to_me')}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText>M'assigner</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleQuickAction('add_time')}>
                <ListItemIcon><TimeIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Ajouter du temps</ListItemText>
              </MenuItem>
            </Menu>
          </Card>
        )}
      </Draggable>
    );
  };

  // Composant Colonne Kanban
  const KanbanColumn = ({ columnId, tasks: columnTasks }) => {
    const config = COLUMN_CONFIG[columnId];
    const taskCount = columnTasks.length;
    const isOverLimit = taskCount >= config.maxCards && config.maxCards !== Infinity;

    return (
      <Paper sx={{ 
        p: 2, 
        minHeight: 500, 
        width: 300,
        backgroundColor: config.bgColor,
        border: isOverLimit ? '2px solid #ef4444' : 'none'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: config.color, fontWeight: 'bold' }}>
            {config.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={taskCount}
              size="small"
              color={isOverLimit ? "error" : "default"}
            />
            <IconButton 
              size="small"
              onClick={() => setQuickAddColumn(columnId)}
            >
              <AddIcon />
            </IconButton>
          </Box>
        </Box>

        {isOverLimit && (
          <Box sx={{ mb: 2, p: 1, backgroundColor: '#fecaca', borderRadius: 1 }}>
            <Typography variant="caption" color="error">
              ⚠️ Limite WIP atteinte ({config.maxCards})
            </Typography>
          </Box>
        )}

        <Droppable droppableId={columnId}>
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                minHeight: 400,
                backgroundColor: snapshot.isDraggingOver ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderRadius: 1,
                transition: 'background-color 0.2s'
              }}
            >
              {columnTasks.map((task, index) => (
                <TaskCard key={task.id} task={task} index={index} />
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </Paper>
    );
  };

  // Grouper les tâches par colonne
  const tasksByColumn = useMemo(() => {
    const grouped = Object.keys(COLUMN_CONFIG).reduce((acc, column) => {
      acc[column] = tasks
        .filter(task => task.kanban_column === column)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      return acc;
    }, {});
    return grouped;
  }, [tasks]);

  if (loading) return <Box sx={{ p: 3 }}>Chargement du Kanban...</Box>;

  return (
    <Box sx={{ p: 2 }}>
      {/* Suggestions IA */}
      {generateAISuggestions.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AIIcon color="primary" />
            <Typography variant="h6" color="primary">
              Suggestions IA
            </Typography>
          </Box>
          <Stack spacing={1}>
            {generateAISuggestions.slice(0, 3).map((suggestion, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{suggestion.icon}</span>
                <Typography variant="body2">{suggestion.message}</Typography>
                <Button size="small" variant="outlined" color="primary">
                  Action
                </Button>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Board Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {Object.keys(COLUMN_CONFIG).map(columnId => (
            <KanbanColumn 
              key={columnId}
              columnId={columnId}
              tasks={tasksByColumn[columnId] || []}
            />
          ))}
        </Box>
      </DragDropContext>

      {/* Modal d'édition rapide */}
      {selectedTask && (
        <Dialog 
          open={editDialog} 
          onClose={() => setEditDialog(false)}
          maxWidth="md"
          fullWidth
        >
          {/* TODO: Composant d'édition de tâche enrichi */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6">Édition: {selectedTask.name}</Typography>
            {/* Formulaire d'édition complet */}
          </Box>
        </Dialog>
      )}
    </Box>
  );
};

export default KanbanBoard;