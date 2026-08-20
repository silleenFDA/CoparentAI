import type { AppData } from '../types'
import { DEFAULT_CATEGORIES, newId } from './storage'
import { addDays, startOfWeek, today } from './dates'

/** Jeu de données d'exemple, pour voir à quoi ressemble l'application remplie. */
export function demoData(): AppData {
  const lea = newId()
  const tom = newId()
  const monday = startOfWeek(today())

  return {
    version: 1,
    parents: {
      me: { id: 'me', name: 'Moi', color: '#4f46e5' },
      other: { id: 'other', name: 'Alex', color: '#0d9488' },
    },
    children: [
      { id: lea, name: 'Léa', color: '#e11d48', school: 'Lycée Camus', grade: '1re' },
      { id: tom, name: 'Tom', color: '#f59e0b', school: 'Collège Prévert', grade: '4e' },
    ],
    categories: [...DEFAULT_CATEGORIES],
    activities: [
      { id: newId(), childId: lea, title: 'Basket — entraînement', kind: 'sport', weekday: 1, start: '18:00', end: '19:30', location: 'Gymnase Jean-Moulin', driverId: 'me', frequency: 'weekly', active: true },
      { id: newId(), childId: lea, title: 'Match de basket', kind: 'sport', weekday: 5, start: '14:00', end: '16:00', location: 'Variable', driverId: 'other', frequency: 'even', active: true },
      { id: newId(), childId: lea, title: 'Soutien maths', kind: 'ecole', weekday: 3, start: '17:00', end: '18:00', location: 'À la maison', frequency: 'weekly', driverId: null, active: true },
      { id: newId(), childId: tom, title: 'Piano', kind: 'musique', weekday: 2, start: '16:30', end: '17:30', location: 'Conservatoire', driverId: 'other', frequency: 'weekly', active: true },
      { id: newId(), childId: tom, title: 'Judo', kind: 'sport', weekday: 4, start: '18:30', end: '20:00', location: 'Dojo municipal', driverId: 'me', frequency: 'weekly', active: true },
      { id: newId(), childId: tom, title: 'Orthophoniste', kind: 'sante', weekday: 0, start: '17:15', end: '18:00', location: 'Cabinet Rue des Lilas', driverId: 'me', frequency: 'odd', active: true },
    ],
    events: [
      { id: newId(), childId: lea, title: 'Conseil de classe', date: addDays(monday, 9), start: '18:00', location: 'Lycée Camus' },
      { id: newId(), childId: tom, title: 'Orthodontiste', date: addDays(monday, 12), start: '11:00', location: 'Dr Martin' },
      { id: newId(), childId: 'all', title: 'Départ vacances chez les grands-parents', date: addDays(monday, 20) },
    ],
    custody: { mode: 'alternate-weekly', evenWeekParent: 'me', changeoverWeekday: 4 },
    custodyOverrides: [],
    expenses: [
      { id: newId(), date: addDays(today(), -34), label: 'Licence basket Léa', amount: 245, category: 'Activités extra-scolaires', childId: lea, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -31), label: 'Conservatoire — trimestre', amount: 186, category: 'Activités extra-scolaires', childId: tom, paidBy: 'other', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -28), label: 'Fournitures rentrée', amount: 132.4, category: 'Scolarité', childId: 'all', paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -21), label: 'Cantine septembre', amount: 210, category: 'Cantine', childId: 'all', paidBy: 'other', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -17), label: 'Chaussures de sport Tom', amount: 79.9, category: 'Vêtements', childId: tom, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -12), label: 'Orthodontie — mensualité', amount: 145, category: 'Santé', childId: tom, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -8), label: 'Forfait téléphone Léa', amount: 19.99, category: 'Téléphone', childId: lea, paidBy: 'other', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -5), label: 'Sortie scolaire Léa', amount: 65, category: 'Scolarité', childId: lea, paidBy: 'me', shareMe: 0.5 },
      { id: newId(), date: addDays(today(), -2), label: 'Stage judo vacances', amount: 120, category: 'Activités extra-scolaires', childId: tom, paidBy: 'other', shareMe: 0.5 },
    ],
    transfers: [
      { id: newId(), date: addDays(today(), -20), amount: 150, from: 'other', to: 'me', kind: 'remboursement', label: 'Régularisation août', countsInBalance: true },
    ],
  }
}
