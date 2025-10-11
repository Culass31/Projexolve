# Créons un algorithme complet de PERT/CPM avec tous les types de dépendances
# et la gestion des décalages (lag/lead time)

class Task:
    def __init__(self, id, name, optimistic_time=None, most_likely_time=None, pessimistic_time=None, duration=None):
        self.id = id
        self.name = name
        
        # Gestion des temps PERT (3 estimations) ou temps fixe
        if duration is not None:
            self.duration = duration
        else:
            # Formule PERT: (O + 4M + P) / 6
            self.duration = (optimistic_time + 4 * most_likely_time + pessimistic_time) / 6
            
        # Variables de calcul CPM
        self.earliest_start = 0
        self.earliest_finish = 0
        self.latest_start = 0
        self.latest_finish = 0
        self.total_float = 0
        self.free_float = 0
        
        # Dépendances
        self.predecessors = []  # Liste de tuples (task, dependency_type, lag)
        self.successors = []   # Liste de tuples (task, dependency_type, lag)
        
        # État critique
        self.is_critical = False
        
    def add_dependency(self, predecessor, dependency_type='FS', lag=0):
        """
        Ajoute une dépendance avec un prédécesseur
        dependency_type: 'FS', 'FF', 'SS', 'SF'
        lag: temps de décalage (positif pour lag, négatif pour lead)
        """
        self.predecessors.append((predecessor, dependency_type, lag))
        predecessor.successors.append((self, dependency_type, lag))

