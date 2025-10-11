// utils/budgetCalculator.js - Calculateur de métriques budgétaires (adapté au nouveau schéma)

/**
 * Calcule les métriques budgétaires clés à partir des données du projet et de la liste des postes budgétaires.
 * @param {object} project - L'objet projet contenant budget_allocated et budget_spent.
 * @param {Array} budgetItems - La liste des postes budgétaires (de la table 'budgets').
 * @returns {object} Un objet contenant les métriques calculées.
 */
export const calculateBudgetMetrics = (project, budgetItems) => {
  // Valeurs par défaut si les données ne sont pas disponibles
  if (!project) {
    return {
      total: 0,
      spent: 0,
      remaining: 0,
      usagePercent: 0,
      itemCount: 0,
      categories: [],
    };
  }

  // Utiliser les totaux déjà calculés dans la table 'projects' comme source de vérité
  const total = project.budget_allocated || 0;
  const spent = project.budget_spent || 0;
  const remaining = total - spent;
  const usagePercent = total > 0 ? (spent / total) * 100 : 0;

  // Analyser les postes budgétaires pour obtenir des détails par catégorie
  const categories = calculateCategoryBreakdown(budgetItems || []);

  return {
    total,
    spent,
    remaining,
    usagePercent,
    itemCount: budgetItems?.length || 0,
    categories,
  };
};

/**
 * Regroupe les postes budgétaires par catégorie et calcule les totaux pour chacune.
 * @param {Array} budgetItems - La liste des postes budgétaires.
 * @returns {Array} Une liste d'objets, chacun représentant une catégorie avec ses totaux.
 */
const calculateCategoryBreakdown = (budgetItems) => {
  const categoryData = {};

  budgetItems.forEach(item => {
    const categoryName = item.category || 'Non catégorisé';

    if (!categoryData[categoryName]) {
      categoryData[categoryName] = {
        name: categoryName,
        estimated: 0,
        actual: 0,
        count: 0,
      };
    }

    categoryData[categoryName].estimated += item.estimated_amount || 0;
    categoryData[categoryName].actual += item.actual_amount || 0;
    categoryData[categoryName].count += 1;
  });

  return Object.values(categoryData).sort((a, b) => b.actual - a.actual);
};

export default {
  calculateBudgetMetrics,
};
