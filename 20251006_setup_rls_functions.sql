-- Configuration RLS et fonctions pour Projexolve
-- Version: 2025.1.3 (Revue de code senior - Idempotence et ordre de déploiement corrigés)

-- =============================================
-- PRÉPARATION : SUPPRESSION DES OBJETS DÉPENDANTS
-- =============================================
-- On supprime d'abord les triggers qui dépendent des fonctions que nous allons remplacer.

DROP TRIGGER IF EXISTS recalculate_schedule_on_task_change ON tasks;
DROP TRIGGER IF EXISTS recalculate_schedule_on_dependency_change ON dependencies;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_risks_updated_at ON risks;
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
DROP TRIGGER IF EXISTS update_task_templates_updated_at ON task_templates;

-- =============================================
-- ACTIVATION DE ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLITIQUES RLS SÉCURISÉES (IDEMPOTENT)
-- =============================================

-- ... (les politiques RLS restent inchangées) ...
-- Politiques pour les projets
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- Politiques pour les tâches
DROP POLICY IF EXISTS "Users can manage tasks in their projects" ON tasks;
CREATE POLICY "Users can manage tasks in their projects"
    ON tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = tasks.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- Politiques pour les dépendances
DROP POLICY IF EXISTS "Users can manage dependencies in their projects" ON dependencies;
CREATE POLICY "Users can manage dependencies in their projects"
    ON dependencies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN projects p ON t.project_id = p.id
            WHERE (t.id = dependencies.source_task_id OR t.id = dependencies.target_task_id)
            AND p.user_id = auth.uid()
        )
    );

-- Politiques pour les ressources
DROP POLICY IF EXISTS "Users can manage resources in their projects" ON resources;
CREATE POLICY "Users can manage resources in their projects"
    ON resources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = resources.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- Politiques pour les allocations de ressources
DROP POLICY IF EXISTS "Users can manage resource allocations in their projects" ON resource_allocations;
CREATE POLICY "Users can manage resource allocations in their projects"
    ON resource_allocations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN projects p ON t.project_id = p.id
            WHERE t.id = resource_allocations.task_id 
            AND p.user_id = auth.uid()
        )
    );

-- Politiques pour les entrées de temps
DROP POLICY IF EXISTS "Users can manage their own time entries" ON time_entries;
CREATE POLICY "Users can manage their own time entries"
    ON time_entries FOR ALL
    USING (auth.uid() = user_id);

-- Politiques pour les commentaires
DROP POLICY IF EXISTS "Users can manage comments in their projects" ON comments;
CREATE POLICY "Users can manage comments in their projects"
    ON comments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN projects p ON t.project_id = p.id
            WHERE t.id = comments.task_id 
            AND p.user_id = auth.uid()
        )
    );

-- Politiques pour les risques
DROP POLICY IF EXISTS "Users can manage risks in their projects" ON risks;
CREATE POLICY "Users can manage risks in their projects"
    ON risks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = risks.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- Politiques pour les budgets
DROP POLICY IF EXISTS "Users can manage budgets in their projects" ON budgets;
CREATE POLICY "Users can manage budgets in their projects"
    ON budgets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = budgets.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- Politiques pour les notifications
DROP POLICY IF EXISTS "Users can only see their own notifications" ON notifications;
CREATE POLICY "Users can only see their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark their notifications as read" ON notifications;
CREATE POLICY "Users can mark their notifications as read"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Politiques pour les templates de tâches
DROP POLICY IF EXISTS "Users can manage their own task templates" ON task_templates;
CREATE POLICY "Users can manage their own task templates"
    ON task_templates FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view public task templates" ON task_templates;
CREATE POLICY "Users can view public task templates"
    ON task_templates FOR SELECT
    USING (is_public = true);

-- Politiques pour les analytics
DROP POLICY IF EXISTS "Users can view analytics for their projects" ON project_analytics;
CREATE POLICY "Users can view analytics for their projects"
    ON project_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = project_analytics.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- =============================================