class ProjectScheduler:
    def __init__(self):
        self.tasks = {}
        self.critical_path = []
        self.project_duration = 0
        
    def add_task(self, task):
        """Ajoute une tâche au projet"""
        self.tasks[task.id] = task
        
    def forward_pass(self):
        """
        Calcul du passage avant (Forward Pass)
        Détermine ES (Earliest Start) et EF (Earliest Finish) pour chaque tâche
        """
        # Tri topologique pour traiter les tâches dans l'ordre des dépendances
        processed = set()
        
        def process_task(task):
            if task.id in processed:
                return
                
            # Traiter d'abord tous les prédécesseurs
            for pred_task, dep_type, lag in task.predecessors:
                process_task(pred_task)
            
            # Calculer ES basé sur les prédécesseurs
            if not task.predecessors:
                # Tâche de début
                task.earliest_start = 0
            else:
                task.earliest_start = 0
                for pred_task, dep_type, lag in task.predecessors:
                    if dep_type == 'FS':  # Finish-to-Start
                        constraint = pred_task.earliest_finish + lag
                    elif dep_type == 'SS':  # Start-to-Start  
                        constraint = pred_task.earliest_start + lag
                    elif dep_type == 'FF':  # Finish-to-Finish
                        constraint = pred_task.earliest_finish + lag - task.duration
                    elif dep_type == 'SF':  # Start-to-Finish
                        constraint = pred_task.earliest_start + lag - task.duration
                    else:
                        constraint = pred_task.earliest_finish + lag
                        
                    task.earliest_start = max(task.earliest_start, constraint)
            
            # ES ne peut pas être négatif
            task.earliest_start = max(0, task.earliest_start)
            
            # Calculer EF
            task.earliest_finish = task.earliest_start + task.duration
            
            processed.add(task.id)
        
        # Traiter toutes les tâches
        for task in self.tasks.values():
            process_task(task)
            
        # Durée du projet = max des EF de toutes les tâches
        self.project_duration = max(task.earliest_finish for task in self.tasks.values())
    
    def backward_pass(self):
        """
        Calcul du passage arrière (Backward Pass)
        Détermine LS (Latest Start) et LF (Latest Finish) pour chaque tâche
        """
        processed = set()
        
        def process_task_backward(task):
            if task.id in processed:
                return
                
            # Traiter d'abord tous les successeurs
            for succ_task, dep_type, lag in task.successors:
                process_task_backward(succ_task)
            
            # Calculer LF basé sur les successeurs
            if not task.successors:
                # Tâche de fin
                task.latest_finish = self.project_duration
            else:
                task.latest_finish = float('inf')
                for succ_task, dep_type, lag in task.successors:
                    if dep_type == 'FS':  # Finish-to-Start
                        constraint = succ_task.latest_start - lag
                    elif dep_type == 'SS':  # Start-to-Start
                        constraint = succ_task.latest_start - lag + task.duration
                    elif dep_type == 'FF':  # Finish-to-Finish
                        constraint = succ_task.latest_finish - lag
                    elif dep_type == 'SF':  # Start-to-Finish
                        constraint = succ_task.latest_finish - lag + task.duration
                    else:
                        constraint = succ_task.latest_start - lag
                        
                    task.latest_finish = min(task.latest_finish, constraint)
            
            # Calculer LS
            task.latest_start = task.latest_finish - task.duration
            
            processed.add(task.id)
        
        # Traiter toutes les tâches
        for task in self.tasks.values():
            process_task_backward(task)
    
    def calculate_float(self):
        """
        Calcul du flottement (Float/Slack)
        """
        for task in self.tasks.values():
            # Flottement total
            task.total_float = task.latest_start - task.earliest_start
            
            # Flottement libre
            if not task.successors:
                task.free_float = self.project_duration - task.earliest_finish
            else:
                min_successor_es = float('inf')
                for succ_task, dep_type, lag in task.successors:
                    if dep_type == 'FS':
                        successor_constraint = succ_task.earliest_start - lag
                    elif dep_type == 'SS':
                        successor_constraint = succ_task.earliest_start - lag + task.duration
                    elif dep_type == 'FF':
                        successor_constraint = succ_task.earliest_finish - lag - task.duration + task.duration
                    elif dep_type == 'SF':
                        successor_constraint = succ_task.earliest_finish - lag - task.duration + task.duration
                    else:
                        successor_constraint = succ_task.earliest_start - lag
                    
                    min_successor_es = min(min_successor_es, successor_constraint)
                
                task.free_float = min_successor_es - task.earliest_finish
                task.free_float = max(0, task.free_float)
            
            # Tâche critique si flottement total = 0
            task.is_critical = (abs(task.total_float) < 0.001)  # tolérance pour les flottants
    
    def find_critical_path(self):
        """
        Identifie le chemin critique
        """
        critical_tasks = [task for task in self.tasks.values() if task.is_critical]
        
        # Construire le chemin critique en suivant les dépendances
        if not critical_tasks:
            return []
        
        # Trouver la tâche de début critique
        start_tasks = [task for task in critical_tasks if not any(pred.is_critical for pred, _, _ in task.predecessors)]
        
        if not start_tasks:
            return critical_tasks
        
        # Construire le chemin
        path = []
        current = start_tasks[0]
        visited = set()
        
        while current and current.id not in visited:
            path.append(current)
            visited.add(current.id)
            
            # Trouver le successeur critique suivant
            next_task = None
            for succ_task, dep_type, lag in current.successors:
                if succ_task.is_critical and succ_task.id not in visited:
                    next_task = succ_task
                    break
            current = next_task
        
        self.critical_path = path
        return path
    
    def schedule_project(self):
        """
        Lance le calcul complet du planning
        """
        print("=== CALCUL DU PLANNING DE PROJET ===")
        print("1. Passage avant (Forward Pass)...")
        self.forward_pass()
        
        print("2. Passage arrière (Backward Pass)...")
        self.backward_pass()
        
        print("3. Calcul du flottement...")
        self.calculate_float()
        
        print("4. Identification du chemin critique...")
        self.find_critical_path()
        
        print(f"✓ Durée totale du projet: {self.project_duration} jours")
        print(f"✓ Nombre de tâches critiques: {len([t for t in self.tasks.values() if t.is_critical])}")
    
    def print_schedule(self):
        """
        Affiche le planning détaillé
        """
        print("\n=== PLANNING DÉTAILLÉ ===")
        print(f"{'ID':<4} {'Nom':<15} {'Durée':<6} {'ES':<4} {'EF':<4} {'LS':<4} {'LF':<4} {'TF':<4} {'FF':<4} {'Critique':<8}")
        print("-" * 80)
        
        for task in sorted(self.tasks.values(), key=lambda t: t.earliest_start):
            print(f"{task.id:<4} {task.name:<15} {task.duration:<6.1f} {task.earliest_start:<4.0f} "
                  f"{task.earliest_finish:<4.0f} {task.latest_start:<4.0f} {task.latest_finish:<4.0f} "
                  f"{task.total_float:<4.1f} {task.free_float:<4.1f} {'OUI' if task.is_critical else 'NON':<8}")
    
    def print_dependencies(self):
        """
        Affiche les dépendances
        """
        print("\n=== DÉPENDANCES ===")
        for task in self.tasks.values():
            if task.predecessors:
                for pred_task, dep_type, lag in task.predecessors:
                    lag_str = f" (lag: {lag})" if lag != 0 else ""
                    print(f"{pred_task.name} --[{dep_type}]--> {task.name}{lag_str}")
    
    def print_critical_path(self):
        """
        Affiche le chemin critique
        """
        print("\n=== CHEMIN CRITIQUE ===")
        if self.critical_path:
            path_names = [task.name for task in self.critical_path]
            print(" → ".join(path_names))
            print(f"Durée: {sum(task.duration for task in self.critical_path)} jours")
        else:
            print("Aucun chemin critique identifié")


