import type { AppData } from '../types'

const STORAGE_KEY = 'coparentai:data:v1'
export const DATA_VERSION = 1

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
      me: { id: 'me', name: 'Moi', color: '#4f46e5' },
      other: { id: 'other', name: 'Autre parent', color: '#0d9488' },
    },
    children: [
      { id: newId(), name: 'Ado 1', color: '#e11d48' },
      { id: newId(), name: 'Ado 2', color: '#f59e0b' },
    ],
    categories: [...DEFAULT_CATEGORIES],
    activities: [],
    events: [],
    custody: { mode: 'alternate-weekly', evenWeekParent: 'me', changeoverWeekday: 4 },
    custodyOverrides: [],
    expenses: [],
    transfers: [],
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
    activities: raw.activities ?? [],
    events: raw.events ?? [],
    custody: { ...base.custody, ...(raw.custody ?? {}) },
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
