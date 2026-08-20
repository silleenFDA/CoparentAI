import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Activity, OneOffEvent } from '../types'
import { WEEKDAYS, formatLong, today } from '../lib/dates'
import { ACTIVITY_KIND_ICON } from '../lib/schedule'
import { Dot, Empty } from '../components/ui'
import ActivityForm from '../components/ActivityForm'
import EventForm from '../components/EventForm'

/** Cette vue ne traite que ce qui sort de l'emploi du temps scolaire. */
type Tab = 'hebdo' | 'ponctuels'

export default function Activities() {
  const { data, childName, childColor, meName, otherName } = useStore()
  const [tab, setTab] = useState<Tab>('hebdo')
  const [childFilter, setChildFilter] = useState('all')
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [editEvent, setEditEvent] = useState<OneOffEvent | null>(null)
  /**
   * Ajout en cours. Le brouillon suit la bascule entre « chaque semaine » et
   * « une seule fois » pour que la saisie déjà faite ne soit pas perdue.
   */
  const [adding, setAdding] = useState<'hebdo' | 'ponctuel' | null>(null)
  const [draft, setDraft] = useState<{ title: string; childId: string }>({
    title: '',
    childId: '',
  })

  function startAdding(type: 'hebdo' | 'ponctuel') {
    setDraft({ title: '', childId: childFilter === 'all' ? '' : childFilter })
    setAdding(type)
  }

  const horsCours = useMemo(
    () => data.activities.filter((a) => a.scope === 'hors-cours'),
    [data.activities],
  )

  const matchesChild = (id: string) => childFilter === 'all' || id === childFilter

  const byDay = useMemo(() => {
    if (tab === 'ponctuels') return []
    const groups = WEEKDAYS.map((_, i) => ({ weekday: i, items: [] as Activity[] }))
    for (const a of horsCours) {
      if (!matchesChild(a.childId)) continue
      groups[a.weekday].items.push(a)
    }
    groups.forEach((g) => g.items.sort((a, b) => a.start.localeCompare(b.start)))
    return groups.filter((g) => g.items.length > 0)
  }, [horsCours, tab, childFilter])

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
            Tout ce qui ne relève pas de l'emploi du temps scolaire, que ça revienne
            chaque semaine (ping-pong, piano) ou pas (rendez-vous médical, compétition).
          </div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => startAdding(tab === 'ponctuels' ? 'ponctuel' : 'hebdo')}
        >
          + Ajouter
        </button>
      </div>

      <div className="segment" style={{ marginBottom: 14 }}>
        <button className={tab === 'hebdo' ? 'on' : ''} onClick={() => setTab('hebdo')}>
          Chaque semaine ({horsCours.length})
        </button>
        <button
          className={tab === 'ponctuels' ? 'on' : ''}
          onClick={() => setTab('ponctuels')}
        >
          Rendez-vous ({data.events.length})
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
            Aucune activité enregistrée. Ajoutez ici les sports, cours de musique et
            trajets qui reviennent chaque semaine. Les cours du collège et du lycée,
            eux, se gèrent dans l'onglet Emploi du temps.
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
              <Empty>
                Aucun rendez-vous à venir. Médecin, orthodontiste, compétition,
                conseil de classe…
              </Empty>
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

      {adding === 'hebdo' && (
        <ActivityForm
          defaultScope="hors-cours"
          lockScope
          defaultChildId={draft.childId || undefined}
          defaultTitle={draft.title}
          onSwitchToOneOff={(d) => {
            setDraft(d)
            setAdding('ponctuel')
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {adding === 'ponctuel' && (
        <EventForm
          defaultChildId={draft.childId || undefined}
          defaultTitle={draft.title}
          onSwitchToWeekly={(d) => {
            setDraft(d)
            setAdding('hebdo')
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {editActivity && (
        <ActivityForm initial={editActivity} onClose={() => setEditActivity(null)} />
      )}
      {editEvent && <EventForm initial={editEvent} onClose={() => setEditEvent(null)} />}
    </>
  )
}