-- FONCTIONS MÉTIER INTELLIGENTES
-- =============================================

-- On supprime les fonctions existantes avant de les recréer
DROP FUNCTION IF EXISTS calculate_task_risk_score(UUID);
DROP FUNCTION IF EXISTS calculate_pert_metrics(UUID);
DROP FUNCTION IF EXISTS recalculate_project_schedule(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS trigger_schedule_recalculation();
DROP FUNCTION IF EXISTS get_ai_recommendations(UUID);

-- Fonction pour calculer automatiquement le score de risque d'une tâche
CREATE OR REPLACE FUNCTION calculate_task_risk_score(task_id UUID)
RETURNS DECIMAL(3,2) AS $$
-- ... (contenu de la fonction inchangé) ...
DECLARE
    task_record RECORD;
    risk_score DECIMAL(3,2) := 0;
    days_until_deadline INTEGER;
    resource_overload BOOLEAN := false;
BEGIN
    -- Récupérer les données de la tâche
    SELECT t.*, p.exclude_weekends
    INTO task_record
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Score basé sur la complexité
    risk_score := CASE task_record.complexity
        WHEN 'simple' THEN 1.0
        WHEN 'medium' THEN 2.0  
        WHEN 'complex' THEN 3.5
        ELSE 2.0
    END;
    
    -- Calculer les jours jusqu'à la deadline
    days_until_deadline := GREATEST(0, (task_record.end_date - CURRENT_DATE)::INTEGER);
    
    -- Augmentation si deadline proche
    IF days_until_deadline <= 3 THEN
        risk_score := risk_score + 1.5;
    ELSIF days_until_deadline <= 7 THEN
        risk_score := risk_score + 0.8;
    END IF;
    
    -- Vérifier la surcharge de ressource assignée
    IF task_record.assigned_to IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM resource_workload rw
            JOIN resources r ON rw.resource_id = r.id
            WHERE r.user_id = task_record.assigned_to
              AND rw.utilization_percentage > 100
        ) INTO resource_overload;
        
        IF resource_overload THEN
            risk_score := risk_score + 1.0;
        END IF;
    END IF;
    
    -- Augmentation si tâche en retard
    IF task_record.end_date < CURRENT_DATE AND task_record.kanban_column != 'done' THEN
        risk_score := risk_score + 2.0;
    END IF;
    
    -- Augmentation selon la priorité
    risk_score := risk_score + CASE task_record.priority
        WHEN 'critical' THEN 1.0
        WHEN 'high' THEN 0.5
        ELSE 0
    END;
    
    -- Limiter le score entre 0 et 5
    RETURN LEAST(5.0, GREATEST(0.0, risk_score));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Fonction pour calculer les métriques PERT (version avancée)
CREATE OR REPLACE FUNCTION calculate_pert_metrics(p_project_id UUID)
RETURNS TABLE(
    task_id UUID,
    earliest_start INT,
    earliest_finish INT,
    latest_start INT,
    latest_finish INT,
    total_float INT,
    free_float INT,
    is_critical BOOLEAN
) AS $$
-- ... (contenu de la fonction PERT avancée) ...
DECLARE
    task_count INT;
    processed_count INT;
    project_finish_date INT;
