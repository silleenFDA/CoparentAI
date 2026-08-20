import type {
  Activity,
  AppData,
  CustodyOverride,
  CustodySettings,
  OneOffEvent,
  ParentId,
} from '../types'
import { addDays, compareTime, isoWeekNumber, startOfWeek, weekdayOf } from './dates'

/**
 * Numéro de la "semaine de garde" contenant `iso`, en tenant compte du jour
 * de bascule. Si la bascule est le vendredi, la semaine de garde va du
 * vendredi au jeudi suivant.
 */
function custodyWeekNumber(iso: string, changeoverWeekday: number): number {
  const wd = weekdayOf(iso)
  const daysSinceChangeover = (wd - changeoverWeekday + 7) % 7
  const weekStart = addDays(iso, -daysSinceChangeover)
  return isoWeekNumber(weekStart)
}

/** Quel parent a les enfants ce jour-là ? `null` si le suivi est désactivé. */
export function custodyParent(
  iso: string,
  custody: CustodySettings,
  overrides: CustodyOverride[],
): ParentId | null {
  const override = overrides.find((o) => o.date === iso)
  if (override) return override.parentId
  if (custody.mode === 'off') return null

  const week = custodyWeekNumber(iso, custody.changeoverWeekday)
  const other: ParentId = custody.evenWeekParent === 'me' ? 'other' : 'me'
  return week % 2 === 0 ? custody.evenWeekParent : other
}

/** L'activité récurrente a-t-elle lieu à cette date ? */
export function activityOccursOn(activity: Activity, iso: string): boolean {
  if (!activity.active) return false
  if (activity.weekday !== weekdayOf(iso)) return false
  if (activity.frequency === 'weekly') return true
  const even = isoWeekNumber(startOfWeek(iso)) % 2 === 0
  return activity.frequency === 'even' ? even : !even
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
}

/** Tout ce qui est prévu à une date, trié par heure. */
export function itemsForDay(data: AppData, iso: string): DayItem[] {
  const fromActivities: DayItem[] = data.activities
    .filter((a) => activityOccursOn(a, iso))
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
