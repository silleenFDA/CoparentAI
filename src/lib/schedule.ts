import type {
  Activity,
  AppData,
  CustodyOverride,
  CustodySettings,
  OneOffEvent,
  ParentId,
} from '../types'
import { addDays, compareTime, daysBetween, weekdayOf } from './dates'

export function otherParent(p: ParentId): ParentId {
  return p === 'me' ? 'other' : 'me'
}

/**
 * Premier jour de la semaine de garde contenant `iso`. Le jour de bascule
 * est celui de la date de référence : si l'alternance démarre un samedi,
 * chaque semaine de garde va du samedi au vendredi suivant.
 */
export function custodyWeekStart(iso: string, custody: CustodySettings): string {
  const shift = ((daysBetween(custody.anchorDate, iso) % 7) + 7) % 7
  return addDays(iso, -shift)
}

/**
 * Quel parent a les enfants ce jour-là ? `null` si le suivi est désactivé.
 * L'alternance se prolonge indéfiniment de part et d'autre de la date de
 * référence — c'est `custodyEnded` qui signale qu'il faut la remettre à jour.
 */
export function custodyParent(
  iso: string,
  custody: CustodySettings,
  overrides: CustodyOverride[],
): ParentId | null {
  const override = overrides.find((o) => o.date === iso)
  if (override) return override.parentId
  if (custody.mode === 'off') return null

  const weeks = Math.floor(daysBetween(custody.anchorDate, iso) / 7)
  // `%` garde le signe en JS : on le corrige pour les dates antérieures.
  const even = ((weeks % 2) + 2) % 2 === 0
  return even ? custody.anchorParent : otherParent(custody.anchorParent)
}

/** L'accord saisi est-il dépassé à cette date ? */
export function custodyEnded(iso: string, custody: CustodySettings): boolean {
  return Boolean(custody.endDate) && iso > custody.endDate!
}

/** L'activité récurrente a-t-elle lieu à cette date ? */
export function activityOccursOn(
  activity: Activity,
  iso: string,
  custody: CustodySettings,
  overrides: CustodyOverride[],
): boolean {
  if (!activity.active) return false
  if (activity.weekday !== weekdayOf(iso)) return false
  if (activity.frequency === 'weekly') return true

  // Une semaine sur deux : on suit le calendrier de garde.
  const parent = custodyParent(iso, custody, overrides)
  if (!parent) return false
  return activity.frequency === 'week-me' ? parent === 'me' : parent === 'other'
}

export interface DayItem {
  id: string
  source: 'activity' | 'event'
  childId: string
  title: string
  start?: string
  end?: string
  location?: string
  notes?: string
  driverId?: ParentId | null
  kind?: Activity['kind']
  scope?: Activity['scope']
}

/** Tout ce qui est prévu à une date, trié par heure. */
export function itemsForDay(data: AppData, iso: string): DayItem[] {
  const fromActivities: DayItem[] = data.activities
    .filter((a) => activityOccursOn(a, iso, data.custody, data.custodyOverrides))
    .map((a) => ({
      id: a.id,
      source: 'activity' as const,
      childId: a.childId,
      title: a.title,
      start: a.start,
      end: a.end,
      location: a.location,
      notes: a.notes,
      driverId: a.driverId,
      kind: a.kind,
      scope: a.scope,
    }))

  const fromEvents: DayItem[] = data.events
    .filter((e: OneOffEvent) => e.date === iso)
    .map((e) => ({
      id: e.id,
      source: 'event' as const,
      childId: e.childId,
      title: e.title,
      start: e.start,
      end: e.end,
      location: e.location,
      notes: e.notes,
    }))

  return [...fromActivities, ...fromEvents].sort((a, b) =>
    compareTime(a.start, b.start),
  )
}

/** Les N prochains jours qui contiennent au moins un élément. */
export function upcoming(
  data: AppData,
  fromIso: string,
  days: number,
): { date: string; items: DayItem[] }[] {
  const result: { date: string; items: DayItem[] }[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(fromIso, i)
    const items = itemsForDay(data, date)
    if (items.length) result.push({ date, items })
  }
  return result
}

export const ACTIVITY_SCOPE_LABEL: Record<Activity['scope'], string> = {
  cours: 'Cours',
  'hors-cours': 'Hors cours',
}

export const ACTIVITY_KIND_LABEL: Record<Activity['kind'], string> = {
  ecole: 'École',
  sport: 'Sport',
  musique: 'Musique / Art',
  sante: 'Santé',
  autre: 'Autre',
}

export const ACTIVITY_KIND_ICON: Record<Activity['kind'], string> = {
  ecole: '🎒',
  sport: '⚽',
  musique: '🎵',
  sante: '🩺',
  autre: '📌',
}
