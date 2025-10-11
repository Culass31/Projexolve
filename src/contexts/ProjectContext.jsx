// contexts/ProjectContext.jsx - Contexte de gestion de projet
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../App';
import { useAuth } from './AuthContext';
import { calculateBudgetMetrics } from '../utils/budgetCalculator';

const ProjectContext = createContext({});

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  // États principaux
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [risks, setRisks] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  
  // États UI
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('kanban');
  const [selectedTask, setSelectedTask] = useState(null);
  
  // États calculés
  const [budgetMetrics, setBudgetMetrics] = useState(null);

  const loadProjectData = useCallback(async () => {
    if (!projectId || !user) return;

    setLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const [tasksResult, risksResult, budgetResult] = await Promise.all([
        supabase.from('tasks').select('*').eq('project_id', projectId).order('position'),
        supabase.from('risks').select('*').eq('project_id', projectId).order('risk_score', { ascending: false }),
        supabase.from('budgets').select('*').eq('project_id', projectId).order('created_at')
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (risksResult.error) throw risksResult.error;
      if (budgetResult.error) throw budgetResult.error;

      const fetchedTasks = tasksResult.data || [];
      setTasks(fetchedTasks);
      setRisks(risksResult.data || []);
      setBudgetItems(budgetResult.data || []);

      if (fetchedTasks.length > 0) {
        const taskIds = fetchedTasks.map(t => t.id);
        const { data: depsData, error: depsError } = await supabase
          .from('dependencies')
          .select('*')
          .or(`source_task_id.in.(${taskIds.join(',')}),target_task_id.in.(${taskIds.join(',')})`);
        
        if (depsError) throw depsError;
        setDependencies(depsData || []);
      } else {
        setDependencies([]);
      }

    } catch (error) {
      console.error('Erreur détaillée lors du chargement du projet:', error);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  const recalculateBudget = useCallback(() => {
    if (project && budgetItems) {
      const metrics = calculateBudgetMetrics(project, budgetItems);
      setBudgetMetrics(metrics);
    }
  }, [project, budgetItems]);

  // --- Fonctions de modification des données ---

  const createTask = useCallback(async (taskData, column) => {
    if (!projectId || !user) throw new Error("Projet ou utilisateur non défini.");

    try {
      // Construction explicite du payload pour garantir l'intégrité des données
      const newTaskPayload = {
        project_id: projectId,
        name: taskData.name,
        description: taskData.description || null,
        tags: taskData.tags || [],
        priority: taskData.priority?.toLowerCase() || 'medium',
        estimated_hours: taskData.estimated_hours || null,
        
        // Champs définis par le système
        created_by: user.id,
        kanban_column: column,
        start_date: new Date().toISOString().split('T')[0],
        position: tasks.filter(t => t.kanban_column === column).length,
        duration: 1, // Valeur par défaut
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(newTaskPayload)
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      throw error;
    }
  }, [projectId, user, tasks]);

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(task => (task.id === taskId ? data : task)));
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
      throw error;
    }
  }, []);

  // Charger les données au montage
  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Recalculer le budget quand les items ou le projet changent
  useEffect(() => {
    recalculateBudget();
  }, [recalculateBudget]);

  const value = {
    project,
    tasks,
    dependencies,
    risks,
    budgetItems,
    loading,
    activeView,
    selectedTask,
    budgetMetrics,
    setActiveView,
    setSelectedTask,
    loadProjectData,
    createTask,
    updateTask,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
