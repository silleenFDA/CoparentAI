# Cahier des charges MVP : coaching running pour femmes

Version 0.1, brouillon à valider.

## 1. Vision
Une appli de coaching course à pied qui construit un plan vers un objectif de course et l'adapte au cycle menstruel de chaque utilisatrice, à partir de son historique Strava et de son suivi de cycle.

**Promesse :** « Un plan qui s'adapte à ton corps, pas seulement à ton calendrier. »

## 2. Cible
- Coureuses amateures (débutante à intermédiaire), 20-45 ans.
- Objectifs : 5 km, 10 km, semi-marathon (marathon en phase 2).
- Utilisent déjà Strava.

## 3. Hypothèse à valider
> Adapter la placement et l'intensité des séances à la phase du cycle est perçu comme utile et améliore le ressenti et la régularité.

**Critères de succès de la bêta (20 à 50 coureuses, 6 à 8 semaines) :**
- ≥ 60 % encore actives à la semaine 6
- ≥ 70 % de séances réalisées vs prévues
- ≥ 60 % jugent l'adaptation au cycle « utile » ou « très utile »

## 4. Périmètre du MVP

### Inclus
| # | Fonction | Description |
|---|---|---|
| F1 | Compte | Inscription par e-mail, consentement explicite aux données de santé, suppression du compte en 1 clic |
| F2 | Connexion Strava | OAuth, import des 3 à 6 derniers mois, synchronisation des nouvelles sorties (webhook) |
| F3 | Profil de niveau | Calcul automatique : volume hebdo moyen, régularité, meilleure allure récente sur 5 et 10 km, estimation des allures cibles ; correction manuelle possible |
| F4 | Objectif | Distance, date de course, temps visé (optionnel), jours disponibles par semaine, durée max d'une sortie |
| F5 | Suivi du cycle | Date des dernières règles, durée moyenne du cycle et des règles, option « cycle irrégulier / contraception hormonale / pas de règles » ; calendrier simple ; saisie de 3 symptômes en 1 tap (énergie, douleurs, sommeil) |
| F6 | Plan d'entraînement | Génération par règles sur toute la durée jusqu'à la course, avec séances typées (footing, fractionné, sortie longue, récup), allures et durées |
| F7 | Adaptation au cycle | Voir §6 |
| F8 | Suivi des séances | Réalisé (via Strava) vs prévu, ressenti post-séance de 1 à 5 |
| F9 | Conseils | Messages courts par phase (récupération, nutrition, hydratation, sommeil) |
| F10 | Vue semaine | Séances de la semaine, phase du cycle du jour, séance du jour |

### Exclu du MVP (phase 2+)
Import HealthKit/Health Connect, intégrations Flo/Clue, export montres, marathon, abonnement, communauté, apprentissage statistique par utilisatrice, coaching nutrition détaillé.

## 5. Moteur de plan (règles de base)
**Entrées :** niveau (F3), objectif (F4), disponibilités, historique récent.

**Règles de sécurité :**
- Progression du volume hebdo ≤ 10 % (±), avec une semaine allégée (–20 à –30 %) toutes les 3 à 4 semaines.
- Au plus 2 séances intenses par semaine (1 pour les débutantes), jamais sur 2 jours consécutifs.
- Sortie longue ≤ 30-35 % du volume hebdo.
- Affûtage de 7 à 14 jours avant la course selon la distance.
- Avertissement et ralentissement si volume récent très bas ou reprise après arrêt long.

## 6. Adaptation au cycle (règles initiales, à faire valider par une professionnelle)
Principe : on **ajuste** le placement et l'intensité, on ne supprime pas l'entraînement.

| Phase | Approche |
|---|---|
| Règles | Séance adaptée au ressenti (maintien possible, intensité optionnelle) ; pas de séance clé imposée |
| Folliculaire | Bonne fenêtre pour séances intenses et nouveautés |
| Ovulation | Séances clés possibles ; rappel d'attention à l'échauffement |
| Lutéale | Séances d'intensité modérée privilégiées ; plus de récupération ; hydratation et chaleur |
| Symptômes forts déclarés | Alternative allégée proposée (ex. fractionné → footing) |

**Cas particuliers :** pour un cycle irrégulier, une contraception hormonale ou l'absence de règles, on désactive les ajustements par phase et on s'appuie sur le ressenti et les symptômes saisis. L'absence prolongée de règles déclenche un message recommandant de consulter.

**Toujours :** l'utilisatrice peut refuser ou modifier chaque ajustement.

## 7. Écrans
1. Onboarding : consentement, connexion Strava, objectif, cycle
2. Accueil : séance du jour, phase du cycle, progression vers l'objectif
3. Semaine / plan complet
4. Détail d'une séance (+ ressenti après coup)
5. Calendrier du cycle et saisie des symptômes
6. Profil et réglages : données, export, suppression

## 8. Modèle de données (simplifié)
- **User** : id, e-mail, consentements, préférences
- **StravaConnection** : user_id, jetons chiffrés, dernière synchro
- **Activity** : id, date, distance, durée, allure, FC, source
- **CycleProfile** : durée moyenne, durée des règles, statut (régulier / irrégulier / contraception / pas de règles)
- **CycleEvent** : date de début, date de fin
- **SymptomLog** : date, énergie, douleurs, sommeil
- **Goal** : distance, date, temps visé, disponibilités
- **Plan** / **PlannedSession** : semaine, type, durée, allure, phase prévue, statut
- **Feedback** : session_id, ressenti 1 à 5, note libre

## 9. Contraintes non fonctionnelles
- **Vie privée :** données de santé (RGPD art. 9) : consentement explicite, hébergement UE, chiffrement, aucune revente, suppression complète à la demande, analyse d'impact.
- **Positionnement :** bien-être et sport, pas de dispositif médical ; aucun discours de contraception, de fertilité ou de diagnostic. Mention « ne remplace pas un avis médical ».
- **Strava :** respecter les conditions de l'API (données affichées uniquement à leur propriétaire, pas d'entraînement de modèles d'IA, mention « Powered by Strava »).
- **Plateforme :** web-app mobile (PWA) pour démarrer.

## 10. Stack suggérée
- Front : React/TypeScript (PWA)
- Backend et base : Supabase (Postgres, auth, fonctions) hébergé en UE
- Moteur de plan : TypeScript, règles pures et testables
- Notifications : e-mail d'abord, push ensuite

## 11. Planning indicatif
| Période | Contenu |
|---|---|
| S1 | Entretiens coureuses, validation des règles avec une professionnelle, maquettes |
| S2-3 | Comptes, Strava, profil de niveau |
| S4-5 | Cycle, objectif, moteur de plan |
| S6 | Adaptation au cycle, suivi, conseils |
| S7 | Tests, conformité RGPD, bêta fermée |
| S8+ | Bêta de 6 à 8 semaines, mesure des critères de succès |

## 12. Risques
| Risque | Parade |
|---|---|
| Efficacité de l'adaptation au cycle peu établie | Positionnement « personnalisation », recueil du ressenti, relecture par une experte |
| Données de santé sensibles | Privacy by design, consentement clair, minimisation |
| Quotas et conditions de l'API Strava | Bêta limitée, demande de validation en parallèle |
| Concurrence (FitrWoman, Wild.AI, etc.) | Différenciation : plan complet vers un objectif + Strava + personnalisation |

## 13. Questions ouvertes
- Niveau d'allure cible : calcul automatique à partir de Strava ou saisie manuelle du temps de référence ?
- Langue(s) et marchés : France uniquement au départ ?
- Nom et identité de l'appli.
- Qui valide les règles du §6 (coach, physiologiste, gynécologue) ?
