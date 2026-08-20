# CoparentAI

Une petite application privée pour organiser la vie de la famille : le planning
des deux ados, leurs activités extra-scolaires, et le suivi équitable des
dépenses entre les deux parents.

---

## Ce que fait l'application

| Onglet | À quoi ça sert |
| --- | --- |
| **Accueil** | Ce qui se passe aujourd'hui, les 7 prochains jours, et le solde entre parents en un coup d'œil. |
| **Planning** | La semaine des deux ados côte à côte, avec qui a la garde chaque jour. |
| **Activités** | Les créneaux qui reviennent chaque semaine (basket, piano, soutien…) et les rendez-vous ponctuels. |
| **Finances** | Chaque dépense, qui l'a payée, comment elle se partage, et le calcul automatique de qui doit combien à qui. |
| **Réglages** | Les prénoms, les couleurs, le rythme de garde, les catégories, et la sauvegarde de vos données. |

## Comment le solde est calculé

Pour chaque dépense, vous indiquez **qui a payé** et **quelle part vous revient**
(50/50 par défaut, mais modifiable dépense par dépense).

- Si vous payez 100 € partagés à 50/50 → l'autre parent vous doit 50 €.
- Si l'autre parent paye 80 € partagés à 50/50 → vous lui devez 40 €.
- Chaque **versement** enregistré (remboursement, pension) vient effacer d'autant
  la dette.

Le solde affiché sur l'accueil, c'est le résultat de tout cela mis bout à bout.
Un versement peut être marqué « hors solde » s'il ne doit pas entrer dans ce
calcul.

## Où sont mes données ?

**Uniquement dans le navigateur de l'appareil que vous utilisez.** Rien n'est
envoyé sur Internet, il n'y a ni compte, ni mot de passe, ni serveur. Personne
d'autre — pas même l'hébergeur du site — ne peut les lire.

La contrepartie : les données ne se synchronisent pas toutes seules entre le
téléphone et l'ordinateur, et **vider les données du navigateur les effacerait**.

👉 Utilisez donc régulièrement **Réglages → Exporter une sauvegarde**. Cela
télécharge un petit fichier `.json`. C'est aussi la façon de transférer vos
données d'un appareil à l'autre : exportez d'un côté, restaurez de l'autre.

## Utiliser l'application

Une fois publiée (voir plus bas), l'application s'ouvre à une adresse web
classique. Sur téléphone, ouvrez cette adresse puis :

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Ajouter à l'écran d'accueil ».

Elle apparaît alors comme une vraie application, avec son icône.

## Publier l'application (une seule fois)

L'application se publie toute seule via GitHub Pages :

1. Sur GitHub, allez dans **Settings → Pages**.
2. Dans « Build and deployment », choisissez la source **GitHub Actions**.
3. Dès qu'une modification arrive sur la branche `main`, le site se reconstruit
   automatiquement.

L'adresse sera : `https://silleenfda.github.io/CoparentAI/`

## Faire tourner l'application sur son ordinateur (facultatif)

```bash
npm install     # à faire une seule fois
npm run dev     # ouvre l'application en local
```

## Comment c'est fait (pour information)

- **React + TypeScript**, assemblés par **Vite** — des outils très répandus,
  faciles à faire évoluer.
- **Aucune base de données** : les données vivent dans le stockage local du
  navigateur (`localStorage`).
- Le code est découpé par sujet :
  - `src/types.ts` — la forme des données (enfant, activité, dépense…).
  - `src/lib/finance.ts` — tous les calculs d'argent et de solde.
  - `src/lib/schedule.ts` — le calendrier, la garde alternée, les activités.
  - `src/views/` — un fichier par onglet de l'application.
  - `src/components/` — les formulaires et les briques d'interface réutilisées.

## Idées pour la suite

- Synchronisation entre les deux parents (nécessite des comptes et un serveur).
- Export du bilan en PDF pour les échanges administratifs.
- Rappels avant les activités.
- Photos des justificatifs attachées aux dépenses.
- Gestion des vacances scolaires et de la garde pendant celles-ci.
