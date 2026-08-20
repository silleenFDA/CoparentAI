import type { Activity, AppData, CustodySettings, Frequency } from '../types'
import { base64ToBlob, blobToBase64, getFile, putFile } from './files'

const STORAGE_KEY = 'coparentai:data:v1'
export const DATA_VERSION = 4

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
    allowances: [],
    transfers: [],
    documents: [],
    notes: [],
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
    allowances: raw.allowances ?? [],
    transfers: raw.transfers ?? [],
    documents: raw.documents ?? [],
    notes: raw.notes ?? [],
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

export type ExportResult = 'ok' | 'refuse' | 'erreur'

/** Enregistre le fichier via le navigateur, quand c'est possible. */
function saveViaBrowser(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Télécharge un fichier .json de sauvegarde.
 *
 * Publiée sur claude.ai, la page n'a pas le droit de déclencher elle-même un
 * téléchargement : elle doit le proposer au lecteur, qui confirme. Ailleurs
 * (serveur personnel, GitHub Pages), le lien de téléchargement classique
 * fonctionne. On essaie donc la première voie, et on retombe sur la seconde.
 */
/**
 * Une sauvegarde embarque les fichiers joints, encodés en texte : restaurer
 * un seul fichier doit tout ramener, sans quoi les documents disparaîtraient
 * silencieusement en changeant d'appareil. Le fichier est donc plus lourd —
 * c'est le prix d'une restauration complète.
 */
async function collectFiles(
  data: AppData,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  for (const doc of data.documents) {
    try {
      const blob = await getFile(doc.id)
      if (blob) files[doc.id] = await blobToBase64(blob)
    } catch (err) {
      console.error(`Fichier illisible pour « ${doc.title} »`, err)
    }
  }
  return files
}

export async function exportData(data: AppData): Promise<ExportResult> {
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `coparentai-sauvegarde-${stamp}.json`
  const json = JSON.stringify({ ...data, files: await collectFiles(data) }, null, 2)

  try {
    const downloads = await window.claude?.use('downloads')
    if (downloads) {
      await downloads.save({ filename, data: json })
      return 'ok'
    }
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === 'declined' || code === 'rate_limited') return 'refuse'
    console.error('Enregistrement refusé par l’hébergeur', err)
    return 'erreur'
  }

  try {
    saveViaBrowser(filename, json)
    return 'ok'
  } catch (err) {
    console.error('Téléchargement impossible', err)
    return 'erreur'
  }
}

/**
 * Relit une sauvegarde et remet les fichiers joints en place. Les fiches sans
 * fichier retrouvé sont écartées : mieux vaut un document absent qu'une entrée
 * qui promet un PDF introuvable.
 */
export async function parseImported(text: string): Promise<AppData> {
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Fichier illisible')
  }

  const { files, ...rest } = parsed as Partial<AppData> & {
    files?: Record<string, string>
  }
  const data = migrate(rest)

  if (!files) return data

  const restored: string[] = []
  for (const doc of data.documents) {
    const base64 = files[doc.id]
    if (!base64) continue
    try {
      await putFile(doc.id, base64ToBlob(base64, doc.mimeType))
      restored.push(doc.id)
    } catch (err) {
      console.error(`Restauration impossible pour « ${doc.title} »`, err)
    }
  }
  return { ...data, documents: data.documents.filter((d) => restored.includes(d.id)) }
}
