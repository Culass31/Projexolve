// utils/pertCalculator.js - Calculateur PERT/CPM professionnel
export const calculatePertSchedule = (tasks, dependencies) => {
  try {
    // Initialiser les structures
    const taskMap = new Map();
    const predecessors = new Map();
    const successors = new Map();
    
    // Préparer les données
    tasks.forEach(task => {
      const taskData = {
        id: task.id,
        name: task.name,
        duration: task.duration || 1,
        earlyStart: null,
        earlyFinish: null,
        lateStart: null,
        lateFinish: null,
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false
      };
      
      taskMap.set(task.id, taskData);
      predecessors.set(task.id, []);
      successors.set(task.id, []);
    });

    // Construire les relations
    dependencies.forEach(dep => {
      if (taskMap.has(dep.predecessor_id) && taskMap.has(dep.successor_id)) {
        predecessors.get(dep.successor_id).push({
          taskId: dep.predecessor_id,
          type: dep.dependency_type || 'FS',
          lag: dep.lag_days || 0
        });
        successors.get(dep.predecessor_id).push({
          taskId: dep.successor_id,
          type: dep.dependency_type || 'FS',
          lag: dep.lag_days || 0
        });
      }
    });

    // Calcul avant (Early Start/Finish)
    const calculateForwardPass = () => {
      const visited = new Set();
      const queue = [];
      
      // Trouver les tâches de départ (sans prédécesseurs)
      taskMap.forEach((task, taskId) => {
        if (predecessors.get(taskId).length === 0) {
          task.earlyStart = 0;
          task.earlyFinish = task.earlyStart + task.duration;
          queue.push(taskId);
          visited.add(taskId);
        }
      });

      while (queue.length > 0) {
        const currentTaskId = queue.shift();
        const currentTask = taskMap.get(currentTaskId);

        // Traiter tous les successeurs
        successors.get(currentTaskId).forEach(successor => {
          const successorTask = taskMap.get(successor.taskId);
          const successorPreds = predecessors.get(successor.taskId);
          
          // Calculer la date de début basée sur cette relation
          let requiredStart;
          
          switch (successor.type) {
            case 'FS': // Finish-to-Start
              requiredStart = currentTask.earlyFinish + successor.lag;
              break;
            case 'SS': // Start-to-Start
              requiredStart = currentTask.earlyStart + successor.lag;
              break;
            case 'FF': // Finish-to-Finish
              requiredStart = currentTask.earlyFinish - successorTask.duration + successor.lag;
              break;
            case 'SF': // Start-to-Finish
              requiredStart = currentTask.earlyStart - successorTask.duration + successor.lag;
              break;
            default:
              requiredStart = currentTask.earlyFinish + successor.lag;
          }

          // Mettre à jour si c'est plus tardif
          if (successorTask.earlyStart === null || requiredStart > successorTask.earlyStart) {
            successorTask.earlyStart = requiredStart;
            successorTask.earlyFinish = successorTask.earlyStart + successorTask.duration;
          }

          // Vérifier si tous les prédécesseurs ont été traités
          const allPredsProcessed = successorPreds.every(pred => 
            visited.has(pred.taskId)
          );

          if (allPredsProcessed && !visited.has(successor.taskId)) {
            queue.push(successor.taskId);
            visited.add(successor.taskId);
          }
        });
      }
    };

    // Calcul arrière (Late Start/Finish)
    const calculateBackwardPass = () => {
      // Trouver la date de fin du projet
      let projectFinish = 0;
      taskMap.forEach(task => {
        if (task.earlyFinish > projectFinish) {
          projectFinish = task.earlyFinish;
        }
      });

      const visited = new Set();
      const queue = [];

      // Trouver les tâches de fin (sans successeurs)
      taskMap.forEach((task, taskId) => {
        if (successors.get(taskId).length === 0) {
          task.lateFinish = task.earlyFinish;
          task.lateStart = task.lateFinish - task.duration;
          queue.push(taskId);
          visited.add(taskId);
        }
      });

      while (queue.length > 0) {
        const currentTaskId = queue.shift();
        const currentTask = taskMap.get(currentTaskId);

        // Traiter tous les prédécesseurs
        predecessors.get(currentTaskId).forEach(predecessor => {
          const predTask = taskMap.get(predecessor.taskId);
          const predSuccessors = successors.get(predecessor.taskId);
          
          // Calculer la date de fin requise basée sur cette relation
          let requiredFinish;
          
          switch (predecessor.type) {
            case 'FS': // Finish-to-Start
              requiredFinish = currentTask.lateStart - predecessor.lag;
              break;
            case 'SS': // Start-to-Start
              requiredFinish = currentTask.lateStart - predecessor.lag + predTask.duration;
              break;
            case 'FF': // Finish-to-Finish
              requiredFinish = currentTask.lateFinish - predecessor.lag;
              break;
            case 'SF': // Start-to-Finish
              requiredFinish = currentTask.lateFinish + predTask.duration - predecessor.lag;
              break;
            default:
              requiredFinish = currentTask.lateStart - predecessor.lag;
          }

          // Mettre à jour si c'est plus tôt
          if (predTask.lateFinish === null || requiredFinish < predTask.lateFinish) {
            predTask.lateFinish = requiredFinish;
            predTask.lateStart = predTask.lateFinish - predTask.duration;
          }

          // Vérifier si tous les successeurs ont été traités
          const allSuccsProcessed = predSuccessors.every(succ => 
            visited.has(succ.taskId)
          );

          if (allSuccsProcessed && !visited.has(predecessor.taskId)) {
            queue.push(predecessor.taskId);
            visited.add(predecessor.taskId);
          }
        });
      }
    };

    // Calculer les marges
    const calculateFloats = () => {
      taskMap.forEach(task => {
        // Marge totale
        task.totalFloat = task.lateStart - task.earlyStart;
        
        // Marge libre
        let minSuccessorStart = Infinity;
        successors.get(task.id).forEach(successor => {
          const successorTask = taskMap.get(successor.taskId);
          if (successorTask.earlyStart < minSuccessorStart) {
            minSuccessorStart = successorTask.earlyStart;
          }
        });
        
        if (minSuccessorStart === Infinity) {
          task.freeFloat = task.totalFloat;
        } else {
          task.freeFloat = minSuccessorStart - task.earlyFinish;
        }
        
        // Tâche critique si marge totale = 0
        task.isCritical = task.totalFloat === 0;
      });
    };

    // Trouver le chemin critique
    const findCriticalPath = () => {
      const criticalTasks = [];
      taskMap.forEach((task, taskId) => {
        if (task.isCritical) {
          criticalTasks.push(taskId);
        }
      });
      return criticalTasks;
    };

    // Exécuter les calculs
    calculateForwardPass();
    calculateBackwardPass();
    calculateFloats();
    const criticalPath = findCriticalPath();

    // Calculer les métriques du projet
    let projectDuration = 0;
    let projectEndDate = null;
    
    taskMap.forEach(task => {
      if (task.earlyFinish > projectDuration) {
        projectDuration = task.earlyFinish;
      }
    });

    if (projectDuration > 0) {
      projectEndDate = new Date();
      projectEndDate.setDate(projectEndDate.getDate() + projectDuration);
    }

    // Retourner les résultats
    return {
      success: true,
      tasks: Array.from(taskMap.values()),
      criticalPath,
      projectDuration,
      projectEndDate,
      totalTasks: tasks.length,
      criticalTasks: criticalPath.length,
      averageFloat: taskMap.size > 0 
        ? Array.from(taskMap.values()).reduce((sum, task) => sum + task.totalFloat, 0) / taskMap.size
        : 0
    };

  } catch (error) {
    console.error('Erreur calcul PERT:', error);
    return {
      success: false,
      error: error.message,
      tasks: [],
      criticalPath: [],
      projectDuration: 0,
      projectEndDate: null
    };
  }
};

// Utilitaires de dates
export const addWorkingDays = (startDate, days, workingDays = [1, 2, 3, 4, 5]) => {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    
    // Vérifier si c'est un jour ouvré (1 = lundi, 7 = dimanche)
    const dayOfWeek = result.getDay() === 0 ? 7 : result.getDay();
    if (workingDays.includes(dayOfWeek)) {
      addedDays++;
    }
  }
  
  return result;
};

export const getWorkingDaysBetween = (startDate, endDate, workingDays = [1, 2, 3, 4, 5]) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDaysCount = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
    if (workingDays.includes(dayOfWeek)) {
      workingDaysCount++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDaysCount;
};

// Export par défaut
export default {
  calculatePertSchedule,
  addWorkingDays,
  getWorkingDaysBetween
};