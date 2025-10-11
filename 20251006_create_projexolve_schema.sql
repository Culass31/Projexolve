-- Migration complète pour Projexolve - Base de données révolutionnaire
-- Version: 2025.1.0
-- Auteur: Projexolve Team

-- =============================================
-- SUPPRESSION SÉCURISÉE DES TABLES EXISTANTES
-- =============================================

-- Désactiver RLS temporairement pour la migration
ALTER TABLE IF EXISTS time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resource_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dependencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS risks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Enable all operations for authenticated users on own projects" ON projects;
DROP POLICY IF EXISTS "Enable all operations for authenticated users on project tasks" ON tasks;
DROP POLICY IF EXISTS "Enable all operations for authenticated users on project dependencies" ON dependencies;
DROP POLICY IF EXISTS "Enable all operations for authenticated users on project resources" ON resources;

-- Supprimer les tables dans l'ordre des dépendances
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS resource_allocations CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS task_templates CASCADE;
DROP TABLE IF EXISTS project_analytics CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS dependencies CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS calculate_task_risk_score CASCADE;
DROP FUNCTION IF EXISTS update_task_risk_score CASCADE;
DROP FUNCTION IF EXISTS calculate_project_health CASCADE;

-- =============================================
-- CRÉATION DES TABLES PRINCIPALES
-- =============================================

-- Table des projets (entité racine)
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    start_date DATE,
    end_date DATE,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    team_size INTEGER DEFAULT 1 CHECK (team_size > 0),
    methodology VARCHAR(20) DEFAULT 'agile' CHECK (methodology IN ('agile', 'waterfall', 'hybrid')),
    working_days_per_week INTEGER DEFAULT 5 CHECK (working_days_per_week BETWEEN 1 AND 7),
    exclude_weekends BOOLEAN DEFAULT true,
    country_code VARCHAR(2) DEFAULT 'FR',
    budget_allocated DECIMAL(12,2) DEFAULT 0,
    budget_spent DECIMAL(12,2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table des tâches (cœur de la planification)
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 1 CHECK (duration > 0), -- en jours ouvrés
    start_date DATE NOT NULL,
    end_date DATE,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_hours DECIMAL(8,2) DEFAULT 0,
    actual_hours DECIMAL(8,2) DEFAULT 0,
    assigned_to UUID REFERENCES auth.users(id),
    tags TEXT[] DEFAULT '{}',
    position INTEGER DEFAULT 0,
    kanban_column VARCHAR(20) DEFAULT 'todo' CHECK (kanban_column IN ('todo', 'in_progress', 'review', 'done')),
    parent_task_id UUID REFERENCES tasks(id),
    is_milestone BOOLEAN DEFAULT false,
    risk_score DECIMAL(3,2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 5),
    complexity VARCHAR(10) DEFAULT 'medium' CHECK (complexity IN ('simple', 'medium', 'complex')),
    
    -- Champs PERT calculés automatiquement
    earliest_start DATE,
    earliest_finish DATE,
    latest_start DATE,
    latest_finish DATE,
    total_float INTEGER DEFAULT 0,
    free_float INTEGER DEFAULT 0,
    is_critical BOOLEAN DEFAULT false,
    
    -- Collaboration et suivi
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table des dépendances entre tâches
CREATE TABLE dependencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    target_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(2) DEFAULT 'FS' CHECK (type IN ('FS', 'SS', 'FF', 'SF')),
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Contraintes d'intégrité
    CONSTRAINT no_self_dependency CHECK (source_task_id != target_task_id),
    CONSTRAINT unique_dependency UNIQUE (source_task_id, target_task_id)
);

-- Table des ressources (équipe projet)
CREATE TABLE resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100),
    hourly_rate DECIMAL(8,2),
    capacity_hours_per_week DECIMAL(6,2) DEFAULT 40 CHECK (capacity_hours_per_week > 0),
    skills TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table d'allocation des ressources (charge/capacité)
CREATE TABLE resource_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
    allocated_hours DECIMAL(8,2) NOT NULL CHECK (allocated_hours >= 0),
    week_start DATE NOT NULL,
    allocation_percentage DECIMAL(5,2) DEFAULT 100 CHECK (allocation_percentage > 0 AND allocation_percentage <= 200),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_allocation UNIQUE (task_id, resource_id, week_start)
);

-- Table de suivi du temps réel
CREATE TABLE time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    resource_id UUID REFERENCES resources(id),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    hours_logged DECIMAL(6,2) NOT NULL CHECK (hours_logged > 0),
    log_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    is_billable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table des commentaires et collaboration
CREATE TABLE comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    is_ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table des risques (gestion prédictive)
CREATE TABLE risks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    probability DECIMAL(3,2) CHECK (probability >= 0 AND probability <= 1),
    impact DECIMAL(3,2) CHECK (impact >= 0 AND impact <= 5),
    risk_score DECIMAL(4,2) GENERATED ALWAYS AS (probability * impact) STORED,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'closed')),
    mitigation_plan TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table des budgets détaillés
