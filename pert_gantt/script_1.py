# Créons maintenant un exemple avec tous les types de dépendances et sauvegardons le code complet

# Extension de l'algorithme avec gestion des ressources et contraintes avancées
class AdvancedTask(Task):
    def __init__(self, id, name, optimistic_time=None, most_likely_time=None, pessimistic_time=None, duration=None, resources=None):
        super().__init__(id, name, optimistic_time, most_likely_time, pessimistic_time, duration)
        self.resources = resources or []
        self.actual_start = None
        self.actual_finish = None
        self.percent_complete = 0
        
    def get_variance(self):
        """Calcule la variance PERT"""
        if hasattr(self, 'pessimistic_time') and hasattr(self, 'optimistic_time'):
            return ((self.pessimistic_time - self.optimistic_time) / 6) ** 2
        return 0

def demonstrate_all_dependency_types():
    """
    Démontre tous les types de dépendances avec des exemples concrets
    """
    print("\n🔗 DÉMONSTRATION DE TOUS LES TYPES DE DÉPENDANCES")
    print("=" * 60)
    
    scheduler = ProjectScheduler()
    
    # Exemple concret: Construction d'une application web
    tasks = {
        'PLAN': Task('PLAN', 'Planification', duration=3),
        'DESIGN': Task('DESIGN', 'Design UI/UX', duration=5),
        'DB': Task('DB', 'Création base données', duration=4),
        'API': Task('API', 'Développement API', duration=8),
        'FRONT': Task('FRONT', 'Développement Frontend', duration=7),
        'TEST_UNIT': Task('TEST_UNIT', 'Tests unitaires', duration=3),
        'TEST_INT': Task('TEST_INT', 'Tests intégration', duration=4),
        'DOC': Task('DOC', 'Documentation', duration=2),
        'FORM': Task('FORM', 'Formation utilisateurs', duration=3),
        'DEPLOY': Task('DEPLOY', 'Déploiement', duration=1)
    }
    
    # Ajout des tâches
    for task in tasks.values():
        scheduler.add_task(task)
    
    print("Types de dépendances utilisées:")
    print("FS = Finish-to-Start (Finir avant commencer)")
    print("SS = Start-to-Start (Commencer en même temps)")
    print("FF = Finish-to-Finish (Finir en même temps)")
    print("SF = Start-to-Finish (Commencer avant finir)\n")
    
    # 1. FINISH-TO-START (FS) - Le plus courant
    print("1. FINISH-TO-START (FS):")
    tasks['DESIGN'].add_dependency(tasks['PLAN'], 'FS', 0)
    print("   - Le design commence APRÈS la fin de la planification")
    
    tasks['DB'].add_dependency(tasks['DESIGN'], 'FS', 1)  # Avec lag de 1 jour
    print("   - La création DB commence 1 jour APRÈS la fin du design")
    
    tasks['API'].add_dependency(tasks['DB'], 'FS', 0)
    print("   - L'API commence APRÈS la création de la DB")
    
    # 2. START-TO-START (SS) - Démarrage simultané
    print("\n2. START-TO-START (SS):")
    tasks['FRONT'].add_dependency(tasks['DESIGN'], 'SS', 2)
    print("   - Le frontend commence 2 jours APRÈS le début du design")
    
    tasks['DOC'].add_dependency(tasks['API'], 'SS', 3)
    print("   - La documentation commence 3 jours APRÈS le début de l'API")
    
    # 3. FINISH-TO-FINISH (FF) - Fin simultanée
    print("\n3. FINISH-TO-FINISH (FF):")
    tasks['TEST_UNIT'].add_dependency(tasks['API'], 'FF', -1)  # Lead time
    print("   - Les tests unitaires finissent 1 jour AVANT la fin de l'API")
    
    tasks['FORM'].add_dependency(tasks['DOC'], 'FF', 0)
    print("   - La formation finit EN MÊME TEMPS que la documentation")
    
    # 4. START-TO-FINISH (SF) - Plus rare, mais utile
    print("\n4. START-TO-FINISH (SF):")
    tasks['TEST_INT'].add_dependency(tasks['FRONT'], 'SF', 1)
    print("   - Les tests d'intégration finissent 1 jour APRÈS le début du frontend")
    
    # Dépendances classiques de fin
    tasks['TEST_INT'].add_dependency(tasks['API'], 'FS', 0)
    tasks['TEST_INT'].add_dependency(tasks['TEST_UNIT'], 'FS', 0)
    
    tasks['DEPLOY'].add_dependency(tasks['TEST_INT'], 'FS', 0)
    tasks['DEPLOY'].add_dependency(tasks['FORM'], 'FS', 0)
    
    # Calcul et affichage
    scheduler.schedule_project()
    scheduler.print_dependencies()
    scheduler.print_schedule()
    scheduler.print_critical_path()
    
    return scheduler

# Fonction pour analyser les contraintes et décalages
def analyze_schedule_constraints(scheduler):
    """
    Analyse les contraintes et décalages du planning
    """
    print("\n📊 ANALYSE DES CONTRAINTES ET DÉCALAGES")
    print("=" * 50)
    
    lag_count = {'FS': 0, 'SS': 0, 'FF': 0, 'SF': 0}
    total_lag_time = 0
    lead_time_tasks = []
    
    for task in scheduler.tasks.values():
        for pred_task, dep_type, lag in task.predecessors:
            lag_count[dep_type] += 1
            total_lag_time += abs(lag)
            
            if lag < 0:
                lead_time_tasks.append(f"{pred_task.name} -> {task.name} (lead: {abs(lag)} jours)")
    
    print(f"Types de dépendances utilisées:")
    for dep_type, count in lag_count.items():
        if count > 0:
            print(f"  - {dep_type}: {count} dépendances")
    
    print(f"\nTemps de décalage total: {total_lag_time} jours")
    
    if lead_time_tasks:
        print(f"\nTâches avec lead time (avance):")
        for task_info in lead_time_tasks:
            print(f"  - {task_info}")
    
    # Analyse du chemin critique
    critical_tasks = [t for t in scheduler.tasks.values() if t.is_critical]
    print(f"\nTâches critiques: {len(critical_tasks)}/{len(scheduler.tasks)}")
    print(f"Pourcentage de tâches critiques: {len(critical_tasks)/len(scheduler.tasks)*100:.1f}%")

# Fonction pour exporter les données en CSV
def export_to_csv(scheduler, filename="project_schedule.csv"):
    """
    Exporte le planning en CSV
    """
    import csv
    
    with open(filename, 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        
        # En-têtes
        writer.writerow(['ID', 'Nom', 'Durée', 'ES', 'EF', 'LS', 'LF', 
                        'Flottement_Total', 'Flottement_Libre', 'Critique', 'Prédécesseurs'])
        
        # Données
        for task in sorted(scheduler.tasks.values(), key=lambda t: t.earliest_start):
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

# Exécution de la démonstration complète
demo_scheduler = demonstrate_all_dependency_types()
analyze_schedule_constraints(demo_scheduler)
export_to_csv(demo_scheduler, "planning_exemple_complet.csv")

print("\n🎯 RÉCAPITULATIF DE L'ALGORITHME")
print("=" * 40)
print("✅ Types de dépendances supportés: FS, SS, FF, SF")
print("✅ Gestion des décalages (lag) et avances (lead)")
print("✅ Calcul PERT avec 3 estimations de temps")
print("✅ Identification du chemin critique")
print("✅ Calcul des flottements total et libre")
print("✅ Export CSV pour intégration")