# ALGORITHME COMPLET PERT/CPM AVEC TOUS LES TYPES DE DÉPENDANCES
# Développé pour la gestion de projet avancée avec PERT

class Task:
    """
    Classe représentant une tâche dans le projet
    Supporte les estimations PERT (3 temps) et les dépendances multiples
    """
    def __init__(self, id, name, optimistic_time=None, most_likely_time=None, pessimistic_time=None, duration=None):
        self.id = id
        self.name = name
        
        # Gestion des temps PERT (3 estimations) ou temps fixe
        if duration is not None:
            self.duration = duration
        else:
            # Formule PERT: (O + 4M + P) / 6
            self.duration = (optimistic_time + 4 * most_likely_time + pessimistic_time) / 6
            self.optimistic_time = optimistic_time
            self.most_likely_time = most_likely_time
            self.pessimistic_time = pessimistic_time
            
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
        
        Args:
            predecessor: Tâche prédécesseur
            dependency_type: Type de dépendance
                - 'FS' : Finish-to-Start (défaut)
                - 'FF' : Finish-to-Finish
                - 'SS' : Start-to-Start  
                - 'SF' : Start-to-Finish
            lag: Temps de décalage en jours
                - Positif : délai (lag time)
                - Négatif : avance (lead time)
        """
        self.predecessors.append((predecessor, dependency_type, lag))
        predecessor.successors.append((self, dependency_type, lag))
        
    def get_variance(self):
        """Calcule la variance PERT pour l'analyse des risques"""
        if hasattr(self, 'pessimistic_time') and hasattr(self, 'optimistic_time'):
            return ((self.pessimistic_time - self.optimistic_time) / 6) ** 2
        return 0


