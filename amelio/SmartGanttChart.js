// SmartGanttChart.js - Gantt avec gestion intelligente des weekends
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Box, Button, FormControlLabel, Switch, Tooltip, Chip, Stack } from '@mui/material';
import { Weekend as WeekendIcon, CalendarToday as CalendarIcon, 
         Timeline as TimelineIcon, AutoAwesome as AIIcon } from '@mui/icons-material';

const SmartGanttChart = ({ 
  tasks, 
  links, 
  onTasksChange, 
  onLinkCreate, 
  onLinkDelete,
  excludeWeekends = true,
  countryCode = 'FR'
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tempLinkRef = useRef(null);
  
  const [isWeekendMode, setIsWeekendMode] = useState(excludeWeekends);
  const [editingTask, setEditingTask] = useState(null);
  const [dragMode, setDragMode] = useState(null); // null, 'move', 'resize-start', 'resize-end'
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState(null);
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  // Configuration avancée
  const ganttConfig = {
    taskHeight: 32,
    rowPadding: 8,
    timelineHeight: 60,
    leftPanelWidth: 250,
    dayWidth: 30,
    weekendColor: '#f3f4f6',
    holidayColor: '#fecaca',
    criticalPathColor: '#ef4444',
    linkColors: {
      'FS': '#6b7280', // Finish-to-Start - gris
      'SS': '#3b82f6', // Start-to-Start - bleu
      'FF': '#10b981', // Finish-to-Finish - vert
      'SF': '#f59e0b'  // Start-to-Finish - orange
    }
  };

  // Jours fériés par pays (base de données simplifiée)
  const holidays = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const holidaysByCountry = {
      'FR': [
        `${currentYear}-01-01`, // Nouvel An
        `${currentYear}-05-01`, // Fête du Travail
        `${currentYear}-05-08`, // Victoire 1945
        `${currentYear}-07-14`, // Fête Nationale
        `${currentYear}-08-15`, // Assomption
        `${currentYear}-11-01`, // Toussaint
        `${currentYear}-11-11`, // Armistice
        `${currentYear}-12-25`, // Noël
      ],
      'US': [
        `${currentYear}-01-01`, // New Year
        `${currentYear}-07-04`, // Independence Day
        `${currentYear}-12-25`, // Christmas
      ]
    };
    return holidaysByCountry[countryCode] || [];
  }, [countryCode]);

  // Utilitaires de calcul de dates ouvrées
  const dateUtils = useMemo(() => ({
    isWeekend: (date) => {
      const day = new Date(date).getDay();
      return day === 0 || day === 6; // Dimanche ou Samedi
    },
    
    isHoliday: (date) => {
      const dateStr = new Date(date).toISOString().split('T')[0];
      return holidays.includes(dateStr);
    },
    
    isWorkingDay: (date) => {
      if (isWeekendMode && dateUtils.isWeekend(date)) return false;
      return !dateUtils.isHoliday(date);
    },
    
    addWorkingDays: (startDate, days) => {
      let currentDate = new Date(startDate);
      let remainingDays = days;
      
      while (remainingDays > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (dateUtils.isWorkingDay(currentDate)) {
          remainingDays--;
        }
      }
      
      return currentDate;
    },
    
    calculateWorkingDays: (startDate, endDate) => {
      let workingDays = 0;
      let currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      while (currentDate <= end) {
        if (dateUtils.isWorkingDay(currentDate)) {
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return workingDays;
    }
  }), [isWeekendMode, holidays]);

  // Calcul des tâches avec dates ajustées
  const processedTasks = useMemo(() => {
    return tasks.map(task => {
      const originalStart = new Date(task.start_date);
      const originalEnd = new Date(task.end_date || dateUtils.addWorkingDays(originalStart, task.duration));
      
      // Recalculer si mode weekend activé
      let adjustedStart = originalStart;
      let adjustedEnd = originalEnd;
      
      if (isWeekendMode) {
        // Décaler le début si c'est un weekend/férié
        while (!dateUtils.isWorkingDay(adjustedStart)) {
          adjustedStart.setDate(adjustedStart.getDate() + 1);
        }
        
        // Recalculer la fin en fonction de la durée en jours ouvrés
        adjustedEnd = dateUtils.addWorkingDays(adjustedStart, task.duration);
      }
      
      return {
        ...task,
        originalStart: originalStart,
        originalEnd: originalEnd,
        adjustedStart: adjustedStart,
        adjustedEnd: adjustedEnd,
        displayStart: adjustedStart,
        displayEnd: adjustedEnd,
        workingDaysImpact: dateUtils.calculateWorkingDays(originalStart, adjustedEnd) - task.duration
      };
    });
  }, [tasks, isWeekendMode, dateUtils]);

  // Échelles D3
  const scales = useMemo(() => {
    if (!processedTasks.length) return null;
    
    const minDate = d3.min(processedTasks, d => d.displayStart);
    const maxDate = d3.max(processedTasks, d => d.displayEnd);
    
    // Étendre la plage de dates pour le contexte
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 14);
    
    const xScale = d3.scaleTime()
      .domain([startDate, endDate])
      .range([ganttConfig.leftPanelWidth, ganttConfig.leftPanelWidth + (endDate - startDate) / (1000 * 60 * 60 * 24) * ganttConfig.dayWidth]);
    
    const yScale = d3.scaleBand()
      .domain(processedTasks.map(t => t.id))
      .range([ganttConfig.timelineHeight, ganttConfig.timelineHeight + processedTasks.length * (ganttConfig.taskHeight + ganttConfig.rowPadding)])
      .padding(0.1);
    
    return { xScale, yScale, startDate, endDate };
  }, [processedTasks]);

  // Fonction de rendu principal
  const renderGantt = useCallback(() => {
    if (!scales || !processedTasks.length) return;
    
    const { xScale, yScale, startDate, endDate } = scales;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = xScale.range()[1] + 100;
    const height = yScale.range()[1] + 100;
    
    svg.attr('width', width).attr('height', height);
    
    // Groupe principal
    const mainGroup = svg.append('g');
    
    // 1. Grille temporelle avec weekends
    const daysRange = d3.timeDay.range(startDate, endDate);
    
    // Bandes de weekend
    if (isWeekendMode) {
      mainGroup.selectAll('.weekend-band')
        .data(daysRange.filter(d => dateUtils.isWeekend(d)))
        .enter()
        .append('rect')
        .attr('class', 'weekend-band')
        .attr('x', d => xScale(d))
        .attr('y', ganttConfig.timelineHeight)
        .attr('width', ganttConfig.dayWidth)
        .attr('height', height - ganttConfig.timelineHeight)
        .attr('fill', ganttConfig.weekendColor)
        .attr('opacity', 0.5);
    }
    
    // Jours fériés
    mainGroup.selectAll('.holiday-band')
      .data(daysRange.filter(d => dateUtils.isHoliday(d)))
      .enter()
      .append('rect')
      .attr('class', 'holiday-band')
      .attr('x', d => xScale(d))
      .attr('y', ganttConfig.timelineHeight)
      .attr('width', ganttConfig.dayWidth)
      .attr('height', height - ganttConfig.timelineHeight)
      .attr('fill', ganttConfig.holidayColor)
      .attr('opacity', 0.3);
    
    // Lignes de grille verticales
    mainGroup.selectAll('.grid-line-vertical')
      .data(daysRange.filter((d, i) => i % 7 === 0)) // Une ligne par semaine
      .enter()
      .append('line')
      .attr('class', 'grid-line-vertical')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', ganttConfig.timelineHeight)
      .attr('y2', height)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);
    
    // 2. Timeline header
    const timelineGroup = mainGroup.append('g').attr('class', 'timeline-header');
    
    // Semaines
    const weeks = d3.timeWeek.range(startDate, endDate);
    timelineGroup.selectAll('.week-label')
      .data(weeks)
      .enter()
      .append('text')
      .attr('class', 'week-label')
      .attr('x', d => xScale(d) + (xScale(d3.timeWeek.offset(d, 1)) - xScale(d)) / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => d3.timeFormat('Sem %V')(d));
    
    // Jours
    timelineGroup.selectAll('.day-label')
      .data(daysRange)
      .enter()
      .append('text')
      .attr('class', 'day-label')
      .attr('x', d => xScale(d) + ganttConfig.dayWidth / 2)
      .attr('y', 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', d => dateUtils.isWeekend(d) ? '#ef4444' : '#374151')
      .text(d => d3.timeFormat('%d')(d));
    
    // 3. Panel gauche avec noms des tâches
    const leftPanel = mainGroup.append('g').attr('class', 'left-panel');
    
    leftPanel.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', ganttConfig.leftPanelWidth)
      .attr('height', height)
      .attr('fill', '#f9fafb')
      .attr('stroke', '#e5e7eb');
    
    const taskLabels = leftPanel.selectAll('.task-label')
      .data(processedTasks)
      .enter()
      .append('g')
      .attr('class', 'task-label')
      .attr('transform', d => `translate(10, ${yScale(d.id) + ganttConfig.taskHeight / 2})`);
    
    taskLabels.append('text')
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => d.name || d.text);
    
    // Indicateur d'impact weekend
    taskLabels.filter(d => d.workingDaysImpact > 0)
      .append('text')
      .attr('y', 18)
      .attr('font-size', '10px')
      .attr('fill', '#f59e0b')
      .text(d => `+${d.workingDaysImpact}j`);
    
    // 4. Barres de tâches avec gestion avancée
    const taskGroups = mainGroup.selectAll('.task-group')
      .data(processedTasks)
      .enter()
      .append('g')
      .attr('class', 'task-group')
      .attr('transform', d => `translate(0, ${yScale(d.id)})`);
    
    // Barre principale
    const taskBars = taskGroups.append('rect')
      .attr('class', 'task-bar')
      .attr('x', d => xScale(d.displayStart))
      .attr('width', d => Math.max(5, xScale(d.displayEnd) - xScale(d.displayStart)))
      .attr('height', ganttConfig.taskHeight)
      .attr('fill', d => {
        if (d.is_critical && showCriticalPath) return ganttConfig.criticalPathColor;
        return d.color || '#3b82f6';
      })
      .attr('stroke', d => d.is_critical && showCriticalPath ? '#dc2626' : 'none')
      .attr('stroke-width', 2)
      .attr('rx', 4)
      .attr('cursor', 'move')
      .on('mouseenter', function(event, d) {
        // Tooltip enrichi
        const tooltip = d3.select('body').append('div')
          .attr('class', 'gantt-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0,0,0,0.8)')
          .style('color', 'white')
          .style('padding', '10px')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('font-size', '12px')
          .html(`
            <strong>${d.name}</strong><br/>
            Durée: ${d.duration} jours<br/>
            ${isWeekendMode ? `Impact weekends: +${d.workingDaysImpact} jours<br/>` : ''}
            Progress: ${d.progress || 0}%<br/>
            ${d.assigned_to ? `Assigné: ${d.assigned_to}<br/>` : ''}
            ${d.is_critical ? '<span style="color: #ef4444">🚨 CRITIQUE</span>' : ''}
          `);
        
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseleave', function() {
        d3.selectAll('.gantt-tooltip').remove();
      })
      .on('dblclick', function(event, d) {
        setEditingTask(d);
      });
    
    // Barre de progression
    taskBars.each(function(d) {
      if (d.progress > 0) {
        const barWidth = xScale(d.displayEnd) - xScale(d.displayStart);
        const progressWidth = (barWidth * d.progress) / 100;
        
        d3.select(this.parentNode)
          .append('rect')
          .attr('class', 'progress-bar')
          .attr('x', xScale(d.displayStart))
          .attr('width', progressWidth)
          .attr('height', ganttConfig.taskHeight)
          .attr('fill', 'rgba(255,255,255,0.3)')
          .attr('rx', 4);
      }
    });
    
    // Poignées de redimensionnement
    taskGroups.each(function(d) {
      const group = d3.select(this);
      const barWidth = xScale(d.displayEnd) - xScale(d.displayStart);
      
      // Poignée gauche
      group.append('circle')
        .attr('class', 'resize-handle resize-start')
        .attr('cx', xScale(d.displayStart))
        .attr('cy', ganttConfig.taskHeight / 2)
        .attr('r', 6)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#1e40af')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .attr('cursor', 'ew-resize')
        .on('mousedown', function(event) {
          event.stopPropagation();
          setDragMode('resize-start');
          // TODO: Implémenter logique de resize
        });
      
      // Poignée droite  
      group.append('circle')
        .attr('class', 'resize-handle resize-end')
        .attr('cx', xScale(d.displayEnd))
        .attr('cy', ganttConfig.taskHeight / 2)
        .attr('r', 6)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#1e40af')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .attr('cursor', 'ew-resize')
        .on('mousedown', function(event) {
          event.stopPropagation();
          setDragMode('resize-end');
          // TODO: Implémenter logique de resize
        });
      
      // Poignées de liens (précises)
      group.append('circle')
        .attr('class', 'link-handle link-start')
        .attr('cx', xScale(d.displayStart))
        .attr('cy', ganttConfig.taskHeight / 2)
        .attr('r', 4)
        .attr('fill', '#f59e0b')
        .attr('opacity', 0)
        .attr('cursor', 'crosshair')
        .on('mousedown', function(event) {
          event.stopPropagation();
          setLinkMode(true);
          setLinkSource({ taskId: d.id, type: 'start', x: xScale(d.displayStart), y: yScale(d.id) + ganttConfig.taskHeight / 2 });
        });
      
      group.append('circle')
        .attr('class', 'link-handle link-end')
        .attr('cx', xScale(d.displayEnd))
        .attr('cy', ganttConfig.taskHeight / 2)
        .attr('r', 4)
        .attr('fill', '#f59e0b')
        .attr('opacity', 0)
        .attr('cursor', 'crosshair')
        .on('mousedown', function(event) {
          event.stopPropagation();
          setLinkMode(true);
          setLinkSource({ taskId: d.id, type: 'end', x: xScale(d.displayEnd), y: yScale(d.id) + ganttConfig.taskHeight / 2 });
        });
    });
    
    // Affichage des poignées au survol
    taskGroups
      .on('mouseenter', function() {
        d3.select(this).selectAll('.resize-handle, .link-handle')
          .attr('opacity', 1);
      })
      .on('mouseleave', function() {
        if (!linkMode) {
          d3.select(this).selectAll('.resize-handle, .link-handle')
            .attr('opacity', 0);
        }
      });
    
    // 5. Liens avec types différenciés
    const linkGroup = mainGroup.append('g').attr('class', 'links-group');
    
    links.forEach(link => {
      const sourceTask = processedTasks.find(t => t.id === link.source);
      const targetTask = processedTasks.find(t => t.id === link.target);
      
      if (!sourceTask || !targetTask) return;
      
      const linkType = link.type || 'FS';
      let sourceX, sourceY, targetX, targetY;
      
      // Calcul des positions selon le type de lien
      switch(linkType) {
        case 'FS': // Finish-to-Start
          sourceX = xScale(sourceTask.displayEnd);
          targetX = xScale(targetTask.displayStart);
          break;
        case 'SS': // Start-to-Start
          sourceX = xScale(sourceTask.displayStart);
          targetX = xScale(targetTask.displayStart);
          break;
        case 'FF': // Finish-to-Finish
          sourceX = xScale(sourceTask.displayEnd);
          targetX = xScale(targetTask.displayEnd);
          break;
        case 'SF': // Start-to-Finish
          sourceX = xScale(sourceTask.displayStart);
          targetX = xScale(targetTask.displayEnd);
          break;
      }
      
      sourceY = yScale(sourceTask.id) + ganttConfig.taskHeight / 2;
      targetY = yScale(targetTask.id) + ganttConfig.taskHeight / 2;
      
      // Chemin du lien avec coudes
      const pathData = createLinkPath(sourceX, sourceY, targetX, targetY);
      
      linkGroup.append('path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', ganttConfig.linkColors[linkType])
        .attr('stroke-width', sourceTask.is_critical && targetTask.is_critical && showCriticalPath ? 3 : 2)
        .attr('marker-end', 'url(#arrowhead)')
        .on('dblclick', function() {
          if (onLinkDelete) onLinkDelete(link.id);
        });
    });
    
    // Marker pour flèches
    const defs = svg.append('defs');
    Object.entries(ganttConfig.linkColors).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrowhead-${type}`)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', color);
    });
    
  }, [processedTasks, scales, isWeekendMode, showCriticalPath, links, dateUtils]);

  // Fonction pour créer le chemin des liens
  const createLinkPath = (x1, y1, x2, y2) => {
    const offset = 20;
    const path = d3.path();
    path.moveTo(x1, y1);
    path.lineTo(x1 + offset, y1);
    path.lineTo(x1 + offset, y2);
    path.lineTo(x2, y2);
    return path.toString();
  };

  // Handler pour le changement de mode weekend
  const handleWeekendModeChange = (event) => {
    const newMode = event.target.checked;
    setIsWeekendMode(newMode);
    
    // Notification de l'impact
    const impact = processedTasks.reduce((sum, task) => sum + task.workingDaysImpact, 0);
    if (impact > 0) {
      // TODO: Afficher notification d'impact
      console.log(`Impact weekends: +${impact} jours au total`);
    }
  };

  // Effect pour le rendu
  useEffect(() => {
    renderGantt();
  }, [renderGantt]);

  // Effect pour notifier les changements de dates
  useEffect(() => {
    if (onTasksChange && processedTasks.length > 0) {
      const updatedTasks = processedTasks.map(task => ({
        ...task,
        start_date: task.displayStart.toISOString().split('T')[0],
        end_date: task.displayEnd.toISOString().split('T')[0]
      }));
      // onTasksChange(updatedTasks); // Décommenter si nécessaire
    }
  }, [processedTasks, onTasksChange]);

  return (
    <Box>
      {/* Contrôles */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isWeekendMode}
              onChange={handleWeekendModeChange}
              color="warning"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WeekendIcon />
              Exclure weekends
              {isWeekendMode && (
                <Chip 
                  label={`+${processedTasks.reduce((sum, task) => sum + task.workingDaysImpact, 0)} jours`}
                  size="small" 
                  color="warning" 
                />
              )}
            </Box>
          }
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              color="error"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon />
              Chemin critique
            </Box>
          }
        />
        
        <Button
          variant="outlined"
          startIcon={<CalendarIcon />}
          size="small"
          onClick={() => {
            // TODO: Ouvrir sélecteur de pays pour jours fériés
          }}
        >
          Jours fériés ({countryCode})
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<AIIcon />}
          size="small"
          onClick={() => {
            // TODO: Suggestions IA d'optimisation planning
          }}
        >
          Suggestions IA
        </Button>
      </Stack>
      
      {/* Gantt Chart */}
      <Box
        ref={containerRef}
        sx={{
          overflowX: 'auto',
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: 1,
          backgroundColor: 'white'
        }}
      >
        <svg ref={svgRef} />
      </Box>
      
      {/* Modal d'édition */}
      {editingTask && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ backgroundColor: 'white', p: 3, borderRadius: 2, minWidth: 400 }}>
            <Typography variant="h6">Édition: {editingTask.name}</Typography>
            {/* TODO: Formulaire d'édition complet */}
            <Button onClick={() => setEditingTask(null)}>Fermer</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SmartGanttChart;