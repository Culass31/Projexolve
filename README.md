# 🚀 PROJEXOLVE - Outil de Gestion de Projet Révolutionnaire

![PROJEXOLVE Logo](https://via.placeholder.com/800x200?text=PROJEXOLVE+2.0)

## 📋 Vue d'ensemble

**PROJEXOLVE** est l'outil de gestion de projet **tout-en-un** le plus avancé du marché, intégrant nativement :

- 🎯 **Kanban élégant** avec swim lanes et drag & drop
- 📊 **Gantt interactif** avec dépendances intelligentes
- 🔗 **PERT automatisé** avec calcul du chemin critique
- 💰 **Gestion budgétaire** temps réel avec alertes
- ⚠️ **Gestion des risques** avec matrice interactive
- 📈 **Analytics avancés** et reporting executive

## ✨ Fonctionnalités Clés

### 🎯 Planification Unifiée
- **Vue Kanban** : Tableaux dynamiques avec workflow personnalisable
- **Vue Gantt** : Drag & drop intelligent avec gestion des dépendances
- **Vue PERT** : Génération automatique du réseau et calcul des marges
- **Transition fluide** entre les vues sans perte de contexte

### 💰 Budget Intégré
- **Suivi temps réel** des dépenses par catégorie
- **Alertes prédictives** à 70%, 85% et 95% du budget
- **Earned Value Management** (CPI, SPI, EAC)
- **Workflow d'approbation** des dépenses

### ⚠️ Gestion des Risques
- **Matrice de risques** interactive (Probabilité × Impact)
- **Plans de mitigation** avec suivi des actions
- **Scoring automatique** et escalade des alertes
- **Conformité** aux standards ISO 31000

## 🛠️ Stack Technologique

### Frontend
- **React 18** avec hooks modernes
- **Vite** pour un développement ultra-rapide
- **React Router** pour la navigation SPA
- **React Beautiful DND** pour le drag & drop
- **D3.js** pour les visualisations Gantt/PERT
- **CSS moderne** avec variables CSS et Flexbox/Grid

### Backend
- **Supabase** (PostgreSQL + Auth + Real-time)
- **Row Level Security (RLS)** pour la sécurité
- **API REST** générée automatiquement
- **Real-time subscriptions** pour la collaboration

### Base de Données
- **PostgreSQL** avec UUID et types avancés
- **Schéma optimisé** avec index de performance
- **Vues matérialisées** pour les métriques
- **Triggers** pour les calculs automatiques

## 🚀 Installation Rapide

### Prérequis
```bash
node >= 16.0.0
npm >= 8.0.0
```

### 1. Cloner le projet
```bash
git clone https://github.com/your-username/projexolve.git
cd projexolve
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration Supabase

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com)

2. **Exécuter le schéma SQL** :
   - Aller dans l'éditeur SQL de Supabase
   - Copier-coller le contenu de `schema.sql`
   - Exécuter le script

3. **Configurer les variables d'environnement** :
```bash
cp .env.example .env.local
```

Éditer `.env.local` :
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Lancer l'application
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📁 Structure du Projet

```
src/
├── components/           # Composants React réutilisables
│   ├── common/          # Composants partagés (Header, Modal, etc.)
│   ├── kanban/          # Composants Kanban (Board, Card, etc.)
│   ├── gantt/           # Composants Gantt (Chart, Timeline, etc.)
│   ├── pert/            # Composants PERT (Diagram, Nodes, etc.)
│   ├── budget/          # Composants Budget (Dashboard, Tracker)
│   └── risks/           # Composants Risques (Matrix, Cards)
├── contexts/            # Contextes React (Auth, Project)
├── hooks/               # Hooks personnalisés
├── pages/               # Pages de l'application
├── styles/              # Fichiers CSS globaux et composants
├── utils/               # Fonctions utilitaires
└── App.jsx             # Composant racine
```

## 🎯 Guide d'utilisation

### 1. Créer votre premier projet
1. Connectez-vous avec Google ou créez un compte
2. Cliquez sur "Nouveau Projet"
3. Remplissez les informations de base
4. Définissez un budget initial (optionnel)

### 2. Ajouter des tâches
- **Vue Kanban** : Cliquez sur "+" dans une colonne
- **Vue Gantt** : Double-clic sur la timeline
- **Propriétés** : nom, description, durée, priorité, assigné

### 3. Créer des dépendances
- **Vue Gantt** : Glisser-déposer entre les tâches
- **Types supportés** : Finish-Start, Start-Start, etc.
- **Calcul automatique** du chemin critique

### 4. Gérer le budget
- Définir des catégories de coûts
- Ajouter des dépenses avec justificatifs
- Workflow d'approbation intégré
- Alertes automatiques de dépassement

### 5. Suivre les risques
- Identifier les risques par catégorie
- Évaluer Probabilité × Impact (1-5)
- Créer des plans de mitigation
- Surveiller l'évolution via la matrice

## 🔧 Développement

### Scripts disponibles
```bash
npm run dev      # Démarrage en mode développement
npm run build    # Construction pour la production  
npm run preview  # Prévisualisation du build
npm run lint     # Vérification du code
```

### Architecture des composants

#### Contextes React
- **AuthContext** : Gestion de l'authentification Supabase
- **ProjectContext** : État global du projet (tâches, budget, risques)

#### Hooks personnalisés
- **useProject()** : Accès aux données du projet
- **useAuth()** : Gestion de l'utilisateur connecté
- **useTasks()** : CRUD des tâches avec recalcul automatique

#### Calculs algorithmiques
- **PERT/CPM** : Algorithme de chemin critique complet
- **Earned Value** : Calcul CPI, SPI, EAC automatique
- **Scheduling** : Gestion des jours ouvrés et contraintes

### Ajout de nouvelles fonctionnalités

1. **Nouveau composant** :
```jsx
// components/module/NewComponent.jsx
import React from 'react';
import { useProject } from '../../contexts/ProjectContext';

const NewComponent = () => {
  const { project, updateProject } = useProject();
  
  return (
    <div className="new-component">
      {/* Votre composant */}
    </div>
  );
};

export default NewComponent;
```

2. **Nouveaux styles** :
```css
/* styles/components.css */
.new-component {
  /* Utiliser les variables CSS existantes */
  background-color: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}
```

3. **Nouvelles données** :
```sql
-- Ajouter dans schema.sql
ALTER TABLE projects ADD COLUMN new_field VARCHAR(255);

-- Mise à jour du contexte
// contexts/ProjectContext.jsx
const updateNewField = async (value) => {
  await supabase.from('projects')
    .update({ new_field: value })
    .eq('id', projectId);
};
```

## 🚧 Roadmap

### Version 2.1 (Q1 2026)
- [ ] Vue Timeline executive
- [ ] Export PowerPoint automatique
- [ ] Templates par industrie
- [ ] Mode collaboratif temps réel

### Version 2.2 (Q2 2026)
- [ ] Application mobile (React Native)
- [ ] Intégrations Slack/Teams
- [ ] API publique
- [ ] Plugins marketplace

### Version 2.3 (Q3 2026)
- [ ] IA prédictive (délais/coûts)
- [ ] Optimisation automatique de planning
- [ ] Détection de risques intelligente
- [ ] Voice commands

## 🤝 Contribution

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)
3. **Commit** vos changements (`git commit -m 'Add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. **Créer** une Pull Request

### Guidelines de développement
- Utiliser les hooks React modernes
- Suivre les conventions de nommage existantes
- Ajouter des tests pour les nouvelles fonctionnalités
- Documenter les nouvelles APIs
- Respecter l'architecture en couches

## 📈 Performance

### Métriques cibles
- **First Contentful Paint** : < 1.5s
- **Time to Interactive** : < 3s
- **Bundle Size** : < 500kb gzipped
- **Core Web Vitals** : Score > 90

### Optimisations implémentées
- **Code splitting** par route
- **Lazy loading** des composants lourds
- **Memoization** des calculs coûteux
- **Virtualisation** des longues listes
- **Service Worker** pour la mise en cache

## 🔒 Sécurité

### Authentification
- **Supabase Auth** avec JWT tokens
- **OAuth** Google, Microsoft, GitHub
- **2FA** optionnel pour les entreprises

### Autorisation
- **Row Level Security (RLS)** PostgreSQL
- **Politique de sécurité** par utilisateur
- **Audit trail** complet des actions

### Données
- **Chiffrement** des données sensibles
- **Backup** automatique quotidien
- **GDPR compliance** intégré

## 📊 Analytics & Monitoring

### Métriques business
- **Taux d'adoption** par fonctionnalité
- **Temps de session** moyen
- **Conversion** freemium → payant
- **NPS Score** utilisateur

### Métriques techniques
- **Uptime** : 99.9% garanti
- **Response time** : < 200ms moyenne
- **Error rate** : < 0.1%
- **Performance** : Core Web Vitals

## 📞 Support

### Documentation
- [Guide utilisateur complet](docs/user-guide.md)
- [Documentation API](docs/api-reference.md) 
- [Guide développeur](docs/developer-guide.md)

### Communauté
- [Discord](https://discord.gg/projexolve)
- [Forum communautaire](https://community.projexolve.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/projexolve)

### Support professionnel
- **Email** : support@projexolve.com
- **Chat** : support.projexolve.com
- **Téléphone** : +33 1 XX XX XX XX (Plan Enterprise)

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**🚀 Créé avec ❤️ par l'équipe PROJEXOLVE**

[Website](https://projexolve.com) • [Documentation](https://docs.projexolve.com) • [Community](https://discord.gg/projexolve)

</div>