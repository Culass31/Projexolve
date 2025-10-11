import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { 
  Box, Typography, Button, Menu, MenuItem, Chip, Grid, Paper,
  Tooltip, IconButton, Breadcrumbs, Link
} from '@mui/material';
import { 
  Calculate as CalculateIcon, 
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  Print as PrintIcon,
  FileUpload as ExportIcon,
  Inventory as ArchiveIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  NavigateNext as NavigateNextIcon,
  Error as ErrorIcon,
  Home
} from '@mui/icons-material';


const ProjectHeader = ({ project, stats }) => {
  const { recalculateSchedule } = useProject();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const getHealthChip = () => {
    if (!stats) return null;
    let score = 100;
    if (stats.overdueTasks > 0) score -= stats.overdueTasks * 15;
    if (stats.highRisks > 0) score -= stats.highRisks * 5;
    if (stats.budgetUsed > 90) score -= 25;
    score = Math.max(0, score);

    if (score >= 85) return <Chip icon={<CheckCircleIcon />} label="Excellent" color="success" size="small" />;
    if (score >= 70) return <Chip icon={<CheckCircleIcon />} label="Bon" color="primary" size="small" />;
    if (score >= 50) return <Chip icon={<WarningIcon />} label="Moyen" color="warning" size="small" />;
    return <Chip icon={<ErrorIcon />} label="Attention" color="error" size="small" />;
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('fr-FR') : 'N/A';

  return (
    <Paper sx={{ p: 3, mb: 3 }} elevation={0} variant="outlined">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
            <Link component="button" onClick={() => navigate('/dashboard')} sx={{ display: 'flex', alignItems: 'center' }} underline="hover" color="inherit"><Home sx={{ mr: 0.5 }} fontSize="inherit" />Dashboard</Link>
            <Link component="button" onClick={() => navigate('/projects')} underline="hover" color="inherit">Projets</Link>
            <Typography color="text.primary">{project.name}</Typography>
          </Breadcrumbs>
          <Typography variant="h4" fontWeight="700">{project.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {project.description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Chip label={project.status || 'N/A'} size="small" />
            {getHealthChip()}
            <Typography variant="caption" color="text.secondary">
              {formatDate(project.start_date)} - {formatDate(project.end_date)}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Button variant="outlined" startIcon={<CalculateIcon />} onClick={recalculateSchedule} sx={{ mr: 1 }}>
            Recalculer
          </Button>
          <IconButton onClick={handleClick}><MoreVertIcon /></IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            <MenuItem onClick={handleClose}><SettingsIcon sx={{ mr: 1 }} />Paramètres</MenuItem>
            <MenuItem onClick={handleClose}><PrintIcon sx={{ mr: 1 }} />Imprimer</MenuItem>
            <MenuItem onClick={handleClose}><ExportIcon sx={{ mr: 1 }} />Exporter</MenuItem>
            <MenuItem onClick={handleClose} sx={{ color: 'error.main' }}><ArchiveIcon sx={{ mr: 1 }} />Archiver</MenuItem>
          </Menu>
        </Box>
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <StatItem icon={<CheckCircleIcon color="success"/>} value={`${stats.completedTasks} / ${stats.totalTasks}`} label="Tâches" />
          <StatItem icon={<AccessTimeIcon color="warning"/>} value={stats.overdueTasks} label="En retard" />
          <StatItem icon={<WarningIcon color="error"/>} value={stats.highRisks} label="Risques élevés" />
          <StatItem icon={<AccountBalanceWalletIcon color="primary"/>} value={`${stats.budgetUsed}%`} label="Budget utilisé" />
        </Grid>
      )}
    </Paper>
  );
};

const StatItem = ({ icon, value, label }) => (
  <Grid item xs={6} sm={3}>
    <Tooltip title={label}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {icon}
        <Box sx={{ ml: 1.5 }}>
          <Typography variant="h6" fontWeight="600">{value}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5 }}>{label}</Typography>
        </Box>
      </Box>
    </Tooltip>
  </Grid>
);

export default ProjectHeader;