# Création d'un exemple d'utilisation
def create_example_project():
    """
    Crée un exemple de projet avec différents types de dépendances
    """
    scheduler = ProjectScheduler()
    
    # Création des tâches avec estimation PERT
    task_a = Task('A', 'Analyse des besoins', optimistic_time=2, most_likely_time=4, pessimistic_time=6)
    task_b = Task('B', 'Conception système', optimistic_time=3, most_likely_time=5, pessimistic_time=7)
    task_c = Task('C', 'Développement UI', optimistic_time=4, most_likely_time=6, pessimistic_time=8)
    task_d = Task('D', 'Développement Backend', optimistic_time=5, most_likely_time=8, pessimistic_time=11)
    task_e = Task('E', 'Tests unitaires', optimistic_time=2, most_likely_time=3, pessimistic_time=4)
    task_f = Task('F', 'Tests intégration', optimistic_time=3, most_likely_time=4, pessimistic_time=5)
    task_g = Task('G', 'Documentation', optimistic_time=1, most_likely_time=2, pessimistic_time=3)
    task_h = Task('H', 'Déploiement', optimistic_time=1, most_likely_time=1, pessimistic_time=2)
    
    # Ajout des tâches au planificateur
    for task in [task_a, task_b, task_c, task_d, task_e, task_f, task_g, task_h]:
        scheduler.add_task(task)
    
    # Définition des dépendances avec différents types
    # Finish-to-Start (classique)
    task_b.add_dependency(task_a, 'FS', 0)  # Conception après analyse
    task_c.add_dependency(task_b, 'FS', 1)  # UI après conception (avec 1 jour de lag)
    task_d.add_dependency(task_b, 'FS', 0)  # Backend après conception
    
    # Start-to-Start  
    task_g.add_dependency(task_c, 'SS', 2)  # Documentation peut commencer 2 jours après le début de UI
    
    # Finish-to-Finish
    task_e.add_dependency(task_d, 'FF', -1)  # Tests unitaires finissent 1 jour avant la fin du backend (lead time)
    
    # Tests d'intégration après les deux développements
    task_f.add_dependency(task_c, 'FS', 0)
    task_f.add_dependency(task_d, 'FS', 0)
    task_f.add_dependency(task_e, 'FS', 0)
    
    # Déploiement à la fin
    task_h.add_dependency(task_f, 'FS', 0)
    task_h.add_dependency(task_g, 'FS', 0)
    
    return scheduler

# Test de l'algorithme
if __name__ == "__main__":
    print("🚀 ALGORITHME COMPLET PERT/CPM AVEC DÉPENDANCES")
    print("=" * 60)
    
    # Création et calcul du projet
    project = create_example_project()
    project.schedule_project()
    
    # Affichage des résultats
    project.print_dependencies()
    project.print_schedule() 
    project.print_critical_path()
    
    print(f"\n✅ Calcul terminé ! Durée projet: {project.project_duration} jours")