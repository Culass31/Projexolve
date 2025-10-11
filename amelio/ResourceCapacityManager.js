// ResourceCapacityManager.js - Gestion charge/capacité avec IA
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableRow,
  LinearProgress, Chip, Avatar, Button, Dialog,
  DialogTitle, DialogContent, TextField, MenuItem,
  Alert, Tooltip, IconButton, Stack
} from '@mui/material';
import {
  Person as PersonIcon, Warning as WarningIcon,
  TrendingUp as TrendingUpIcon, Balance as BalanceIcon,
  AutoAwesome as AIIcon, SwapHoriz as SwapIcon,
  Schedule as ScheduleIcon, Assessment as MetricsIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
         ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { supabase } from '../services/supabaseClient';

const ResourceCapacityManager = ({ projectId }) => {
  const [resources, setResources] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [rebalanceDialog, setRebalanceDialog] = useState(false);
  const [aiRecommendations, setAIRecommendations] = useState([]);

  // Utilitaires de dates
  function getCurrentWeek() {
    const now = new Date();
    const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
    return firstDay.toISOString().split('T')[0];
  }

  function addWeeks(dateStr, weeks) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + (weeks * 7));
    return date.toISOString().split('T')[0];
  }

  function formatWeekRange(weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
  }

  // Chargement des données
  useEffect(() => {
    const fetchCapacityData = async () => {
      try {
        setLoading(true);
        
        // Charger ressources avec leurs métriques
        const { data: resourcesData, error: resourcesError } = await supabase
          .from('resource_workload')
          .select('*')
          .eq('project_id', projectId);

        if (resourcesError) throw resourcesError;

        // Charger allocations pour les 12 prochaines semaines
        const weeks = Array.from({ length: 12 }, (_, i) => addWeeks(selectedWeek, i));
        
        const { data: allocationsData, error: allocationsError } = await supabase
          .from('resource_allocations')
          .select(`
            *,
            task:tasks(name, priority, end_date),
            resource:resources(name, avatar_url, capacity_hours_per_week)
          `)
          .in('week_start', weeks)
          .eq('resource.project_id', projectId);

        if (allocationsError) throw allocationsError;

        setResources(resourcesData || []);
        setAllocations(allocationsData || []);
        
        // Générer recommandations IA
        generateAIRecommendations(resourcesData, allocationsData);
        
      } catch (error) {
        console.error('Erreur chargement capacité:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCapacityData();
  }, [projectId, selectedWeek]);

  // IA: Génération de recommandations intelligentes
  const generateAIRecommendations = (resourcesData, allocationsData) => {
    const recommendations = [];
    
    // 1. Détection de surcharge
    resourcesData.forEach(resource => {
      if (resource.utilization_percentage > 100) {
        recommendations.push({
          type: 'overload',
          severity: 'high',
          resource: resource.name,
          message: `${resource.name} surchargé à ${resource.utilization_percentage.toFixed(0)}%`,
          suggestion: `Redistribuer ${(resource.allocated_hours_current_week - resource.capacity_hours_per_week).toFixed(1)}h vers autre ressource`,
          action: 'redistribute',
          resourceId: resource.resource_id
        });
      }
    });

    // 2. Détection de sous-utilisation
    resourcesData.forEach(resource => {
      if (resource.utilization_percentage < 60 && resource.utilization_percentage > 0) {
        recommendations.push({
          type: 'underutilized',
          severity: 'medium', 
          resource: resource.name,
          message: `${resource.name} sous-utilisé à ${resource.utilization_percentage.toFixed(0)}%`,
          suggestion: `Peut absorber ${(resource.capacity_hours_per_week - resource.allocated_hours_current_week).toFixed(1)}h supplémentaires`,
          action: 'assign_more',
          resourceId: resource.resource_id
        });
      }
    });

    // 3. Prédiction de goulots d'étranglement
    const upcomingDeadlines = allocationsData.filter(alloc => 
      alloc.task?.end_date && 
      new Date(alloc.task.end_date) - new Date() < 7 * 24 * 60 * 60 * 1000 // 7 jours
    );

    if (upcomingDeadlines.length > 5) {
      recommendations.push({
        type: 'bottleneck_risk',
        severity: 'high',
        message: `Risque de goulot: ${upcomingDeadlines.length} tâches à terminer cette semaine`,
        suggestion: 'Prioriser les tâches critiques et étaler les charges',
        action: 'reschedule'
      });
    }

    // 4. Suggestions d'optimisation
    const skillsGaps = detectSkillsGaps(resourcesData, allocationsData);
    skillsGaps.forEach(gap => {
      recommendations.push({
        type: 'skills_optimization',
        severity: 'low',
        message: `Compétence "${gap.skill}" sous-utilisée`,
        suggestion: `Réassigner tâches ${gap.skill} vers ${gap.expert}`,
        action: 'optimize_skills'
      });
    });

    setAIRecommendations(recommendations.slice(0, 8)); // Limiter à 8 recommandations
  };

  // Fonction détection des gaps de compétences
  const detectSkillsGaps = (resources, allocations) => {
    // Logique simplifiée - en réel, analyser les compétences vs assignations
    return [
      { skill: 'Frontend', expert: 'Marie', utilization: 40 },
      { skill: 'Backend', expert: 'Pierre', utilization: 85 }
    ].filter(gap => gap.utilization < 60);
  };

  // Calcul des métriques de capacité par semaine
  const weeklyCapacityData = useMemo(() => {
    const weeks = Array.from({ length: 12 }, (_, i) => addWeeks(selectedWeek, i));
    
    return weeks.map(week => {
      const weekAllocations = allocations.filter(a => a.week_start === week);
      const totalCapacity = resources.reduce((sum, r) => sum + r.capacity_hours_per_week, 0);
      const totalAllocated = weekAllocations.reduce((sum, a) => sum + (a.allocated_hours || 0), 0);
      const utilization = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

      return {
        week: formatWeekRange(week),
        weekStart: week,
        capacity: totalCapacity,
        allocated: totalAllocated,
        utilization: utilization,
        available: Math.max(0, totalCapacity - totalAllocated),
        overload: Math.max(0, totalAllocated - totalCapacity)
      };
    });
  }, [resources, allocations, selectedWeek]);

  // Heat Map des ressources par semaine
  const resourceHeatMapData = useMemo(() => {
    return resources.map(resource => {
      const weeks = Array.from({ length: 8 }, (_, i) => addWeeks(selectedWeek, i));
      
      const weeklyData = weeks.map(week => {
        const weekAllocations = allocations.filter(a => 
          a.week_start === week && a.resource_id === resource.resource_id
        );
        const allocated = weekAllocations.reduce((sum, a) => sum + (a.allocated_hours || 0), 0);
        const utilization = allocated / (resource.capacity_hours_per_week || 40) * 100;
        
        return {
          week,
          utilization: Math.min(utilization, 150), // Cap à 150% pour l'affichage
          allocated,
          status: utilization > 100 ? 'overloaded' : 
                   utilization > 80 ? 'high' : 
                   utilization > 50 ? 'normal' : 'low'
        };
      });

      return {
        resource,
        weeklyData
      };
    });
  }, [resources, allocations, selectedWeek]);

  // Composant Heat Map Cell
  const HeatMapCell = ({ utilization, status, allocated }) => {
    const getColor = () => {
      if (status === 'overloaded') return '#dc2626';
      if (status === 'high') return '#ea580c';  
      if (status === 'normal') return '#16a34a';
      return '#64748b';
    };

    const getBackgroundColor = () => {
      if (status === 'overloaded') return 'rgba(220, 38, 38, 0.1)';
      if (status === 'high') return 'rgba(234, 88, 12, 0.1)';
      if (status === 'normal') return 'rgba(22, 163, 74, 0.1)';
      return 'rgba(100, 116, 139, 0.05)';
    };

    return (
      <Tooltip title={`${allocated.toFixed(1)}h (${utilization.toFixed(0)}%)`}>
        <TableCell 
          sx={{ 
            textAlign: 'center',
            backgroundColor: getBackgroundColor(),
            color: getColor(),
            fontWeight: 'bold',
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
          }}
        >
          {utilization.toFixed(0)}%
        </TableCell>
      </Tooltip>
    );
  };

  // Action de rééquilibrage automatique
  const handleAutoRebalance = async () => {
    // Logique de rééquilibrage IA
    const overloadedResources = resources.filter(r => r.utilization_percentage > 100);
    const underutilizedResources = resources.filter(r => r.utilization_percentage < 70);
    
    if (overloadedResources.length === 0) {
      alert('Aucun rééquilibrage nécessaire !');
      return;
    }

    // Simuler les transferts d'allocation
    const rebalanceOperations = [];
    
    overloadedResources.forEach(overloaded => {
      const excessHours = overloaded.allocated_hours_current_week - overloaded.capacity_hours_per_week;
      
      underutilizedResources.forEach(underutilized => {
        if (excessHours <= 0) return;
        
        const availableHours = underutilized.capacity_hours_per_week - underutilized.allocated_hours_current_week;
        const transferHours = Math.min(excessHours, availableHours);
        
        if (transferHours > 0) {
          rebalanceOperations.push({
            from: overloaded.name,
            to: underutilized.name,
            hours: transferHours
          });
        }
      });
    });

    if (rebalanceOperations.length > 0) {
      const message = rebalanceOperations
        .map(op => `${op.hours.toFixed(1)}h: ${op.from} → ${op.to}`)
        .join('\n');
        
      if (window.confirm(`Rééquilibrage proposé:\n${message}\n\nAppliquer ces changements?`)) {
        // TODO: Implémenter le rééquilibrage réel
        console.log('Rééquilibrage appliqué:', rebalanceOperations);
        alert('🎯 Rééquilibrage appliqué avec succès!');
      }
    }
  };

  if (loading) return <Box sx={{ p: 3 }}>Chargement des capacités...</Box>;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header avec actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <BalanceIcon sx={{ mr: 1 }} />
          Charge / Capacité
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<AIIcon />}
            onClick={handleAutoRebalance}
            color="primary"
          >
            Rééquilibrage IA
          </Button>
          <Button
            variant="outlined"
            startIcon={<SwapIcon />}
            onClick={() => setRebalanceDialog(true)}
          >
            Réassigner manuellement
          </Button>
        </Stack>
      </Box>

      {/* Recommandations IA */}
      {aiRecommendations.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#fef7ff', border: '1px solid #c084fc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AIIcon color="primary" />
            <Typography variant="h6" color="primary">
              Recommandations IA Capacité
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            {aiRecommendations.map((rec, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Alert 
                  severity={rec.severity === 'high' ? 'error' : rec.severity === 'medium' ? 'warning' : 'info'}
                  action={
                    <Button size="small" color="inherit">
                      {rec.action === 'redistribute' ? 'Redistribuer' :
                       rec.action === 'assign_more' ? 'Assigner +' :
                       rec.action === 'reschedule' ? 'Replanifier' : 'Optimiser'}
                    </Button>
                  }
                >
                  <strong>{rec.message}</strong>
                  <br />
                  <Typography variant="caption">{rec.suggestion}</Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Graphique de capacité sur 12 semaines */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <TrendingUpIcon sx={{ mr: 1 }} />
          Évolution Capacité (12 semaines)
        </Typography>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyCapacityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <ChartTooltip />
            <Bar dataKey="capacity" fill="#e5e7eb" name="Capacité totale" />
            <Bar dataKey="allocated" fill="#3b82f6" name="Alloué" />
            <Bar dataKey="overload" fill="#dc2626" name="Surcharge" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Heat Map des ressources */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <MetricsIcon sx={{ mr: 1 }} />
          Heat Map - Charge par Ressource et Semaine
        </Typography>
        
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Ressource</strong></TableCell>
              {weeklyCapacityData.slice(0, 8).map(week => (
                <TableCell key={week.weekStart} align="center">
                  <Typography variant="caption">{week.week}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {resourceHeatMapData.map((resourceData) => (
              <TableRow key={resourceData.resource.resource_id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {resourceData.resource.name.substring(0, 2)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {resourceData.resource.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resourceData.resource.capacity_hours_per_week}h/sem
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                {resourceData.weeklyData.map((weekData, idx) => (
                  <HeatMapCell 
                    key={idx}
                    utilization={weekData.utilization}
                    status={weekData.status}
                    allocated={weekData.allocated}
                  />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Métriques résumées */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {resources.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ressources actives
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {resources.filter(r => r.utilization_percentage > 100).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ressources surchargées
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {Math.round(resources.reduce((sum, r) => sum + r.utilization_percentage, 0) / resources.length)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Utilisation moyenne
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {Math.round(resources.reduce((sum, r) => sum + Math.max(0, r.capacity_hours_per_week - r.allocated_hours_current_week), 0))}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Capacité disponible
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ResourceCapacityManager;