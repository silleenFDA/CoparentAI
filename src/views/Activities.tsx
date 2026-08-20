import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Activity, OneOffEvent } from '../types'
import { WEEKDAYS, formatLong, today } from '../lib/dates'
import { ACTIVITY_KIND_ICON } from '../lib/schedule'
import { Dot, Empty } from '../components/ui'
import ActivityForm from '../components/ActivityForm'
import EventForm from '../components/EventForm'

export default function Activities() {
  const { data, childName, childColor, meName, otherName } = useStore()
  const [tab, setTab] = useState<'weekly' | 'oneoff'>('weekly')
  const [newActivity, setNewActivity] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [newEvent, setNewEvent] = useState(false)
  const [editEvent, setEditEvent] = useState<OneOffEvent | null>(null)

  const byDay = useMemo(() => {
    const groups: { weekday: number; items: Activity[] }[] = WEEKDAYS.map((_, i) => ({
      weekday: i,
      items: [],
    }))
    for (const a of data.activities) groups[a.weekday].items.push(a)
    groups.forEach((g) => g.items.sort((a, b) => a.start.localeCompare(b.start)))
    return groups.filter((g) => g.items.length > 0)
  }, [data.activities])

  const futureEvents = useMemo(() => {
    const now = today()
    return [...data.events]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((e) => e.date >= now)
  }, [data.events])

  const pastEvents = useMemo(() => {
    const now = today()
    return [...data.events]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((e) => e.date < now)
      .slice(0, 10)
  }, [data.events])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Activités</h1>
          <div className="sub">
            Les créneaux qui reviennent chaque semaine, et les rendez-vous ponctuels.
          </div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => (tab === 'weekly' ? setNewActivity(true) : setNewEvent(true))}
        >
          {tab === 'weekly' ? '+ Activité' : '+ Événement'}
        </button>
      </div>

      <div className="segment" style={{ marginBottom: 16 }}>
        <button
          className={tab === 'weekly' ? 'on' : ''}
          onClick={() => setTab('weekly')}
        >
          Chaque semaine ({data.activities.length})
        </button>
        <button
          className={tab === 'oneoff' ? 'on' : ''}
          onClick={() => setTab('oneoff')}
        >
          Ponctuels ({data.events.length})
        </button>
      </div>

      {tab === 'weekly' &&
        (byDay.length === 0 ? (
          <Empty>
            Aucune activité enregistrée. Ajoutez les cours, sports et trajets qui
            reviennent chaque semaine : ils apparaîtront automatiquement dans le planning.
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
                    style={{ textAlign: 'left', cursor: 'pointer', opacity: a.active ? 1 : 0.5 }}
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
                        {a.frequency !== 'weekly' &&
                          ` · semaines ${a.frequency === 'even' ? 'paires' : 'impaires'}`}
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

      {tab === 'oneoff' && (
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

      {newActivity && <ActivityForm onClose={() => setNewActivity(false)} />}
      {editActivity && (
        <ActivityForm initial={editActivity} onClose={() => setEditActivity(null)} />
      )}
      {newEvent && <EventForm onClose={() => setNewEvent(false)} />}
      {editEvent && <EventForm initial={editEvent} onClose={() => setEditEvent(null)} />}
    </>
  )
}
