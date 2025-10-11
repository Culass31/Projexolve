# Guide d'implémentation PERT/CPM avec Gantt - Tous les cas de dépendances

## Vue d'ensemble

Cet algorithme implémente une solution complète de planification de projet utilisant les méthodes **PERT** (Program Evaluation and Review Technique) et **CPM** (Critical Path Method) avec support de tous les types de dépendances et gestion des décalages.

## Fonctionnalités principales

### ✅ Types de dépendances supportés

1. **FS (Finish-to-Start)** - *Le plus courant*
   - La tâche successeur ne peut commencer qu'après la fin du prédécesseur
   - Exemple: Développement backend → Tests d'intégration

2. **SS (Start-to-Start)** - *Démarrage simultané*
   - La tâche successeur peut commencer après le début du prédécesseur
   - Exemple: Design UI/UX → Développement Frontend (avec décalage)

3. **FF (Finish-to-Finish)** - *Fin simultanée*
   - La tâche successeur doit finir en relation avec la fin du prédécesseur
   - Exemple: Tests unitaires → Développement API (finissent ensemble)

4. **SF (Start-to-Finish)** - *Plus rare*
   - La tâche successeur ne peut finir qu'après le début du prédécesseur
   - Exemple: Garde de nuit → Garde de jour (handover)

### ✅ Gestion des décalages (Lag/Lead Time)

- **Lag Time (positif)**: Délai obligatoire entre les tâches
  - Exemple: Béton coulé → Construction murs (+2 jours de séchage)
- **Lead Time (négatif)**: Avance/chevauchement autorisé
  - Exemple: Développement → Tests (-1 jour, tests commencent avant la fin)

### ✅ Calculs PERT

- **Estimation à 3 points**: Optimiste, Probable, Pessimiste
- **Formule PERT**: `Durée = (O + 4M + P) / 6`
- **Calcul de variance** pour l'analyse des risques

## Structure de l'algorithme

### Phase 1: Forward Pass (Passage avant)
```python
# Calcul des temps au plus tôt (ES/EF)
for each task in topological_order:
    if no_predecessors:
        ES = 0
    else:
        ES = max(constraint for each predecessor based on dependency_type)
    EF = ES + duration
```

### Phase 2: Backward Pass (Passage arrière)
```python
# Calcul des temps au plus tard (LS/LF)
for each task in reverse_topological_order:
    if no_successors:
        LF = project_duration
    else:
        LF = min(constraint for each successor based on dependency_type)
    LS = LF - duration
```

### Phase 3: Calcul des flottements
```python
# Flottement total et libre
total_float = LS - ES
free_float = min(successor_ES) - EF
is_critical = (total_float == 0)
```

## Exemples d'utilisation

### Cas d'usage 1: Projet web avec toutes les dépendances

```python
# Création des tâches
scheduler = ProjectScheduler()

# Tâches avec PERT
design = Task('DESIGN', 'Design UI/UX', 
              optimistic_time=3, most_likely_time=5, pessimistic_time=7)
api = Task('API', 'Développement API', 
           optimistic_time=6, most_likely_time=8, pessimistic_time=12)

# Ajout des dépendances
api.add_dependency(design, 'FS', 1)  # API commence 1 jour après la fin du design
frontend.add_dependency(design, 'SS', 2)  # Frontend commence 2 jours après le début du design
tests.add_dependency(api, 'FF', -1)  # Tests finissent 1 jour avant l'API

# Calcul du planning
scheduler.schedule_project()
```

### Cas d'usage 2: Gestion des contraintes complexes

```python
# Contrainte de ressource partagée
database.add_dependency(analysis, 'FS', 0)
api.add_dependency(database, 'FS', 0)
frontend.add_dependency(database, 'SS', 1)  # Peut commencer 1 jour après le début de la DB

# Contrainte de validation
testing.add_dependency(frontend, 'SF', 2)  # Tests finissent 2 jours après début frontend
deployment.add_dependency(testing, 'FS', 0)
```