CREATE TABLE budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'personnel', 'equipment', 'travel', 'other'
    name VARCHAR(255) NOT NULL,
    estimated_amount DECIMAL(12,2) NOT NULL,
    actual_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table des notifications intelligentes
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table des templates de tâches (réutilisabilité)
CREATE TABLE task_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_hours DECIMAL(8,2),
    default_duration INTEGER DEFAULT 1,
    checklist JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    complexity VARCHAR(10) DEFAULT 'medium',
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table pour l'analytics et métriques
CREATE TABLE project_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12,4),
    recorded_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEX POUR OPTIMISATION DES PERFORMANCES
-- =============================================

-- Index sur les projets
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Index sur les tâches (critiques pour performance)
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tasks_kanban ON tasks(project_id, kanban_column, position);
CREATE INDEX idx_tasks_dates ON tasks(start_date, end_date);
CREATE INDEX idx_tasks_critical ON tasks(is_critical) WHERE is_critical = true;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);

-- Index sur les dépendances
CREATE INDEX idx_dependencies_source ON dependencies(source_task_id);
CREATE INDEX idx_dependencies_target ON dependencies(target_task_id);

-- Index sur les ressources et allocations
CREATE INDEX idx_resources_project ON resources(project_id, is_active);
CREATE INDEX idx_allocations_resource_week ON resource_allocations(resource_id, week_start);
CREATE INDEX idx_allocations_task ON resource_allocations(task_id);

-- Index sur les données de temps réel
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, log_date);
CREATE INDEX idx_time_entries_task ON time_entries(task_id);

-- Index sur les commentaires et notifications
CREATE INDEX idx_comments_task ON comments(task_id, created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at);

-- Index sur les analytics
CREATE INDEX idx_analytics_project_metric ON project_analytics(project_id, metric_name, recorded_date);

-- =============================================
-- VUES MATÉRIALISÉES POUR ANALYTICS AVANCÉES
-- =============================================

-- Vue pour la charge de travail des ressources
CREATE VIEW resource_workload AS
SELECT 
    r.id as resource_id,
    r.name,
    r.email,
    r.capacity_hours_per_week,
    r.project_id,
    COALESCE(current_week.allocated_hours, 0) as allocated_hours_current_week,
    COALESCE(logged_week.hours_logged, 0) as logged_hours_current_week,
    (COALESCE(current_week.allocated_hours, 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) as utilization_percentage,
    COALESCE(current_week.active_tasks, 0) as active_tasks_count,
    CASE 
        WHEN (COALESCE(current_week.allocated_hours, 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) > 100 THEN 'overloaded'
        WHEN (COALESCE(current_week.allocated_hours, 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) > 80 THEN 'high'
        WHEN (COALESCE(current_week.allocated_hours, 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) > 50 THEN 'normal'
        ELSE 'available'
    END as workload_status
FROM resources r
LEFT JOIN (
    SELECT 
        resource_id,
        SUM(allocated_hours) as allocated_hours,
        COUNT(DISTINCT task_id) as active_tasks
    FROM resource_allocations 
    WHERE week_start = date_trunc('week', CURRENT_DATE)::date
    GROUP BY resource_id
) current_week ON r.id = current_week.resource_id
LEFT JOIN (
    SELECT 
        resource_id,
        SUM(hours_logged) as hours_logged
    FROM time_entries 
    WHERE log_date >= date_trunc('week', CURRENT_DATE)::date
      AND log_date < date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days'
    GROUP BY resource_id
) logged_week ON r.id = logged_week.resource_id
WHERE r.is_active = true;

-- Vue pour la santé des projets
CREATE VIEW project_health AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status,
    p.completion_percentage,
    p.created_at,
    p.updated_at,
    p.color,
    
    -- Statistiques des tâches
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.kanban_column = 'in_progress' THEN 1 END) as active_tasks,
    COUNT(CASE WHEN t.priority = 'critical' AND t.kanban_column != 'done' THEN 1 END) as critical_pending,
    
    -- Métriques de risque et temps
    AVG(t.risk_score) as avg_risk_score,
    SUM(t.estimated_hours) as total_estimated_hours,
    SUM(t.actual_hours) as total_actual_hours,
    
    -- Variance temps
    CASE 
        WHEN SUM(t.estimated_hours) > 0 THEN 
            (SUM(t.actual_hours) / SUM(t.estimated_hours) - 1) * 100 
        ELSE 0 
    END as time_variance_percentage,
    
    -- Statut de santé global
    CASE 
        WHEN COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) > 0.9 THEN 'excellent'
        WHEN COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) > 0.7 THEN 'good'
        WHEN COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) > 0.5 THEN 'warning'
        ELSE 'critical'
    END as health_status,
    
    -- Budget
    p.budget_allocated,
    p.budget_spent,
    CASE 
        WHEN p.budget_allocated > 0 THEN (p.budget_spent / p.budget_allocated * 100)
        ELSE 0
    END as budget_utilization_percentage

FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.status, p.completion_percentage, p.budget_allocated, p.budget_spent, p.created_at, p.updated_at, p.color;

-- Message de confirmation
SELECT 'Base de données Projexolve créée avec succès! 🚀' as status;