# Structure complète de l'application PROJEXOLVE

## Architecture Frontend (React)

```
src/
├── components/
│   ├── common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Modal.jsx
│   │   └── LoadingSpinner.jsx
│   ├── kanban/
│   │   ├── KanbanBoard.jsx
│   │   ├── KanbanCard.jsx
│   │   └── SwimLane.jsx
│   ├── gantt/
│   │   ├── GanttChart.jsx
│   │   ├── TaskBar.jsx
│   │   └── Timeline.jsx
│   ├── pert/
│   │   ├── PertDiagram.jsx
│   │   ├── PertNode.jsx
│   │   └── CriticalPath.jsx
│   ├── budget/
│   │   ├── BudgetDashboard.jsx
│   │   ├── ExpenseTracker.jsx
│   │   └── CostAnalysis.jsx
│   └── risks/
│       ├── RiskMatrix.jsx
│       ├── RiskCard.jsx
│       └── MitigationPlans.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── ProjectDetail.jsx
│   ├── ProjectList.jsx
│   └── Settings.jsx
├── hooks/
│   ├── useProject.js
│   ├── useTasks.js
│   ├── useBudget.js
│   └── useRisks.js
├── utils/
│   ├── dateUtils.js
│   ├── scheduleCalculator.js
│   ├── pertCalculator.js
│   └── budgetCalculator.js
├── styles/
│   ├── globals.css
│   ├── components.css
│   └── themes.css
└── App.jsx
```

## Base de données (PostgreSQL + Supabase)

```sql
-- Tables principales
- projects
- tasks 
- dependencies
- budgets
- expenses
- risks
- resources
- assignments
```

## Stack technologique
- **Frontend**: React 18 + Vite
- **UI**: CSS moderne + Flexbox/Grid
- **State**: Context API + useState/useEffect
- **Database**: Supabase (PostgreSQL)
- **Drag & Drop**: react-beautiful-dnd
- **Charts**: D3.js pour Gantt/PERT
- **Build**: Vite
- **Deploy**: Vercel/Netlify