## Algorithme de calcul des contraintes

### Pour chaque type de dépendance:

**Finish-to-Start (FS)**:
```
Constraint = Predecessor.EF + Lag
Successor.ES >= Constraint
```

**Start-to-Start (SS)**:
```
Constraint = Predecessor.ES + Lag
Successor.ES >= Constraint
```

**Finish-to-Finish (FF)**:
```
Constraint = Predecessor.EF + Lag
Successor.EF >= Constraint
donc: Successor.ES >= Constraint - Successor.Duration
```

**Start-to-Finish (SF)**:
```
Constraint = Predecessor.ES + Lag  
Successor.EF >= Constraint
donc: Successor.ES >= Constraint - Successor.Duration
```

## Gestion des décalages dans votre application

### Implémentation des lag/lead dans l'interface

```python
def handle_task_shift(task_id, shift_days):
    """
    Décale une tâche et propage les changements
    """
    task = self.tasks[task_id]
    
    # Décalage de la tâche
    task.earliest_start += shift_days
    task.earliest_finish += shift_days
    
    # Propagation aux successeurs
    self.propagate_changes(task)
    
    # Recalcul du chemin critique
    self.calculate_float()
    self.find_critical_path()
```

### Détection des conflits de ressources

```python
def check_resource_conflicts(self):
    """
    Vérifie les conflits de ressources entre tâches parallèles
    """
    conflicts = []
    for task1 in self.tasks.values():
        for task2 in self.tasks.values():
            if (task1 != task2 and 
                self.tasks_overlap(task1, task2) and
                self.share_resources(task1, task2)):
                conflicts.append((task1, task2))
    return conflicts
```

## Export et intégration

### Export CSV pour votre application

```python
# L'algorithme génère un CSV avec:
columns = [
    'ID', 'Nom', 'Durée', 'ES', 'EF', 'LS', 'LF',
    'Flottement_Total', 'Flottement_Libre', 
    'Critique', 'Prédécesseurs'
]
```

### Format des dépendances exportées

```
Prédécesseur(Type,Lag); Prédécesseur2(Type,Lag)
Exemple: "Design(FS,1); Analysis(SS,0)"
```

## Optimisations pour grandes applications

### 1. Cache des calculs
```python
@lru_cache(maxsize=1000)
def calculate_constraint(pred_task, dep_type, lag, duration):
    # Cache les calculs de contraintes fréquents
```

### 2. Calcul incrémental
```python
def update_single_task(self, task_id):
    """
    Met à jour seulement les tâches impactées par un changement
    """
    affected_tasks = self.get_downstream_tasks(task_id)
    self.partial_recalculation(affected_tasks)
```

### 3. Validation des cycles
```python
def detect_circular_dependencies(self):
    """
    Détecte les dépendances circulaires avant calcul
    """
    visited = set()
    rec_stack = set()
    
    def has_cycle(task):
        visited.add(task.id)
        rec_stack.add(task.id)
        
        for pred_task, _, _ in task.predecessors:
            if pred_task.id in rec_stack:
                return True
            if pred_task.id not in visited and has_cycle(pred_task):
                return True
                
        rec_stack.remove(task.id)
        return False
```

## Points d'attention pour l'implémentation

1. **Validation des données**: Vérifier la cohérence des durées et dépendances
2. **Gestion des erreurs**: Traiter les cas de dépendances circulaires
3. **Performance**: Optimiser pour les projets avec > 1000 tâches
4. **Interface utilisateur**: Permettre la modification interactive des dépendances
5. **Historique**: Conserver les versions de planning pour comparaison

## Conclusion

Cet algorithme fournit une base solide pour implémenter un système de gestion de projet complet avec:
- Support de tous les types de dépendances standards
- Gestion flexible des décalages et avances
- Calcul automatique du chemin critique
- Export des données pour intégration

L'implémentation est modulaire et peut être adaptée selon vos besoins spécifiques.