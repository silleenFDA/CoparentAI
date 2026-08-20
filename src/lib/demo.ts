import type { Activity, AppData } from '../types'
import { CUSTODY_ANCHOR_DATE, CUSTODY_END_DATE, DEFAULT_CATEGORIES, newId } from './storage'
import { addDays, today } from './dates'
import { custodyWeekStart } from './schedule'

const DEMO_CUSTODY: AppData['custody'] = {
  mode: 'alternate-weekly',
  anchorDate: CUSTODY_ANCHOR_DATE,
  anchorParent: 'me',
  endDate: CUSTODY_END_DATE,
}

/** Raccourci pour écrire l'emploi du temps sans répéter les champs communs. */
function cours(
  childId: string,
  weekday: Activity['weekday'],
  title: string,
  start: string,
  end: string,
  location?: string,
): Activity {
  return {
    id: newId(),
    childId,
    title,
    scope: 'cours',
    kind: 'ecole',
    weekday,
    start,
    end,
    location,
    driverId: null,
    frequency: 'weekly',
    active: true,
  }
}

/** Jeu de données d'exemple, pour voir à quoi ressemble l'application remplie. */
export function demoData(): AppData {
  const maxime = newId()
  const mathis = newId()
  const weekStart = custodyWeekStart(today(), DEMO_CUSTODY)

  return {
    version: 2,
    parents: {
      me: { id: 'me', name: 'Maman', color: '#4f46e5' },
      other: { id: 'other', name: 'Papa', color: '#0d9488' },
    },
    children: [
      { id: maxime, name: 'Maxime', color: '#e11d48', school: 'Lycée Camus', grade: '1re' },
      { id: mathis, name: 'Mathis', color: '#f59e0b', school: 'Collège Prévert', grade: '4e' },
    ],
    categories: [...DEFAULT_CATEGORIES],
    activities: [
      // Emploi du temps de Maxime (lycée)
      cours(maxime, 0, 'Cours', '08:00', '12:00', 'Lycée Camus'),
      cours(maxime, 0, 'Cours', '13:30', '17:00', 'Lycée Camus'),
      cours(maxime, 1, 'Cours', '09:00', '12:00', 'Lycée Camus'),
      cours(maxime, 1, 'Cours', '13:30', '16:00', 'Lycée Camus'),
      cours(maxime, 2, 'Cours', '08:00', '12:00', 'Lycée Camus'),
      cours(maxime, 3, 'Cours', '08:00', '12:00', 'Lycée Camus'),
      cours(maxime, 3, 'Cours', '13:30', '17:00', 'Lycée Camus'),
      cours(maxime, 4, 'Cours', '08:00', '12:00', 'Lycée Camus'),
      // Emploi du temps de Mathis (collège)
      cours(mathis, 0, 'Cours', '08:30', '12:30', 'Collège Prévert'),
      cours(mathis, 0, 'Cours', '14:00', '16:00', 'Collège Prévert'),
      cours(mathis, 1, 'Cours', '08:30', '12:30', 'Collège Prévert'),
      cours(mathis, 2, 'Cours', '08:30', '11:30', 'Collège Prévert'),
      cours(mathis, 3, 'Cours', '08:30', '12:30', 'Collège Prévert'),
      cours(mathis, 3, 'Cours', '14:00', '17:00', 'Collège Prévert'),
      cours(mathis, 4, 'Cours', '08:30', '12:30', 'Collège Prévert'),
      // Hors cours
      { id: newId(), childId: maxime, title: 'Basket — entraînement', scope: 'hors-cours', kind: 'sport', weekday: 1, start: '18:00', end: '19:30', location: 'Gymnase Jean-Moulin', driverId: 'me', frequency: 'weekly', active: true },
      { id: newId(), childId: maxime, title: 'Match de basket', scope: 'hors-cours', kind: 'sport', weekday: 5, start: '14:00', end: '16:00', location: 'Variable', driverId: 'other', frequency: 'week-other', active: true },
      { id: newId(), childId: maxime, title: 'Soutien maths', scope: 'hors-cours', kind: 'ecole', weekday: 2, start: '14:00', end: '15:00', location: 'À la maison', driverId: null, frequency: 'weekly', active: true },
      { id: newId(), childId: mathis, title: 'Piano', scope: 'hors-cours', kind: 'musique', weekday: 2, start: '16:30', end: '17:30', location: 'Conservatoire', driverId: 'other', frequency: 'weekly', active: true },
      { id: newId(), childId: mathis, title: 'Judo', scope: 'hors-cours', kind: 'sport', weekday: 4, start: '18:30', end: '20:00', location: 'Dojo municipal', driverId: 'me', frequency: 'weekly', active: true },
      { id: newId(), childId: mathis, title: 'Orthophoniste', scope: 'hors-cours', kind: 'sante', weekday: 1, start: '17:15', end: '18:00', location: 'Cabinet Rue des Lilas', driverId: 'me', frequency: 'week-me', active: true },
    ],
    events: [
      { id: newId(), childId: maxime, title: 'Conseil de classe', date: addDays(weekStart, 9), start: '18:00', location: 'Lycée Camus' },
      { id: newId(), childId: mathis, title: 'Orthodontiste', date: addDays(weekStart, 12), start: '11:00', location: 'Dr Martin' },
      { id: newId(), childId: 'all', title: 'Départ vacances chez les grands-parents', date: addDays(weekStart, 20) },
    ],
    custody: DEMO_CUSTODY,
    custodyOverrides: [],
    expenses: [
      { id: newId(), date: addDays(today(), -34), label: 'Licence basket Maxime', amount: 245, category: 'Activités extra-scolaires', childId: maxime, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -31), label: 'Conservatoire — trimestre', amount: 186, category: 'Activités extra-scolaires', childId: mathis, paidBy: 'other', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -28), label: 'Fournitures rentrée', amount: 132.4, category: 'Scolarité', childId: 'all', paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -21), label: 'Cantine septembre', amount: 210, category: 'Cantine', childId: 'all', paidBy: 'other', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -17), label: 'Chaussures de sport Mathis', amount: 79.9, category: 'Vêtements', childId: mathis, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -12), label: 'Orthodontie — mensualité', amount: 145, category: 'Santé', childId: mathis, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -8), label: 'Forfait téléphone Maxime', amount: 19.99, category: 'Téléphone', childId: maxime, paidBy: 'other', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -5), label: 'Sortie scolaire Maxime', amount: 65, category: 'Scolarité', childId: maxime, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -2), label: 'Stage judo vacances', amount: 120, category: 'Activités extra-scolaires', childId: mathis, paidBy: 'other', shareMe: 0.5 },
    ],
    transfers: [
      { id: newId(), date: addDays(today(), -20), amount: 150, from: 'other', to: 'me', kind: 'remboursement', label: 'Régularisation août', countsInBalance: true },
    ],
  }
}
