# Refactoring Vehicle Management

## Objectifs

1.  Refactoriser la gestion de l'état du véhicule en utilisant le service centralisé `VehicleStateManager`, qui utilisera `VehicleState` comme DTO.
2.  Supprimer la classe `Vehicle` existante du modèle.
3.  Créer un service dédié `TripService` pour gérer l'historique des positions ("snake") du véhicule, et ajouter des fonctionnalités pour les métriques de conduite.
4.  Assurer un couplage lâche et une communication claire via le pattern observer.

## Instructions détaillées (par étapes)

1.  **Suppression de la classe `Vehicle` et Définition de `VehicleState`**

    *   **Objectif :** Remplacer la classe `Vehicle` existante par une interface `VehicleState`.
    *   **Actions :**
        *   Supprimer le fichier `src/models/Vehicle.ts`.
        *   Dans le fichier `src/services/VehicleStateManager.ts`, définir une interface `VehicleState` comme suit :
            ```typescript
            export interface VehicleState {
                position: [number, number];
                speed: number;
                acceleration: number;
                heading: number;
            }
            ```

2.  **Modification du service `VehicleStateManager` (Revue)**

    *   **Objectif :** Définir un service centralisé pour gérer l'état du véhicule.
    *   **Actions :**
        *   (Déjà fait) Créer un nouveau fichier `src/services/VehicleStateManager.ts`.
        *  (Déjà fait) Définir l'interface `VehicleState`  dans ce fichier.
        *   (Déjà fait) Créer une classe `VehicleStateManager` qui implémente le pattern singleton.
        *   (Déjà fait) Ajouter une propriété privée `state` de type `VehicleState`, avec une valeur initiale de  `position: [48.8566, 2.3522]`, `speed:0`, `acceleration:0`, et `heading: 0`.
        *   (Déjà fait) Ajouter un setter `updateState` à la classe, qui prendra un objet de type `Partial<VehicleState>` pour faire une mise à jour de state.
        *   (Déjà fait) Ajouter un getter `getState` pour retourner une copie de l'état actuel.
        *   (Déjà fait) Ajouter un tableau privé `observers` de type `((state: VehicleState) => void)[]` pour la gestion des observateurs.
        *   (Déjà fait) Implémenter des méthodes `addObserver(observer: (state: VehicleState) => void)` et `removeObserver(observer: (state: VehicleState) => void)` pour gérer les observateurs.
        *   (Déjà fait) Ajouter une méthode `notifyObservers` qui envoie une copie de l'état courant à tous les observateurs. Cette méthode doit être appelée après chaque mise à jour du state.
    *   **Tests unitaires :**
         * (Déjà fait) Ajouter un test pour vérifier que les observateurs sont bien notifiés après une modification de l'état.
        *  (Déjà fait) Ajouter un test pour vérifier que l'état est correctement mis à jour via `updateState`, et que la méthode `getState` retourne bien une copie de l'état.

3.  **Création du service `TripService`**

    *   **Objectif :** Gérer l'historique des positions et les métriques de conduite du véhicule.
    *   **Actions :**
        *   Créer un nouveau fichier `src/services/TripService.ts`.
        *   Dans ce fichier :
            *   Définir une interface `TripState` contenant `positions: Array<[number, number]>`, et `metrics: {}`.
            *   Créer une classe `TripService` (singleton)
            *   Ajouter une propriété privée `state` de type `TripState`, avec une valeur initiale de `positions` un tableau vide et `metrics` un objet vide
            *   Ajouter une propriété privée `maxLength` de type `number` pour définir la longueur maximal de la trace, avec une valeur par défaut à `60`
            *   Ajouter une méthode `addPosition` qui prend une `position: [number, number]` et l'ajoute au tableau `positions` en début de tableau. Les positions doivent être filtrées pour ne pas enregistrer des points identiques
            *   La longueur du tableau `positions` doit être limitée à `maxLength`.
            *   Ajouter un getter `getPositions()` qui retourne une copie du tableau `positions`.
              *   Ajouter une méthode `reset(initialPosition: [number, number])` pour réinitialiser le trip et l'historique à une position donnée.
         *  Implémenter des méthodes `addObserver(observer: (state: TripState) => void)` et `removeObserver(observer: (state: TripState) => void)` pour gérer les observateurs.
         * Ajouter une méthode `notifyObservers` qui envoie une copie de l'état courant à tous les observateurs. Cette méthode doit être appelée après chaque mise à jour du state.
         * Dans la méthode `addPosition`
            *  calculer la distance entre les deux derniers points
           * calculer le temps entre les 2 derniers points
           * calculer la vitesse en m/s
            * stocker les dernières valeurs de distance, temps et vitesse dans l'état `metrics`.
           * ajouter une fonction pour calculer l'acceleration (en m/s^2) entre les deux dernière vitesses (si 2 positions ont été enregistrées, sinon mettre l'acceleration à 0).

    *   **Tests unitaires :**
        *   Ajouter un test pour vérifier que `addPosition` ajoute correctement des positions et respecte la longueur maximale du "snake".
        *   Ajouter un test pour vérifier que le "snake" est bien reset.
        *   Ajouter un test pour vérifier que les observateurs sont bien notifiés après chaque ajout de position.
        *   Ajouter des tests pour vérifier les calculs des métriques : distance, vitesse et accélération.

