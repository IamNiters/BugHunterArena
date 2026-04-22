# Plan de Développement - Bug Hunter Arena

## 1. Analyse du Sujet et des Objectifs

Le projet **Bug Hunter Arena** est un jeu compétitif de résolution de bugs (code : TPRE300). Les objectifs principaux sont de proposer un jeu ludique, mettre en avant les compétences en debugging, offrir une interface de suivi simple et développer l'application en temps limité (20h).

### Fonctionnalités Clés
- **Gestion des Parties :** Inscription des équipes, tirage au sort des technologies, attribution des bugs, validation automatique, et mise à jour du classement en temps réel.
- **Interfaces Utilisateur (3 écrans) :**
  1.  **Interface par équipe :** Suivi du score et des bugs à résoudre.
  2.  **Interface joueur actif :** Environnement de code pour corriger le bug (expert de la techno tirée).
  3.  **Vue spectateur (Tableau de bord) :** Progression en temps réel, scores, corrections en cours.
- **Mécanique de Jeu :** Tour par tour, chronométrage (plus rapide = plus de points), mode "Piège" (option bonus), et classement en temps réel.

### Technologies Demandées vs. Choix Fullstack JS
Le sujet propose initialement une stack variée (PHP backend, ReactJS frontend, et divers langages pour les bugs).
Cependant, vous avez demandé à développer cette solution en **JavaScript Fullstack**.
Nous allons donc adapter l'architecture technique tout en respectant le cahier des charges fonctionnel :
- **Backend :** Node.js avec Express ou NestJS (remplaçant PHP).
- **Frontend :** ReactJS (comme demandé pour le tableau de bord).
- **Base de données :** MySQL ou PostgreSQL (au lieu de Firebase/MySQL classique).
- **Temps réel :** Socket.io ou WebSockets pour la mise à jour instantanée des scores et des vues spectateurs.
- **Environnement de Code :** Intégration d'un éditeur de code en ligne (ex: Monaco Editor) et d'un système d'exécution sécurisé (sandbox/Docker) pour tester les codes (JS, C++, C#, PHP, Mobile/Dart).

## 2. Architecture Technique Proposée (Fullstack JS)

Pour répondre aux exigences de sécurité et de temps réel :

1.  **Client (Frontend) :** Application React (Vite), TailwindCSS pour le style.
2.  **Serveur (Backend) :** Node.js + Express. Gestion de l'API REST et des WebSockets (Socket.io).
3.  **Base de Données :** PostgreSQL avec Prisma ORM pour une gestion robuste des équipes, utilisateurs, bugs et scores.
4.  **Exécution de Code Sécurisée :** Utilisation d'une API d'exécution de code tierce (comme Piston API ou Judge0) ou mise en place de conteneurs Docker éphémères pour exécuter et valider les soumissions des joueurs en toute sécurité.

## 3. Plan d'Action par Étapes

### Étape 1 : Initialisation et Configuration (Scaffolding)
- Initialisation du projet monorepo (ou dossiers séparés `client` et `server`).
- Configuration de la base de données (Schémas : Equipe, Joueur, Bug, Session de Jeu, Score).
- Mise en place du serveur Node.js et de la connexion WebSocket.

### Étape 2 : Développement du Backend (API & Temps Réel)
- CRUD pour les équipes et les joueurs.
- Logique de gestion de partie : création de session, tirage au sort (techno/bug).
- Système de chronométrage côté serveur pour éviter les triches.
- Intégration du système de validation de code (connexion à Judge0/Piston).

### Étape 3 : Développement du Frontend (Interfaces)
- **Vue Spectateur :** Tableau de bord global avec animations de scores en temps réel.
- **Vue Équipe :** Espace de gestion d'équipe et d'attente.
- **Vue Joueur Actif :** Intégration de Monaco Editor, affichage de l'énoncé du bug, bouton de soumission, et retours de la console.

### Étape 4 : Intégration des Données (Bugs)
- Création d'un set de données de test : bugs pré-définis en PHP, JS, C++, C#, et Mobile (logique pure).
- Écriture des tests unitaires associés pour la validation automatique.

### Étape 5 : Sécurisation et Finalisation
- Vérification des failles (injections, exécution de code arbitraire).
- Tests de charge légers pour les WebSockets.
- Préparation du livrable pour l'évaluation (respect des critères de la grille : Compréhension, Analyse, Clarté, Aboutissement, Qualité).

## 4. Prochaines Étapes
Si cette approche vous convient, nous pouvons commencer par initialiser le projet dans votre dossier local (`/mnt/desktop/BugHunterArena/`).
Voulez-vous que je génère la structure de base (package.json, configuration Vite/React, serveur Express) dès maintenant ?
