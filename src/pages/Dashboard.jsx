import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import { useAuth } from '../contexts/AuthContext';

// MUI Imports
import { 
  Box, Button, Container, Grid, Typography, CircularProgress, 
  Alert, Card, CardContent, LinearProgress, Link, Paper
} from '@mui/material';
import { 
  Add as AddIcon, 
  Assessment as AssessmentIcon,
  AccountBalanceWallet as BudgetIcon,
  Ballot as TasksIcon,
  BusinessCenter as ProjectsIcon
} from '@mui/icons-material';

// Custom Components
import StatCard from '../components/dashboard/StatCard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);
      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('project_health')
          .select('*')
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        const globalMetrics = calculateGlobalMetrics(projectsData);
        setProjects(projectsData || []);
        setMetrics(globalMetrics);

      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [user]);

  const calculateGlobalMetrics = (projects) => {
    if (!projects || projects.length === 0) {
      return { totalProjects: 0, activeProjects: 0, totalTasks: 0, completedTasks: 0, totalBudget: 0, spentBudget: 0 };
    }
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalTasks = projects.reduce((sum, p) => sum + (p.total_tasks || 0), 0);
    const completedTasks = projects.reduce((sum, p) => sum + (p.completed_tasks || 0), 0);
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget_allocated || 0), 0);
    const spentBudget = projects.reduce((sum, p) => sum + (p.budget_spent || 0), 0);
    return { totalProjects, activeProjects, totalTasks, completedTasks, totalBudget, spentBudget };
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Container maxWidth="xl"><Alert severity="error" sx={{ mt: 2 }}>Erreur de chargement: {error}</Alert></Container>;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="700">
            Bonjour, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'} 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Voici un aperçu de vos projets aujourd'hui.
          </Typography>
        </Box>
        <Box>
          <Button variant="outlined" startIcon={<AssessmentIcon />} component={RouterLink} to="/projects" sx={{ mr: 2 }}>
            Tous les projets
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/projects/new')}>
            Nouveau projet
          </Button>
        </Box>
      </Box>

      {/* Métriques principales */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Projets Actifs" value={`${metrics?.activeProjects || 0} / ${metrics?.totalProjects || 0}`} icon={<ProjectsIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Tâches Terminées" value={`${metrics?.completedTasks || 0} / ${metrics?.totalTasks || 0}`} icon={<TasksIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Budget Dépensé" value={formatCurrency(metrics?.spentBudget)} icon={<BudgetIcon />} color="warning" />
        </Grid>

        {/* Placeholder for charts */}
        <Grid item xs={12} lg={8}>
            <Card sx={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent>
                    <Typography variant="h6" color="text.secondary">Graphique de Performance (à venir)</Typography>
                </CardContent>
            </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
            <Card sx={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent>
                    <Typography variant="h6" color="text.secondary">Répartition des Tâches (à venir)</Typography>
                </CardContent>
            </Card>
        </Grid>

        {/* Liste des projets */}
        <Grid item xs={12}>
          <Typography variant="h5" component="h2" fontWeight="600" sx={{ mb: 2, mt: 4 }}>
            🚀 Projets Récents
          </Typography>
          {projects.length === 0 ? (
            <Paper sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6">Aucun projet pour le moment.</Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/projects/new')}>Créer un projet</Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {projects.slice(0, 3).map((project) => (
                <Grid item xs={12} md={4} key={project.project_id}>
                  <ProjectCard project={project} />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

// Sous-composant pour les cartes de projet (style amélioré)
const ProjectCard = ({ project }) => {
  const completionRate = project.total_tasks > 0 ? Math.round(((project.completed_tasks || 0) / project.total_tasks) * 100) : 0;
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: (theme) => theme.shadows[4] } }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Link component={RouterLink} to={`/projects/${project.project_id}`} underline="none" color="inherit">
          <Typography variant="h6" component="h3" fontWeight="600" gutterBottom>
            {project.project_name}
          </Typography>
        </Link>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Statut: <Typography component="span" color={project.status === 'active' ? 'success.main' : 'text.secondary'}>{project.status}</Typography>
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">Progression</Typography>
          <Typography variant="body2" fontWeight="500">{completionRate}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={completionRate} sx={{ height: 6, borderRadius: 5, mb: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Créé le: {new Date(project.created_at).toLocaleDateString('fr-FR')}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default Dashboard;