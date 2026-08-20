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

/** Cours de l'emploi du temps scolaire, ou activité en dehors des cours. */
export type ActivityScope = 'cours' | 'hors-cours'

/**
 * Une semaine sur deux, l'alternance suit le calendrier de garde :
 * « les semaines où les enfants sont chez tel parent ».
 */
export type Frequency = 'weekly' | 'week-me' | 'week-other'

/** Créneau qui revient chaque semaine : cours, sport, musique, trajet... */
export interface Activity {
  id: ID
  childId: ID
  title: string
  scope: ActivityScope
  kind: 'ecole' | 'sport' | 'musique' | 'sante' | 'autre'
  weekday: Weekday
  start: string // "17:30"
  end: string // "19:00"
  location?: string
  /** Parent qui emmène / récupère, si c'est toujours le même. */
  driverId?: ParentId | null
  frequency: Frequency
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

/**
 * L'alternance est définie par un point de départ daté plutôt que par des
 * numéros de semaine : c'est ce que les parents ont réellement en tête
 * (« à partir du samedi 29 août, une semaine chacun »).
 */
export interface CustodySettings {
  mode: 'alternate-weekly' | 'off'
  /** Premier jour de la première semaine de référence (donne le jour de bascule). */
  anchorDate: string
  /** Parent qui a les enfants pendant cette semaine de référence. */
  anchorParent: ParentId
  /** Fin de l'accord en cours. L'alternance continue au-delà, avec un rappel. */
  endDate?: string
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
  /** Aide sur laquelle cette dépense a été prise, s'il y en a une. */
  allowanceId?: ID
  notes?: string
}

/**
 * Somme perçue de l'extérieur pour les enfants : allocation de rentrée,
 * allocations familiales, bourse, remboursement de mutuelle.
 *
 * C'est l'exact miroir d'une dépense. Un parent l'encaisse en entier alors
 * qu'elle revient aux deux : il en doit donc la part de l'autre, que les
 * dépenses financées avec viennent ensuite compenser.
 */
export interface Allowance {
  id: ID
  date: string
  label: string
  amount: number
  kind: 'allocation' | 'bourse' | 'remboursement' | 'autre'
  receivedBy: ParentId
  /** Part qui me revient, entre 0 et 1. */
  shareMe: number
  childId: ID | 'all'
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

/** Fiche d'un document joint. Le fichier lui-même vit dans IndexedDB. */
export interface SharedDocument {
  id: ID
  title: string
  category: 'juridique' | 'sante' | 'scolaire' | 'assurance' | 'autre'
  childId: ID | 'all'
  fileName: string
  mimeType: string
  size: number
  addedAt: string
  /** Échéance d'une ordonnance renouvelable, d'une attestation… */
  expiresAt?: string
  notes?: string
}

/** Trace écrite : compte rendu, accord, information transmise. */
export interface Note {
  id: ID
  date: string
  title: string
  body: string
  category: 'reunion' | 'accord' | 'info' | 'autre'
  childId: ID | 'all'
  createdAt: string
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
  allowances: Allowance[]
  transfers: Transfer[]
  documents: SharedDocument[]
  notes: Note[]
}
