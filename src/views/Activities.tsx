import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Activity, ActivityScope, OneOffEvent } from '../types'
import { WEEKDAYS, formatLong, today } from '../lib/dates'
import { ACTIVITY_KIND_ICON } from '../lib/schedule'
import { Dot, Empty } from '../components/ui'
import ActivityForm from '../components/ActivityForm'
import EventForm from '../components/EventForm'

type Tab = ActivityScope | 'ponctuels'

export default function Activities() {
  const { data, childName, childColor, meName, otherName } = useStore()
  const [tab, setTab] = useState<Tab>('cours')
  const [childFilter, setChildFilter] = useState('all')
  const [newActivity, setNewActivity] = useState<ActivityScope | null>(null)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [newEvent, setNewEvent] = useState(false)
  const [editEvent, setEditEvent] = useState<OneOffEvent | null>(null)

  const counts = useMemo(
    () => ({
      cours: data.activities.filter((a) => a.scope === 'cours').length,
      'hors-cours': data.activities.filter((a) => a.scope === 'hors-cours').length,
    }),
    [data.activities],
  )

  const matchesChild = (id: string) => childFilter === 'all' || id === childFilter

  const byDay = useMemo(() => {
    if (tab === 'ponctuels') return []
    const groups = WEEKDAYS.map((_, i) => ({ weekday: i, items: [] as Activity[] }))
    for (const a of data.activities) {
      if (a.scope !== tab || !matchesChild(a.childId)) continue
      groups[a.weekday].items.push(a)
    }
    groups.forEach((g) => g.items.sort((a, b) => a.start.localeCompare(b.start)))
    return groups.filter((g) => g.items.length > 0)
  }, [data.activities, tab, childFilter])

  const events = useMemo(
    () =>
      data.events.filter((e) => matchesChild(e.childId) || e.childId === 'all'),
    [data.events, childFilter],
  )
  const now = today()
  const futureEvents = [...events]
    .filter((e) => e.date >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
  const pastEvents = [...events]
    .filter((e) => e.date < now)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  function frequencyLabel(a: Activity): string {
    if (a.frequency === 'weekly') return ''
    return ` · semaines chez ${a.frequency === 'week-me' ? meName : otherName}`
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Activités</h1>
          <div className="sub">
            Saisissez ici les créneaux : ils remplissent l'emploi du temps
            automatiquement.
          </div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() =>
            tab === 'ponctuels' ? setNewEvent(true) : setNewActivity(tab)
          }
        >
          {tab === 'cours'
            ? '+ Cours'
            : tab === 'hors-cours'
              ? '+ Activité'
              : '+ Événement'}
        </button>
      </div>

      <div className="segment" style={{ marginBottom: 14 }}>
        <button className={tab === 'cours' ? 'on' : ''} onClick={() => setTab('cours')}>
          Cours ({counts.cours})
        </button>
        <button
          className={tab === 'hors-cours' ? 'on' : ''}
          onClick={() => setTab('hors-cours')}
        >
          Hors cours ({counts['hors-cours']})
        </button>
        <button
          className={tab === 'ponctuels' ? 'on' : ''}
          onClick={() => setTab('ponctuels')}
        >
          Ponctuels ({data.events.length})
        </button>
      </div>

      <div className="filters">
        <select value={childFilter} onChange={(e) => setChildFilter(e.target.value)}>
          <option value="all">Tous les enfants</option>
          {data.children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {tab !== 'ponctuels' &&
        (byDay.length === 0 ? (
          <Empty>
            {tab === 'cours'
              ? "Aucun cours enregistré. Le plus rapide : les importer depuis Pronote ou École Directe, avec le bouton « Importer un .ics » de l'onglet Emploi du temps."
              : 'Aucune activité enregistrée. Ajoutez les sports, cours de musique et trajets qui reviennent chaque semaine.'}
          </Empty>
        ) : (
          byDay.map((group) => (
            <div key={group.weekday} className="card">
              <div className="card-title">
                <h2>{WEEKDAYS[group.weekday]}</h2>
              </div>
              <div className="list">
                {group.items.map((a) => (
                  <button
                    key={a.id}
                    className="item"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      opacity: a.active ? 1 : 0.5,
                    }}
                    onClick={() => setEditActivity(a)}
                  >
                    <span
                      className="stripe"
                      style={{ background: childColor(a.childId) }}
                    />
                    <span className="time">{a.start}</span>
                    <div className="body">
                      <div className="title">
                        {ACTIVITY_KIND_ICON[a.kind]} {a.title}
                        {!a.active && ' (en pause)'}
                      </div>
                      <div className="meta">
                        {childName(a.childId)} · {a.start}–{a.end}
                        {a.location ? ` · ${a.location}` : ''}
                        {frequencyLabel(a)}
                        {a.driverId
                          ? ` · ${a.driverId === 'me' ? meName : otherName} emmène`
                          : ''}
                      </div>
                    </div>
                    <span className="icon-btn">✎</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        ))}

      {tab === 'ponctuels' && (
        <>
          <div className="card">
            <div className="card-title">
              <h2>À venir</h2>
            </div>
            {futureEvents.length === 0 ? (
              <Empty>Aucun rendez-vous à venir.</Empty>
            ) : (
              <div className="list">
                {futureEvents.map((e) => (
                  <button
                    key={e.id}
                    className="item"
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => setEditEvent(e)}
                  >
                    <Dot color={childColor(e.childId)} />
                    <div className="body">
                      <div className="title">{e.title}</div>
                      <div className="meta">
                        {formatLong(e.date)}
                        {e.start ? ` · ${e.start}` : ''} · {childName(e.childId)}
                        {e.location ? ` · ${e.location}` : ''}
                      </div>
                    </div>
                    <span className="icon-btn">✎</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {pastEvents.length > 0 && (
            <div className="card">
              <div className="card-title">
                <h2>Passés</h2>
              </div>
              <div className="list">
                {pastEvents.map((e) => (
                  <button
                    key={e.id}
                    className="item"
                    style={{ textAlign: 'left', cursor: 'pointer', opacity: 0.65 }}
                    onClick={() => setEditEvent(e)}
                  >
                    <Dot color={childColor(e.childId)} />
                    <div className="body">
                      <div className="title">{e.title}</div>
                      <div className="meta">
                        {formatLong(e.date)} · {childName(e.childId)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {newActivity && (
        <ActivityForm
          defaultScope={newActivity}
          defaultChildId={childFilter === 'all' ? undefined : childFilter}
          onClose={() => setNewActivity(null)}
        />
      )}
      {editActivity && (
        <ActivityForm initial={editActivity} onClose={() => setEditActivity(null)} />
      )}
      {newEvent && <EventForm onClose={() => setNewEvent(false)} />}
      {editEvent && <EventForm initial={editEvent} onClose={() => setEditEvent(null)} />}
    </>
  )
}