BEGIN
    -- Création d'une table temporaire pour les calculs
    CREATE TEMP TABLE IF NOT EXISTS pert_calculations (
        t_id UUID PRIMARY KEY,
        t_duration INT,
        es INT,
        ef INT,
        ls INT,
        lf INT,
        tf INT,
        ff INT,
        is_crit BOOLEAN
    ) ON COMMIT DROP;

    -- Vider la table pour cette exécution
    TRUNCATE pert_calculations;

    -- 1. Initialisation : Insérer toutes les tâches du projet
    INSERT INTO pert_calculations (t_id, t_duration)
    SELECT id, duration FROM tasks WHERE project_id = p_project_id;
    
    SELECT COUNT(*) INTO task_count FROM pert_calculations;
    RAISE NOTICE 'PERT Calc: Found % tasks to process.', task_count;

    -- =============================================
    -- PHASE 1: FORWARD PASS (Calcul des dates au plus tôt)
    -- =============================================
    UPDATE pert_calculations SET es = 0, ef = t_duration
    WHERE NOT EXISTS (SELECT 1 FROM dependencies d WHERE d.target_task_id = pert_calculations.t_id);

    FOR i IN 1..task_count LOOP
        UPDATE pert_calculations pc
        SET 
            es = calc.new_es,
            ef = calc.new_es + pc.t_duration
        FROM (
            SELECT 
                d.target_task_id as task_id,
                MAX(
                    CASE d.type
                        WHEN 'FS' THEN pred.ef + d.lag_days
                        WHEN 'SS' THEN pred.es + d.lag_days
                        WHEN 'FF' THEN pred.ef - t.duration + d.lag_days
                        WHEN 'SF' THEN pred.es - t.duration + d.lag_days
                        ELSE pred.ef + d.lag_days
                    END
                ) AS new_es
            FROM dependencies d
            JOIN pert_calculations pred ON d.source_task_id = pred.t_id
            JOIN tasks t ON d.target_task_id = t.id
            WHERE pred.es IS NOT NULL
            GROUP BY d.target_task_id
        ) AS calc
        WHERE pc.t_id = calc.task_id AND (pc.es IS NULL OR calc.new_es > pc.es);
    END LOOP;

    RAISE NOTICE '--- AFTER FORWARD PASS ---';
    FOR rec IN SELECT * FROM pert_calculations LOOP
        RAISE NOTICE 'ID: %, ES: %, EF: %', rec.t_id, rec.es, rec.ef;
    END LOOP;

    -- =============================================
    -- PHASE 2: BACKWARD PASS (Calcul des dates au plus tard)
    -- =============================================
    SELECT MAX(ef) INTO project_finish_date FROM pert_calculations;
    UPDATE pert_calculations SET lf = project_finish_date, ls = project_finish_date - t_duration;

    FOR i IN 1..task_count LOOP
        UPDATE pert_calculations pc
        SET 
            lf = calc.new_lf,
            ls = calc.new_lf - pc.t_duration
        FROM (
            SELECT 
                d.source_task_id as task_id,
                MIN(
                    CASE d.type
                        WHEN 'FS' THEN succ.ls - d.lag_days
                        WHEN 'SS' THEN succ.ls - d.lag_days + t.duration
                        WHEN 'FF' THEN succ.lf - d.lag_days
                        WHEN 'SF' THEN succ.lf - d.lag_days + t.duration
                        ELSE succ.ls - d.lag_days
                    END
                ) AS new_lf
            FROM dependencies d
            JOIN pert_calculations succ ON d.target_task_id = succ.t_id
            JOIN tasks t ON d.source_task_id = t.id
            WHERE succ.lf IS NOT NULL
            GROUP BY d.source_task_id
        ) AS calc
        WHERE pc.t_id = calc.task_id AND (pc.lf IS NULL OR calc.new_lf < pc.lf);
    END LOOP;

    RAISE NOTICE '--- AFTER BACKWARD PASS ---';
    FOR rec IN SELECT * FROM pert_calculations LOOP
        RAISE NOTICE 'ID: %, LS: %, LF: %', rec.t_id, rec.ls, rec.lf;
    END LOOP;

    -- =============================================
    -- PHASE 3: CALCUL DES FLOTTEMENTS (FLOAT/SLACK)
    -- =============================================
    -- Flottement Total (Total Float)
    UPDATE pert_calculations SET tf = ls - es;
    UPDATE pert_calculations SET is_crit = (tf <= 0);

    -- Flottement Libre (Free Float)
    UPDATE pert_calculations pc
    SET ff = COALESCE(succ_calc.min_succ_es, project_finish_date) - pc.ef
    FROM (
        SELECT
            pt.t_id,
            MIN(succ.es) as min_succ_es
        FROM pert_calculations pt
        LEFT JOIN dependencies d ON pt.t_id = d.source_task_id
        LEFT JOIN pert_calculations succ ON d.target_task_id = succ.t_id
        GROUP BY pt.t_id
    ) AS succ_calc
    WHERE pc.t_id = succ_calc.t_id;
    
    -- Le flottement libre ne peut pas être négatif
    UPDATE pert_calculations SET ff = GREATEST(0, ff);

    -- =============================================
    -- PHASE 4: RETOURNER LES RÉSULTATS
    -- =============================================
    RETURN QUERY 
    SELECT 
        t_id,
        es,
        ef,
        ls,
        lf,
        tf,
        ff,
        is_crit
    FROM pert_calculations;

