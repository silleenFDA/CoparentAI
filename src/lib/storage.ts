import type { Activity, AppData, CustodySettings, Frequency } from '../types'

const STORAGE_KEY = 'coparentai:data:v1'
export const DATA_VERSION = 2

/** Alternance de garde en cours, telle que convenue entre les parents. */
export const CUSTODY_ANCHOR_DATE = '2026-08-29'
export const CUSTODY_END_DATE = '2027-07-09'

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export const DEFAULT_CATEGORIES = [
  'Scolarité',
  'Cantine',
  'Activités extra-scolaires',
  'Vêtements',
  'Santé',
  'Transport',
  'Loisirs / sorties',
  'Téléphone',
  'Vacances',
  'Autre',
]

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    parents: {
      me: { id: 'me', name: 'Maman', color: '#4f46e5' },
      other: { id: 'other', name: 'Papa', color: '#0d9488' },
    },
    children: [
      { id: newId(), name: 'Maxime', color: '#e11d48' },
      { id: newId(), name: 'Mathis', color: '#f59e0b' },
    ],
    categories: [...DEFAULT_CATEGORIES],
    activities: [],
    events: [],
    custody: {
      mode: 'alternate-weekly',
      anchorDate: CUSTODY_ANCHOR_DATE,
      anchorParent: 'me',
      endDate: CUSTODY_END_DATE,
    },
    custodyOverrides: [],
    expenses: [],
    transfers: [],
  }
}

/** Ancienne forme des réglages de garde, fondée sur les numéros de semaine. */
interface LegacyCustody {
  mode?: CustodySettings['mode']
  evenWeekParent?: CustodySettings['anchorParent']
  changeoverWeekday?: number
}

function migrateCustody(
  raw: (Partial<CustodySettings> & LegacyCustody) | undefined,
  base: CustodySettings,
): CustodySettings {
  if (!raw?.anchorDate) {
    // Sauvegarde antérieure au passage à une date de référence : on repart
    // de l'alternance en cours, que l'utilisateur peut ajuster dans Réglages.
    return { ...base, mode: raw?.mode ?? base.mode }
  }
  return {
    mode: raw.mode ?? base.mode,
    anchorDate: raw.anchorDate,
    anchorParent: raw.anchorParent ?? base.anchorParent,
    endDate: raw.endDate,
  }
}

/** Les fréquences étaient calées sur les semaines paires/impaires ISO. */
const LEGACY_FREQUENCY: Record<string, Frequency> = {
  weekly: 'weekly',
  even: 'week-me',
  odd: 'week-other',
  'week-me': 'week-me',
  'week-other': 'week-other',
}

function migrateActivity(raw: Activity): Activity {
  return {
    ...raw,
    scope: raw.scope ?? (raw.kind === 'ecole' ? 'cours' : 'hors-cours'),
    frequency: LEGACY_FREQUENCY[raw.frequency] ?? 'weekly',
  }
}

/** Complète les champs manquants pour qu'une vieille sauvegarde reste lisible. */
function migrate(raw: Partial<AppData>): AppData {
  const base = emptyData()
  return {
    ...base,
    ...raw,
    version: DATA_VERSION,
    parents: { ...base.parents, ...(raw.parents ?? {}) },
    children: raw.children?.length ? raw.children : base.children,
    categories: raw.categories?.length ? raw.categories : base.categories,
    activities: (raw.activities ?? []).map(migrateActivity),
    events: raw.events ?? [],
    custody: migrateCustody(raw.custody, base.custody),
    custodyOverrides: raw.custodyOverrides ?? [],
    expenses: raw.expenses ?? [],
    transfers: raw.transfers ?? [],
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    return migrate(JSON.parse(raw))
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Sauvegarde impossible', err)
  }
}

/** Télécharge un fichier .json de sauvegarde. */
export function exportData(data: AppData): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coparentai-sauvegarde-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parseImported(text: string): AppData {
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Fichier illisible')
  }
  return migrate(parsed as Partial<AppData>)
}
