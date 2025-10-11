import React, { useState } from 'react';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, Chip, IconButton } from '@mui/material';
import { Add as AddIcon, Cancel as CancelIcon } from '@mui/icons-material';

const AddTaskForm = ({ onSubmit, onCancel }) => {
  const [taskData, setTaskData] = useState({
    name: '',
    description: '',
    priority: 'Medium',
    estimated_hours: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskData.name.trim()) return;
    onSubmit({
      ...taskData,
      estimated_hours: parseFloat(taskData.estimated_hours) || null
    });
    // Reset form if needed
    setTaskData({ name: '', description: '', priority: 'Medium', estimated_hours: '', tags: [] });
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !taskData.tags.includes(newTag)) {
      setTaskData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTaskData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <TextField
        label="Nom de la tâche"
        variant="outlined"
        size="small"
        fullWidth
        required
        autoFocus
        name="name"
        value={taskData.name}
        onChange={handleChange}
        sx={{ mb: 1.5 }}
      />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Priorité</InputLabel>
          <Select
            name="priority"
            value={taskData.priority}
            label="Priorité"
            onChange={handleChange}
          >
            <MenuItem value="Low">Basse</MenuItem>
            <MenuItem value="Medium">Moyenne</MenuItem>
            <MenuItem value="High">Haute</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Heures"
          name="estimated_hours"
          type="number"
          size="small"
          value={taskData.estimated_hours}
          onChange={handleChange}
          inputProps={{ min: "0", step: "0.5" }}
          sx={{ width: '120px' }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <TextField
          label="Ajouter un tag"
          size="small"
          fullWidth
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTag();
            }
          }}
        />
        <Button onClick={handleAddTag} variant="outlined" size="small">Ajouter</Button>
      </Box>
      {taskData.tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
          {taskData.tags.map((tag) => (
            <Chip key={tag} label={tag} onDelete={() => handleRemoveTag(tag)} size="small" />
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel} size="small">Annuler</Button>
        <Button type="submit" variant="contained" size="small">
          Ajouter Tâche
        </Button>
      </Box>
    </Box>
  );
};

export default AddTaskForm;