END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Fonction pour recalculer automatiquement le planning
CREATE OR REPLACE FUNCTION recalculate_project_schedule(p_project_id UUID)
RETURNS VOID AS $$
-- ... (contenu de la fonction inchangé) ...
DECLARE
    pert_result RECORD;
    v_project_start_date DATE;
BEGIN
    -- Récupérer la date de début du projet pour les calculs de dates absolues
    SELECT start_date INTO v_project_start_date FROM projects WHERE id = p_project_id;

    -- Si la date de début n'est pas définie, on ne peut pas continuer
    IF v_project_start_date IS NULL THEN
        RETURN;
    END IF;

    -- Recalculer les métriques PERT pour toutes les tâches
    FOR pert_result IN 
        SELECT * FROM calculate_pert_metrics(p_project_id)
    LOOP
        UPDATE tasks SET
            -- Conversion des jours en dates absolues
            earliest_start = v_project_start_date + pert_result.earliest_start,
            earliest_finish = v_project_start_date + pert_result.earliest_finish,
            latest_start = v_project_start_date + pert_result.latest_start,
            latest_finish = v_project_start_date + pert_result.latest_finish,
            -- Mise à jour directe des métriques numériques
            total_float = pert_result.total_float,
            free_float = pert_result.free_float,
            is_critical = pert_result.is_critical,
            -- Le score de risque est aussi recalculé
            risk_score = calculate_task_risk_score(pert_result.task_id),
            updated_at = NOW()
        WHERE id = pert_result.task_id;
    END LOOP;
    
    -- Mettre à jour les statistiques du projet
    UPDATE projects SET
        completion_percentage = (
            SELECT COALESCE(
                (COUNT(CASE WHEN kanban_column = 'done' THEN 1 END)::FLOAT / 
                 NULLIF(COUNT(*), 0) * 100)::INTEGER, 
                0
            )
            FROM tasks 
            WHERE tasks.project_id = p_project_id
        ),
        updated_at = NOW()
    WHERE projects.id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour le trigger de mise à jour des timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour le trigger de recalcul du planning
CREATE OR REPLACE FUNCTION trigger_schedule_recalculation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'tasks' THEN
        -- Prévention de la récursion pour les updates sur les tâches
        IF (TG_OP = 'UPDATE' AND OLD.start_date IS NOT DISTINCT FROM NEW.start_date AND OLD.duration IS NOT DISTINCT FROM NEW.duration) THEN
            RETURN COALESCE(NEW, OLD);
        END IF;
        PERFORM recalculate_project_schedule(COALESCE(NEW.project_id, OLD.project_id));

    ELSIF TG_TABLE_NAME = 'dependencies' THEN
        -- Pour les dépendances, on recalcule toujours
        PERFORM recalculate_project_schedule((
            SELECT project_id FROM tasks WHERE id = COALESCE(NEW.source_task_id, OLD.source_task_id)
        ));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les recommandations IA
CREATE OR REPLACE FUNCTION get_ai_recommendations(project_id UUID)
RETURNS JSON AS $$
-- ... (contenu de la fonction inchangé) ...
DECLARE
    result JSON;
    overloaded_resources INTEGER;
    critical_tasks_count INTEGER;
    overdue_tasks INTEGER;
    budget_status TEXT;
