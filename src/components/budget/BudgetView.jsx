// components/budget/BudgetView.jsx - Vue budget avec métriques et suivi
import React, { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import LoadingSpinner from '../common/LoadingSpinner';

const BudgetView = () => {
  const { 
    budget,
    expenses, 
    budgetMetrics,
    createExpense,
    loading 
  } = useProject();

  const [activeTab, setActiveTab] = useState('overview');
  const [showAddExpense, setShowAddExpense] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'expenses', label: 'Dépenses', icon: '💸' },
    { id: 'categories', label: 'Catégories', icon: '📂' },
    { id: 'reports', label: 'Rapports', icon: '📈' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getBudgetHealth = () => {
    if (!budget) return { status: 'unknown', color: '#6b7280' };
    
    const usagePercent = budget.total_budget > 0 
      ? (budget.spent_budget / budget.total_budget) * 100 
      : 0;
    
    if (usagePercent >= 100) return { status: 'dépassé', color: '#ef4444' };
    if (usagePercent >= 90) return { status: 'critique', color: '#f59e0b' };
    if (usagePercent >= 75) return { status: 'attention', color: '#f59e0b' };
    return { status: 'sain', color: '#22c55e' };
  };

  const health = getBudgetHealth();

  if (loading) {
    return (
      <div className="budget-loading">
        <LoadingSpinner size="large" text="Chargement du budget..." />
      </div>
    );
  }

  const renderOverview = () => (
    <div className="budget-overview">
      {!budget ? (
        <div className="no-budget">
          <div className="empty-icon">💰</div>
          <h3>Aucun budget défini</h3>
          <p>Définissez un budget pour ce projet pour commencer le suivi financier</p>
          <button className="btn btn-primary">
            Définir un budget
          </button>
        </div>
      ) : (
        <>
          {/* Métriques principales */}
          <div className="budget-metrics">
            <div className="metric-card primary">
              <div className="metric-header">
                <h3>Budget Total</h3>
                <span className={`health-indicator ${health.status}`} style={{ color: health.color }}>
                  {health.status}
                </span>
              </div>
              <div className="metric-value">
                {formatCurrency(budget.total_budget)}
              </div>
              <div className="metric-progress">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${Math.min(100, (budget.spent_budget / budget.total_budget) * 100)}%`,
                    backgroundColor: health.color
                  }}
                />
              </div>
              <div className="metric-details">
                <span>Dépensé: {formatCurrency(budget.spent_budget)}</span>
                <span>Restant: {formatCurrency(budget.remaining_budget)}</span>
              </div>
            </div>

            <div className="metric-card">
              <h3>Dépenses du mois</h3>
              <div className="metric-value">
                {formatCurrency(
                  expenses
                    .filter(e => new Date(e.expense_date).getMonth() === new Date().getMonth())
                    .reduce((sum, e) => sum + e.amount, 0)
                )}
              </div>
            </div>

            <div className="metric-card">
              <h3>Nombre de dépenses</h3>
              <div className="metric-value">{expenses.length}</div>
              <div className="metric-details">
                <span>En attente: {expenses.filter(e => e.status === 'pending').length}</span>
              </div>
            </div>

            <div className="metric-card">
              <h3>Moyenne par dépense</h3>
              <div className="metric-value">
                {formatCurrency(
                  expenses.length > 0 
                    ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length
                    : 0
                )}
              </div>
            </div>
          </div>

          {/* Graphiques placeholder */}
          <div className="budget-charts">
            <div className="chart-container">
              <h4>Évolution budgétaire</h4>
              <div className="chart-placeholder">
                📈 Graphique d'évolution des dépenses dans le temps
              </div>
            </div>

            <div className="chart-container">
              <h4>Répartition par catégories</h4>
              <div className="chart-placeholder">
                🥧 Graphique camembert des dépenses par catégorie
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderExpenses = () => (
    <div className="budget-expenses">
      <div className="expenses-header">
        <h3>💸 Dépenses</h3>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddExpense(true)}
        >
          ➕ Nouvelle dépense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="no-expenses">
          <div className="empty-icon">💸</div>
          <h4>Aucune dépense enregistrée</h4>
          <p>Ajoutez vos première dépense pour commencer le suivi</p>
        </div>
      ) : (
        <div className="expenses-list">
          {expenses.map(expense => (
            <div key={expense.id} className={`expense-item ${expense.status}`}>
              <div className="expense-main">
                <div className="expense-info">
                  <h4 className="expense-name">{expense.name}</h4>
                  <p className="expense-description">{expense.description}</p>
                  <div className="expense-meta">
                    <span className="expense-date">{formatDate(expense.expense_date)}</span>
                    <span className="expense-category">
                      {expense.cost_categories?.name || 'Non catégorisé'}
                    </span>
                  </div>
                </div>
                
                <div className="expense-amount">
                  <span className="amount">{formatCurrency(expense.amount)}</span>
                  <span className={`status ${expense.status}`}>
                    {expense.status === 'approved' ? '✅ Approuvé' :
                     expense.status === 'rejected' ? '❌ Rejeté' :
                     '⏳ En attente'}
                  </span>
                </div>
              </div>

              <div className="expense-actions">
                <button className="btn btn-secondary btn-small">
                  Modifier
                </button>
                {expense.status === 'pending' && (
                  <>
                    <button className="btn btn-success btn-small">
                      Approuver
                    </button>
                    <button className="btn btn-danger btn-small">
                      Rejeter
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCategories = () => (
    <div className="budget-categories">
      <h3>📂 Catégories de coûts</h3>
      <div className="categories-placeholder">
        <p>Gestion des catégories de coûts à implémenter</p>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="budget-reports">
      <h3>📈 Rapports budgétaires</h3>
      <div className="reports-placeholder">
        <p>Génération de rapports détaillés à implémenter</p>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'expenses': return renderExpenses();
      case 'categories': return renderCategories();
      case 'reports': return renderReports();
      default: return renderOverview();
    }
  };

  return (
    <div className="budget-view">
      {/* En-tête */}
      <div className="budget-header">
        <h2>💰 Gestion Budgétaire</h2>
        {budget && (
          <div className="budget-summary">
            <span className="budget-total">{formatCurrency(budget.total_budget)}</span>
            <span className="budget-used">
              {Math.round((budget.spent_budget / budget.total_budget) * 100)}% utilisé
            </span>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="budget-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`budget-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="budget-content">
        {renderActiveTab()}
      </div>

      {/* Modal d'ajout de dépense */}
      {showAddExpense && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nouvelle dépense</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddExpense(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Formulaire d'ajout de dépense à implémenter</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;