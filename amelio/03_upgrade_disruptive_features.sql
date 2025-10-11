-- 03_upgrade_disruptive_features.sql
-- Script de migration pour les fonctionnalités disruptives

-- =============================================
-- MISE À JOUR DES TABLES EXISTANTES
-- =============================================

-- Amélioration de la table tasks pour les nouvelles fonctionnalités
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS kanban_column VARCHAR(50) DEFAULT 'todo',
ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3,2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 5),
ADD COLUMN IF NOT EXISTS complexity VARCHAR(10) DEFAULT 'medium'; -- simple, medium, complex

-- Ajout d'index pour performance
CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON tasks(project_id, kanban_column, position);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Amélioration de la table projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS methodology VARCHAR(20) DEFAULT 'agile', -- agile, waterfall, hybrid
ADD COLUMN IF NOT EXISTS working_days_per_week INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS exclude_weekends BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'FR'; -- Pour jours fériés

-- =============================================
-- NOUVELLES TABLES POUR FONCTIONNALITÉS DISRUPTIVES
-- =============================================

-- Table des ressources/équipe
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  hourly_rate DECIMAL(8,2),
  capacity_hours_per_week DECIMAL(6,2) DEFAULT 40,
  skills TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table d'allocation des ressources (charge/capacité)
CREATE TABLE IF NOT EXISTS resource_allocations (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  allocated_hours DECIMAL(8,2) NOT NULL,
  week_start DATE NOT NULL,
  allocation_percentage DECIMAL(5,2) DEFAULT 100, -- 0-100%
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, resource_id, week_start)
);