BEGIN
    -- Compter les ressources surchargées
    SELECT COUNT(*) INTO overloaded_resources
    FROM resource_workload 
    WHERE resource_workload.project_id = get_ai_recommendations.project_id 
      AND workload_status = 'overloaded';
    
    -- Compter les tâches critiques non terminées
    SELECT COUNT(*) INTO critical_tasks_count
    FROM tasks 
    WHERE tasks.project_id = get_ai_recommendations.project_id 
      AND is_critical = true 
      AND kanban_column != 'done';
    
    -- Compter les tâches en retard
    SELECT COUNT(*) INTO overdue_tasks
    FROM tasks 
    WHERE tasks.project_id = get_ai_recommendations.project_id 
      AND end_date < CURRENT_DATE 
      AND kanban_column != 'done';
    
    -- Statut du budget
    SELECT CASE 
        WHEN ph.budget_utilization_percentage > 90 THEN 'critical'
        WHEN ph.budget_utilization_percentage > 75 THEN 'warning'
        ELSE 'good'
    END INTO budget_status
    FROM project_health ph
    WHERE ph.project_id = get_ai_recommendations.project_id;
    
    -- Construire les recommandations
    result := json_build_object(
        'resource_recommendations', CASE 
            WHEN overloaded_resources > 0 THEN 
                json_build_array(
                    json_build_object(
                        'type', 'resource_rebalancing',
                        'severity', 'high',
                        'message', overloaded_resources || ' ressource(s) surchargée(s) détectée(s)',
                        'action', 'Redistribuer la charge de travail'
                    )
                )
            ELSE json_build_array()
        END,
        'schedule_recommendations', CASE 
            WHEN critical_tasks_count > 0 THEN 
                json_build_array(
                    json_build_object(
                        'type', 'critical_path_focus',
                        'severity', 'high',
                        'message', critical_tasks_count || ' tâche(s) critique(s) nécessitent une attention',
                        'action', 'Prioriser les tâches sur le chemin critique'
                    )
                )
            ELSE json_build_array()
        END,
        'timeline_recommendations', CASE 
            WHEN overdue_tasks > 0 THEN 
                json_build_array(
                    json_build_object(
                        'type', 'schedule_recovery',
                        'severity', 'critical',
                        'message', overdue_tasks || ' tâche(s) en retard',
                        'action', 'Replanifier ou allouer des ressources supplémentaires'
                    )
                )
            ELSE json_build_array()
        END,
        'budget_recommendations', CASE 
            WHEN budget_status = 'critical' THEN 
                json_build_array(
                    json_build_object(
                        'type', 'budget_overrun',
                        'severity', 'critical',
                        'message', 'Budget critique (>90% utilisé)',
                        'action', 'Réviser le budget ou optimiser les coûts'
                    )
                )
            WHEN budget_status = 'warning' THEN 
                json_build_array(
                    json_build_object(
                        'type', 'budget_watch',
                        'severity', 'medium',
                        'message', 'Budget attention (>75% utilisé)',
                        'action', 'Surveiller les dépenses de près'
                    )
                )
            ELSE json_build_array()
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- RECRÉATION DES TRIGGERS
-- =============================================

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at 
    BEFORE UPDATE ON resources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at 
    BEFORE UPDATE ON risks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at 
    BEFORE UPDATE ON task_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER recalculate_schedule_on_task_change
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_schedule_recalculation();

CREATE TRIGGER recalculate_schedule_on_dependency_change
    AFTER INSERT OR UPDATE OR DELETE ON dependencies
    FOR EACH ROW EXECUTE FUNCTION trigger_schedule_recalculation();

-- =============================================
-- MESSAGE DE CONFIRMATION
-- =============================================

SELECT 'Configuration RLS et fonctions Projexolve (v1.3) activées avec succès! 🔒🤖' as status;