4.  **Modification du service `LocationService`**
    *   **Objectif :** Modifier `LocationService` pour utiliser `TripService` et ne plus gérer l'historique du véhicule.
    *   **Actions :**
        *   Récupérer l'instance du `TripService` dans le constructeur.
        *   Dans les callbacks GPS et Simulation, en plus de mettre à jour le state du véhicule, appeler la méthode `tripService.addPosition()` avec les coordonnées actuelles.
        *   Supprimer le `Snake` du `Vehicle` et de l'objet de simulation
        *  Supprimer les observers du `Vehicle`
    *   **Tests unitaires :**
        *  Vérifier que les positions sont bien enregistrées dans `TripService`.
        *   Vérifier que les données GPS et de Simulation mettent à jour correctement les données du `VehicleState` et du `TripState`.

5.  **Modification du service `RoadPredictor`**
    *   **Objectif :** Mettre à jour `RoadPredictor` pour utiliser `VehicleStateManager` et `TripService`.
    *   **Actions :**
        *  Modifier le constructeur pour qu'il récupère les instances `VehicleStateManager` et `TripService`.
        * Utiliser la méthode `vehicleStateManager.getState()` pour récupérer la position, la vitesse et le heading
        *  Modifier les methodes pour ne plus utiliser l'objet Vehicle
    *   **Tests unitaires :**
         * Vérifier qu'il n'y a pas d'erreur.

6.   **Modification du service `SpeedController` (dans `src/services/simulation/utils/SpeedController.ts`)**
    *   **Objectif :** Mettre à jour `SpeedController` pour utiliser `VehicleStateManager` et `TripService`.
    *    **Actions :**
          * Modifier le constructeur pour qu'il récupère l'instance `VehicleStateManager`.
          * Utiliser `vehicleStateManager.getState().speed` pour la vitesse courante.
          * utiliser la méthode `vehicleStateManager.updateState` pour mettre à jour la vitesse et l'accélération.
    *    **Tests Unitaires :**
          *   Vérifier que les calculs de vitesse et accélération sont corrects.

7.  **Modification des vues (composants React)**
    *   **Objectif :** Adapter les vues pour utiliser le `VehicleStateManager` et le `TripService`.
    *   **Actions :**
        *  Dans les composants `MapArea.tsx` et `MapView.tsx`:
              *   Remplacer `useVehicle` et `useVehicleState` par les instances de `VehicleStateManager` et `TripService`.
              *   Mettre à jour l'historique des positions en utilisant  `tripService.getPositions()`.
             *   Utiliser l'état du `VehicleStateManager` pour le rendu.
        *    Dans le component `SpeedPanel.tsx`:
            *   Remplace les anciens services par `VehicleStateManager` et `TripService` pour l'état et les métriques.
        *     Modifier `MainLayout.tsx` pour utiliser `VehicleStateManager` et `TripService`.

8.  **Tests d'intégration**
      * Effectuer des tests d'intégration complets pour s'assurer que le nouveau système fonctionne correctement.

## Points importants pour l'IA

*   **Suppression du modèle Vehicle :** L'IA doit s'assurer de supprimer complètement `src/models/Vehicle.ts` et toute référence à cette classe.
*   **Pas de breaking changes :** S'assurer que la transition est transparente et que toutes les anciennes fonctionnalités marchent toujours correctement après cette refactorisation.
*   **Tests :** Ne pas oublier de mettre à jour et ajouter les tests unitaires.

Ces instructions plus précises doivent guider l'IA à implémenter ces changements de manière efficace. Dis-moi si tu as d'autres questions !