class ProjectScheduler:
    """
    Planificateur de projet utilisant les méthodes PERT et CPM
    Gère tous les types de dépendances et calcule le chemin critique
    """
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
        processed = set()
        
        def process_task(task):
            if task.id in processed:
                return
                
            # Traiter d'abord tous les prédécesseurs
            for pred_task, dep_type, lag in task.predecessors:
                process_task(pred_task)
            
            # Calculer ES basé sur les prédécesseurs et leur type de dépendance
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
            
            # Calculer LF basé sur les successeurs et leur type de dépendance
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
        - Flottement total : retard possible sans impacter le projet
        - Flottement libre : retard possible sans impacter les successeurs
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
        Le chemin critique est la séquence de tâches critiques la plus longue
        """
        critical_tasks = [task for task in self.tasks.values() if task.is_critical]
        
        if not critical_tasks:
            return []
        
        # Trouver la tâche de début critique
        start_tasks = [task for task in critical_tasks 
                      if not any(pred.is_critical for pred, _, _ in task.predecessors)]
        
        if not start_tasks:
            return critical_tasks
        
        # Construire le chemin critique
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
        Exécute toutes les étapes de l'algorithme PERT/CPM
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
        
        print(f"✓ Durée totale du projet: {self.project_duration:.1f} jours")
        print(f"✓ Nombre de tâches critiques: {len([t for t in self.tasks.values() if t.is_critical])}")
    
    def print_schedule(self):
        """Affiche le planning détaillé sous forme de tableau"""
        print("\n=== PLANNING DÉTAILLÉ ===")
        print(f"{'ID':<8} {'Nom':<20} {'Durée':<6} {'ES':<4} {'EF':<4} {'LS':<4} {'LF':<4} {'TF':<4} {'FF':<4} {'Critique':<8}")
        print("-" * 88)
        
        for task in sorted(self.tasks.values(), key=lambda t: t.earliest_start):
            print(f"{task.id:<8} {task.name:<20} {task.duration:<6.1f} {task.earliest_start:<4.0f} "
                  f"{task.earliest_finish:<4.0f} {task.latest_start:<4.0f} {task.latest_finish:<4.0f} "
                  f"{task.total_float:<4.1f} {task.free_float:<4.1f} {'OUI' if task.is_critical else 'NON':<8}")
    
    def print_dependencies(self):
        """Affiche toutes les dépendances du projet"""
        print("\n=== DÉPENDANCES ===")
        for task in self.tasks.values():
            if task.predecessors:
                for pred_task, dep_type, lag in task.predecessors:
                    lag_str = f" (lag: {lag})" if lag != 0 else ""
                    print(f"{pred_task.name} --[{dep_type}]--> {task.name}{lag_str}")
    
    def print_critical_path(self):
        """Affiche le chemin critique"""
        print("\n=== CHEMIN CRITIQUE ===")
        if self.critical_path:
            path_names = [task.name for task in self.critical_path]
            print(" → ".join(path_names))
            print(f"Durée: {sum(task.duration for task in self.critical_path):.1f} jours")
        else:
            print("Aucun chemin critique identifié")
    
    def export_to_csv(self, filename="project_schedule.csv"):
        """
        Exporte le planning vers un fichier CSV
        """
        import csv
        
        with open(filename, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            
            # En-têtes
            writer.writerow(['ID', 'Nom', 'Durée', 'ES', 'EF', 'LS', 'LF', 
                            'Flottement_Total', 'Flottement_Libre', 'Critique', 'Prédécesseurs'])
            
            # Données
            for task in sorted(self.tasks.values(), key=lambda t: t.earliest_start):
                predecessors = '; '.join([f"{pred.name}({dep_type},{lag})" 
                                        for pred, dep_type, lag in task.predecessors])
                
                writer.writerow([
                    task.id, task.name, f"{task.duration:.1f}", 
                    f"{task.earliest_start:.0f}", f"{task.earliest_finish:.0f}",
                    f"{task.latest_start:.0f}", f"{task.latest_finish:.0f}",
                    f"{task.total_float:.1f}", f"{task.free_float:.1f}",
                    'OUI' if task.is_critical else 'NON', predecessors
                ])
        
        print(f"\n💾 Planning exporté vers: {filename}")


def create_example_project():
    """
    Exemple d'utilisation avec tous les types de dépendances
    Projet : Développement d'une application web
    """
    scheduler = ProjectScheduler()
    
    # Création des tâches avec estimation PERT
    tasks = {
        'PLAN': Task('PLAN', 'Planification', duration=3),
        'DESIGN': Task('DESIGN', 'Design UI/UX', optimistic_time=3, most_likely_time=5, pessimistic_time=7),
        'DB': Task('DB', 'Création base données', optimistic_time=2, most_likely_time=4, pessimistic_time=6),
        'API': Task('API', 'Développement API', optimistic_time=6, most_likely_time=8, pessimistic_time=12),
        'FRONT': Task('FRONT', 'Développement Frontend', optimistic_time=5, most_likely_time=7, pessimistic_time=9),
        'TEST_UNIT': Task('TEST_UNIT', 'Tests unitaires', optimistic_time=2, most_likely_time=3, pessimistic_time=4),
        'TEST_INT': Task('TEST_INT', 'Tests intégration', optimistic_time=3, most_likely_time=4, pessimistic_time=5),
        'DOC': Task('DOC', 'Documentation', optimistic_time=1, most_likely_time=2, pessimistic_time=3),
        'FORM': Task('FORM', 'Formation utilisateurs', optimistic_time=2, most_likely_time=3, pessimistic_time=4),
        'DEPLOY': Task('DEPLOY', 'Déploiement', duration=1)
    }
    
    # Ajout des tâches au planificateur
    for task in tasks.values():
        scheduler.add_task(task)
    
    # DÉFINITION DES DÉPENDANCES AVEC TOUS LES TYPES :
    
    # 1. FINISH-TO-START (FS) - Le plus courant
    tasks['DESIGN'].add_dependency(tasks['PLAN'], 'FS', 0)
    tasks['DB'].add_dependency(tasks['DESIGN'], 'FS', 1)  # Avec lag de 1 jour
    tasks['API'].add_dependency(tasks['DB'], 'FS', 0)
    
    # 2. START-TO-START (SS) - Démarrage simultané
    tasks['FRONT'].add_dependency(tasks['DESIGN'], 'SS', 2)  # Frontend commence 2 jours après le début du design
    tasks['DOC'].add_dependency(tasks['API'], 'SS', 3)       # Doc commence 3 jours après le début de l'API
    
    # 3. FINISH-TO-FINISH (FF) - Fin simultanée
    tasks['TEST_UNIT'].add_dependency(tasks['API'], 'FF', -1)  # Tests finissent 1 jour avant l'API (lead time)
    tasks['FORM'].add_dependency(tasks['DOC'], 'FF', 0)        # Formation finit en même temps que la doc
    
    # 4. START-TO-FINISH (SF) - Plus rare
    tasks['TEST_INT'].add_dependency(tasks['FRONT'], 'SF', 1)  # Tests d'intég finissent 1 jour après début frontend
    
    # Dépendances de fin classiques
    tasks['TEST_INT'].add_dependency(tasks['API'], 'FS', 0)
    tasks['TEST_INT'].add_dependency(tasks['TEST_UNIT'], 'FS', 0)
    
    tasks['DEPLOY'].add_dependency(tasks['TEST_INT'], 'FS', 0)
    tasks['DEPLOY'].add_dependency(tasks['FORM'], 'FS', 0)
    
    return scheduler


if __name__ == "__main__":
    """
    Exemple d'utilisation de l'algorithme complet
    """
    print("🚀 ALGORITHME COMPLET PERT/CPM")
    print("AVEC TOUS LES TYPES DE DÉPENDANCES")
    print("=" * 50)
    
    # Création et calcul du projet
    project = create_example_project()
    project.schedule_project()
    
    # Affichage des résultats
    project.print_dependencies()
    project.print_schedule()
    project.print_critical_path()
    
    # Export CSV
    project.export_to_csv("planning_projet.csv")
    
    print("\n✅ TYPES DE DÉPENDANCES SUPPORTÉS:")
    print("   - FS : Finish-to-Start (Finir avant commencer)")
    print("   - SS : Start-to-Start (Commencer ensemble)")
    print("   - FF : Finish-to-Finish (Finir ensemble)")
    print("   - SF : Start-to-Finish (Commencer avant finir)")
    print("   - Gestion lag/lead time pour tous les types")
    print("   - Calcul automatique du chemin critique")
    print("   - Export CSV pour intégration dans votre application")