// pages/CreateProject.jsx - Formulaire de création d'un nouveau projet avec MUI
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import { useAuth } from '../contexts/AuthContext';

// Import des composants MUI
import { Box, Button, TextField, Typography, Container, Paper, Grid, CircularProgress, Alert } from '@mui/material';

const CreateProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'draft',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Le nom du projet est obligatoire.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...formData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/projects/${data.id}`);
    } catch (err) {
      console.error("Erreur lors de la création du projet:", err);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3}
        sx={{ 
          padding: { xs: 2, sm: 4 }, 
          marginTop: 4,
          borderRadius: '12px'
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Nouveau Projet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Remplissez les informations ci-dessous pour démarrer votre projet.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                id="name"
                name="name"
                label="Nom du projet"
                value={formData.name}
                onChange={handleChange}
                variant="outlined"
                placeholder="Ex: Refonte du site web"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="description"
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                variant="outlined"
                placeholder="Décrivez les objectifs et le périmètre de ce projet."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="start_date"
                name="start_date"
                label="Date de début"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="end_date"
                name="end_date"
                label="Date de fin"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button 
              variant="text" 
              onClick={() => navigate('/projects')}
              sx={{ mr: 2 }}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              {isSubmitting ? 'Création...' : 'Créer le projet'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateProject;