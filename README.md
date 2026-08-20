# CoparentAI

Une petite application privée pour organiser la vie de la famille : le planning
des deux ados, leurs activités extra-scolaires, et le suivi équitable des
dépenses entre les deux parents.

---

## Ce que fait l'application

| Onglet | À quoi ça sert |
| --- | --- |
| **Accueil** | Ce qui se passe aujourd'hui, les 7 prochains jours, et le solde entre parents en un coup d'œil. |
| **Planning** | Trois onglets : l'emploi du temps de Maxime, celui de Mathis, et une vue des activités hors cours des deux enfants. |
| **Activités** | Les créneaux qui reviennent chaque semaine — cours d'un côté, activités hors cours de l'autre — et les rendez-vous ponctuels. |
| **Finances** | Chaque dépense, qui l'a payée, comment elle se partage, et le calcul automatique de qui doit combien à qui. |
| **Réglages** | Les prénoms, les couleurs, le rythme de garde, les catégories, et la sauvegarde de vos données. |

## Le planning

Trois onglets, parce qu'on ne consulte pas un emploi du temps scolaire et un
planning d'activités pour les mêmes raisons :

- **Maxime** et **Mathis** — la semaine complète de l'enfant. Les cours forment
  la trame de fond, en gris ; les activités et rendez-vous ressortent par-dessus.
- **Activités hors cours** — les deux enfants ensemble, cours exclus. C'est la
  vue qui sert à repérer les conflits de trajets : deux activités à la même
  heure, ou deux enfants à emmener en même temps.

La semaine affichée va du **samedi au vendredi**, pour coïncider avec le rythme
de garde : chaque colonne de sept jours correspond à une semaine chez un seul
parent.

## Importer l'emploi du temps scolaire

Pronote et École Directe proposent un export **iCal** (fichier `.ics`) de
l'emploi du temps. Onglet **Activités → Cours → Importer un .ics**.

Ces exports ne décrivent pas la semaine type : ils listent toutes les séances
datées du trimestre. L'application reconstitue donc la semaine en repérant les
créneaux qui reviennent, puis affiche ce qu'elle a compris **avant** d'écrire
quoi que ce soit. Sur cet écran :

- Le nombre à droite indique combien de fois le créneau revient sur la période.
  Un nombre deux fois plus faible que les autres signale un cours en semaine A /
  semaine B — il sera importé comme hebdomadaire, à corriger à la main.
- Les séances vues une seule fois sont écartées : ce sont des événements
  ponctuels, pas des cours.
- On peut décocher ce qu'on ne veut pas (permanences, options).
- « Raccourcir les intitulés » ne garde que la matière et retire le nom du
  professeur, très présent dans les exports Pronote.
- Réimporter remplace les cours existants de cet enfant, sans toucher à ses
  activités hors cours ni à l'autre enfant.

Les heures sont reprises telles qu'elles s'affichent dans l'emploi du temps,
y compris quand l'export les exprime en temps universel.

**Pas de synchronisation automatique** : le navigateur n'a pas le droit d'aller
chercher le calendrier chez Pronote depuis une autre adresse. Il faut donc
réimporter le fichier quand l'emploi du temps change. Cette limite disparaîtra
le jour où l'application tournera sur un serveur.

## La garde alternée

Elle se règle par une **date de départ** plutôt que par des numéros de semaine —
c'est ce qu'on a en tête quand on s'accorde avec l'autre parent. Le réglage
actuel : à partir du **samedi 29 août 2026**, une semaine chez Maman, une semaine
chez Papa, jusqu'au **vendredi 9 juillet 2027**.

Le jour de la date de départ devient le jour de bascule. Passé la date de fin,
l'alternance continue à s'afficher au même rythme, avec un rappel invitant à la
mettre à jour — rien ne disparaît jamais du planning.

Deux ajustements possibles :

- Un **échange ponctuel** (vacances, dépannage) : cliquez sur le nom du parent
  dans la journée concernée du planning, la garde s'inverse pour ce jour-là et
  un astérisque le signale.
- Une activité **une semaine sur deux** : au lieu de « semaines paires », vous
  choisissez « semaines chez Maman » ou « semaines chez Papa ». C'est plus
  parlant, et cela reste juste même si l'alternance est décalée.

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

## Fabriquer une version en un seul fichier

`npm run build:single` produit `dist/coparentai.html` : toute l'application dans
un fichier unique, sans rien à installer. Pratique pour l'ouvrir directement
depuis le disque, ou la déposer sur un hébergement qui n'accepte qu'une page.

## Publier l'application (une seule fois)

L'application se publie toute seule via GitHub Pages :

1. Sur GitHub, allez dans **Settings → Pages**.
2. Dans « Build and deployment », choisissez la source **GitHub Actions**.
3. Dès qu'une modification arrive sur la branche `main` (ou sur la branche de
   développement `claude/coparent-ai-family-app-7jnnk8`), le site se reconstruit
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
