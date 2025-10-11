import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useProject } from '../../contexts/ProjectContext';
import KanbanCard from './KanbanCard';
import AddTaskForm from './AddTaskForm';
import SwimLaneHeader from './SwimLaneHeader';
import { Box, Paper, Typography, IconButton, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';

const KANBAN_COLUMNS = [
  { id: 'todo', title: 'À Faire', color: 'error' },
  { id: 'in_progress', title: 'En Cours', color: 'warning' },
  { id: 'review', title: 'En Review', color: 'info' },
  { id: 'done', title: 'Terminé', color: 'success' }
];

const SWIM_LANE_OPTIONS = [
  { value: 'none', label: 'Aucune' },
  { value: 'priority', label: 'Par Priorité' },
  { value: 'assignee', label: 'Par Assigné' },
  { value: 'critical', label: 'Critique/Non-critique' }
];

const KanbanView = () => {
  const { tasks, updateTask, createTask, selectedTask, setSelectedTask } = useProject();
  const [swimLaneMode, setSwimLaneMode] = useState('none');
  const [showAddForm, setShowAddForm] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const organizedTasks = useMemo(() => {
    const filteredTasks = tasks.filter(task =>
      task.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    const tasksByColumn = KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = filteredTasks
        .filter(task => task.kanban_column === column.id)
        .sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));
      return acc;
    }, {});

    if (swimLaneMode === 'none') return { default: tasksByColumn };

    const swimLanes = {};
    filteredTasks.forEach(task => {
      let key;
      switch (swimLaneMode) {
        case 'priority': key = task.priority; break;
        case 'assignee': key = task.assigned_to || 'null'; break;
        case 'critical': key = task.is_critical ? 'Critique' : 'Non Critique'; break;
        default: break;
      }
      if (!swimLanes[key]) {
        swimLanes[key] = KANBAN_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: [] }), {});
      }
      swimLanes[key][task.kanban_column].push(task);
    });
    
    // Sort swimlanes
    const sortedSwimlanes = Object.keys(swimLanes).sort().reduce((acc, key) => {
        acc[key] = swimLanes[key];
        return acc;
    }, {});

    return sortedSwimlanes;
  }, [tasks, swimLaneMode, searchFilter]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = draggableId;
    const newColumn = destination.droppableId.split('-')[0];

    await updateTask(taskId, {
      kanban_column: newColumn,
      kanban_position: destination.index,
    });
  };

  const handleAddTask = async (columnId, taskData) => {
    await createTask(taskData, columnId);
    setShowAddForm(null);
  };

  const renderColumn = (column, tasks, swimLaneKey = null) => {
    const droppableId = swimLaneKey ? `${column.id}-${swimLaneKey}` : column.id;
    
    return (
      <Box 
        key={droppableId} 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: 320, 
          minWidth: 320,
          mx: 1,
          bgcolor: 'grey.100',
          borderRadius: 2,
          height: '100%'
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${column.color}.main`, mr: 1 }} />
            <Typography variant="subtitle1" fontWeight="600">{column.title}</Typography>
            <Chip label={tasks.length} size="small" sx={{ ml: 1.5 }} />
          </Box>
          <IconButton size="small" onClick={() => setShowAddForm(droppableId)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                flexGrow: 1,
                p: 1,
                overflowY: 'auto',
                transition: 'background-color 0.2s ease',
              }}
            >
              {showAddForm === droppableId && (
                <Box sx={{ mb: 1.5 }}>
                  <AddTaskForm
                    onSubmit={(taskData) => handleAddTask(column.id, taskData)}
                    onCancel={() => setShowAddForm(null)}
                  />
                </Box>
              )}
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <KanbanCard task={task} isDragging={snapshot.isDragging} onClick={() => setSelectedTask(task)} isSelected={selectedTask?.id === task.id} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)' }}>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }} variant="outlined">
        <TextField
          placeholder="Rechercher une tâche..."
          variant="outlined"
          size="small"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Vue Swimlane</InputLabel>
          <Select value={swimLaneMode} label="Vue Swimlane" onChange={(e) => setSwimLaneMode(e.target.value)}>
            {SWIM_LANE_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', flexGrow: 1, overflowX: 'auto', pb: 1 }}>
          {swimLaneMode === 'none' ? (
            KANBAN_COLUMNS.map(column => renderColumn(column, organizedTasks.default[column.id] || []))
          ) : (
            Object.entries(organizedTasks).map(([key, val]) => (
              <Box key={key} sx={{ mb: 3 }}>
                <SwimLaneHeader title={key} mode={swimLaneMode} taskCount={Object.values(val).flat().length} />
                <Box sx={{ display: 'flex' }}>
                  {KANBAN_COLUMNS.map(col => renderColumn(col, val[col.id] || [], key))}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </DragDropContext>
    </Box>
  );
};

export default KanbanView;