-- Table de suivi du temps réel
CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES resources(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  hours_logged DECIMAL(6,2) NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des commentaires et collaboration
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- IDs des utilisateurs mentionnés
  attachments JSONB DEFAULT '[]', -- URLs des fichiers attachés
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications intelligentes
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- mention, deadline, overload, risk, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  priority VARCHAR(10) DEFAULT 'normal', -- low, normal, high, urgent
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des templates de tâches (pour réutilisation)
CREATE TABLE IF NOT EXISTS task_templates (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_hours DECIMAL(8,2),
  checklist JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  complexity VARCHAR(10) DEFAULT 'medium',
  category VARCHAR(100), -- development, design, testing, etc.
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table pour l'historique et analytics
CREATE TABLE IF NOT EXISTS project_analytics (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL, -- velocity, burndown, team_efficiency, etc.
  metric_value DECIMAL(12,4),
  recorded_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- VUES POUR CALCULS AVANCÉS
-- =============================================

-- Vue pour charge/capacité des ressources
CREATE OR REPLACE VIEW resource_workload AS
SELECT 
  r.id as resource_id,
  r.name,
  r.email,
  r.capacity_hours_per_week,
  r.project_id,
  COALESCE(SUM(ra.allocated_hours), 0) as allocated_hours_current_week,
  COALESCE(SUM(te.hours_logged), 0) as logged_hours_current_week,
  (COALESCE(SUM(ra.allocated_hours), 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) as utilization_percentage,
  COUNT(DISTINCT ra.task_id) as active_tasks_count,
  CASE 
    WHEN (COALESCE(SUM(ra.allocated_hours), 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) > 100 THEN 'overloaded'
    WHEN (COALESCE(SUM(ra.allocated_hours), 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) > 80 THEN 'high'
    WHEN (COALESCE(SUM(ra.allocated_hours), 0) / NULLIF(r.capacity_hours_per_week, 0) * 100) > 50 THEN 'normal'
    ELSE 'low'
  END as workload_status
FROM resources r
LEFT JOIN resource_allocations ra ON r.id = ra.resource_id 
  AND ra.week_start = date_trunc('week', CURRENT_DATE)::date
LEFT JOIN time_entries te ON r.id = te.resource_id 
  AND te.log_date >= date_trunc('week', CURRENT_DATE)::date
  AND te.log_date < date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days'
WHERE r.is_active = true
GROUP BY r.id, r.name, r.email, r.capacity_hours_per_week, r.project_id;

-- Vue pour métriques projet temps réel
CREATE OR REPLACE VIEW project_health AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.completion_percentage,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.kanban_column = 'in_progress' THEN 1 END) as active_tasks,
  COUNT(CASE WHEN t.priority = 'critical' AND t.kanban_column != 'done' THEN 1 END) as critical_pending,
  AVG(t.risk_score) as avg_risk_score,
  SUM(t.estimated_hours) as total_estimated_hours,
  SUM(t.actual_hours) as total_actual_hours,
  CASE 
    WHEN SUM(t.estimated_hours) > 0 THEN 
      (SUM(t.actual_hours) / SUM(t.estimated_hours) - 1) * 100 
    ELSE 0 
  END as time_variance_percentage,
  CASE 
    WHEN COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) > 0.9 THEN 'excellent'
    WHEN COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) > 0.7 THEN 'good'
    WHEN COUNT(CASE WHEN t.kanban_column = 'done' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) > 0.5 THEN 'warning'
    ELSE 'critical'
  END as health_status
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.completion_percentage;

-- =============================================
-- FONCTIONS POUR CALCULS INTELLIGENTS
-- =============================================

-- Fonction pour calculer automatiquement le score de risque d'une tâche
CREATE OR REPLACE FUNCTION calculate_task_risk_score(task_id INTEGER)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  risk_score DECIMAL(3,2) := 0;
  task_complexity VARCHAR(10);
  days_until_deadline INTEGER;
  resource_overload BOOLEAN;
BEGIN
  -- Récupérer les données de la tâche
  SELECT complexity, 
         GREATEST(0, (end_date - CURRENT_DATE)::INTEGER)
  INTO task_complexity, days_until_deadline
  FROM tasks WHERE id = task_id;
  
  -- Score basé sur la complexité
  risk_score := CASE task_complexity
    WHEN 'simple' THEN 1.0
    WHEN 'medium' THEN 2.0  
    WHEN 'complex' THEN 3.5
    ELSE 2.0
  END;
  
  -- Augmentation si deadline proche
  IF days_until_deadline <= 3 THEN
    risk_score := risk_score + 1.5;
  ELSIF days_until_deadline <= 7 THEN
    risk_score := risk_score + 0.8;
  END IF;
  
  -- Vérifier la surcharge de ressource assignée
  SELECT EXISTS(
    SELECT 1 FROM resource_workload rw
    JOIN tasks t ON rw.resource_id = (
      SELECT resource_id FROM resource_allocations 
      WHERE task_id = calculate_task_risk_score.task_id LIMIT 1
    )
    WHERE rw.utilization_percentage > 100
  ) INTO resource_overload;
  
  IF resource_overload THEN
    risk_score := risk_score + 1.0;
  END IF;
  
  -- Limiter le score entre 0 et 5
  RETURN LEAST(5.0, GREATEST(0.0, risk_score));
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement le score de risque
CREATE OR REPLACE FUNCTION update_task_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score := calculate_task_risk_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application du trigger
DROP TRIGGER IF EXISTS trigger_update_risk_score ON tasks;
CREATE TRIGGER trigger_update_risk_score
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_risk_score();

-- =============================================
-- POLITIQUES RLS POUR NOUVELLES TABLES
-- =============================================

-- RLS pour resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage resources in their projects" ON resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = resources.project_id AND p.user_id = auth.uid()
    )
  );

-- RLS pour resource_allocations
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage allocations in their projects" ON resource_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t 
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = resource_allocations.task_id AND p.user_id = auth.uid()
    )
  );

-- RLS pour time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage time entries in their projects" ON time_entries
  FOR ALL USING (auth.uid() = user_id);

-- RLS pour comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage comments in their projects" ON comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t 
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = comments.task_id AND p.user_id = auth.uid()
    )
  );

-- RLS pour notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_resources_project ON resources(project_id, is_active);

-- Message de succès
SELECT 'Migration vers fonctionnalités disruptives terminée avec succès!' as status;