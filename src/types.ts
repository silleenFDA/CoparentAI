// ---------------------------------------------------------------------------
// Toutes les "formes" de données manipulées par l'application.
// ---------------------------------------------------------------------------

export type ID = string
export type ParentId = 'me' | 'other'

/** 0 = lundi, 1 = mardi, ... 6 = dimanche */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Parent {
  id: ParentId
  name: string
  color: string
}

export interface Child {
  id: ID
  name: string
  color: string
  school?: string
  grade?: string
}

/** Créneau qui revient chaque semaine : cours, sport, musique, trajet... */
export interface Activity {
  id: ID
  childId: ID
  title: string
  kind: 'ecole' | 'sport' | 'musique' | 'sante' | 'autre'
  weekday: Weekday
  start: string // "17:30"
  end: string // "19:00"
  location?: string
  /** Parent qui emmène / récupère, si c'est toujours le même. */
  driverId?: ParentId | null
  /** toutes les semaines, ou une semaine sur deux */
  frequency: 'weekly' | 'even' | 'odd'
  notes?: string
  active: boolean
}

/** Événement ponctuel : rendez-vous médical, tournoi, sortie scolaire... */
export interface OneOffEvent {
  id: ID
  childId: ID | 'all'
  title: string
  date: string // "2026-08-20"
  start?: string
  end?: string
  location?: string
  notes?: string
}

export interface CustodySettings {
  mode: 'alternate-weekly' | 'off'
  /** Parent qui a les enfants les semaines paires (numéro de semaine ISO). */
  evenWeekParent: ParentId
  /** Jour de la bascule d'une semaine à l'autre (souvent le vendredi). */
  changeoverWeekday: Weekday
}

/** Exception ponctuelle au calendrier de garde. */
export interface CustodyOverride {
  date: string
  parentId: ParentId
}

export interface Expense {
  id: ID
  date: string
  label: string
  /** Montant total payé, en euros. */
  amount: number
  category: string
  childId: ID | 'all'
  paidBy: ParentId
  /** Part qui m'incombe, entre 0 et 1 (0.5 = moitié/moitié). */
  shareMe: number
  notes?: string
}

/** Argent qui passe réellement d'un parent à l'autre. */
export interface Transfer {
  id: ID
  date: string
  amount: number
  from: ParentId
  to: ParentId
  kind: 'remboursement' | 'pension' | 'autre'
  label?: string
  /** Si false, le versement est enregistré mais n'efface pas de dette. */
  countsInBalance: boolean
}

export interface AppData {
  version: number
  parents: Record<ParentId, Parent>
  children: Child[]
  categories: string[]
  activities: Activity[]
  events: OneOffEvent[]
  custody: CustodySettings
  custodyOverrides: CustodyOverride[]
  expenses: Expense[]
  transfers: Transfer[]
}
