import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { OneOffEvent } from '../types'
import {
  WEEKDAYS_SHORT,
  addDays,
  formatShort,
  isToday,
  isoWeekNumber,
  parseISO,
  startOfWeek,
  today,
} from '../lib/dates'
import { custodyParent, itemsForDay } from '../lib/schedule'
import { Dot, Empty } from '../components/ui'
import EventForm from '../components/EventForm'

export default function Planning() {
  const { data, update, childName, childColor, meName, otherName } = useStore()
  const [anchor, setAnchor] = useState(() => startOfWeek(today()))
  const [childFilter, setChildFilter] = useState<string>('all')
  const [newEventDate, setNewEventDate] = useState<string | null>(null)
  const [editEvent, setEditEvent] = useState<OneOffEvent | null>(null)

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor],
  )

  const monday = parseISO(anchor)
  const sunday = parseISO(addDays(anchor, 6))
  const rangeLabel = `${formatShort(anchor)} – ${formatShort(addDays(anchor, 6))} ${sunday.getFullYear()}`

  function toggleCustody(date: string) {
    if (data.custody.mode === 'off') return
    const current = custodyParent(date, data.custody, data.custodyOverrides)
    const next = current === 'me' ? 'other' : 'me'
    update((d) => ({
      ...d,
      custodyOverrides: [
        ...d.custodyOverrides.filter((o) => o.date !== date),
        { date, parentId: next },
      ],
    }))
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Planning</h1>
          <div className="sub">
            Semaine {isoWeekNumber(anchor)} · {monday.getFullYear()}
          </div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setNewEventDate(today())}
        >
          + Événement
        </button>
      </div>

      <div className="week-nav">
        <button className="btn btn-sm" onClick={() => setAnchor(addDays(anchor, -7))}>
          ← Précédente
        </button>
        <span className="label">{rangeLabel}</span>
        <button className="btn btn-sm" onClick={() => setAnchor(addDays(anchor, 7))}>
          Suivante →
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
        <button className="btn btn-sm" onClick={() => setAnchor(startOfWeek(today()))}>
          Cette semaine
        </button>
      </div>

      <div className="week">
        {days.map((date, i) => {
          const items = itemsForDay(data, date).filter(
            (it) =>
              childFilter === 'all' ||
              it.childId === childFilter ||
              it.childId === 'all',
          )
          const custodian = custodyParent(date, data.custody, data.custodyOverrides)
          return (
            <div key={date} className={`day-col${isToday(date) ? ' today' : ''}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="dayname">{WEEKDAYS_SHORT[i]}</div>
                  <div className="daynum">{formatShort(date)}</div>
                </div>
                <button
                  className="icon-btn"
                  title="Ajouter un événement ce jour"
                  onClick={() => setNewEventDate(date)}
                >
                  ＋
                </button>
              </div>

              {custodian && (
                <button
                  className="chip"
                  style={{ marginTop: 6, border: 0 }}
                  title="Cliquer pour inverser la garde ce jour-là"
                  onClick={() => toggleCustody(date)}
                >
                  <Dot
                    color={
                      custodian === 'me'
                        ? data.parents.me.color
                        : data.parents.other.color
                    }
                  />
                  {custodian === 'me' ? meName : otherName}
                </button>
              )}

              {items.length === 0 ? (
                <div className="faint" style={{ marginTop: 8 }}>
                  —
                </div>
              ) : (
                items.map((it) => (
                  <div
                    key={`${it.source}-${it.id}`}
                    className="slot"
                    style={{ borderLeftColor: childColor(it.childId) }}
                  >
                    <button
                      onClick={() => {
                        if (it.source === 'event') {
                          const ev = data.events.find((e) => e.id === it.id)
                          if (ev) setEditEvent(ev)
                        }
                      }}
                    >
                      <div className="t">
                        {it.start ?? '—'}
                        {it.end ? `–${it.end}` : ''}
                      </div>
                      <div className="n">{it.title}</div>
                      <div className="l">
                        {childName(it.childId)}
                        {it.location ? ` · ${it.location}` : ''}
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {data.activities.length === 0 && data.events.length === 0 && (
        <div style={{ marginTop: 14 }}>
          <Empty>
            Le planning est vide. Commencez par ajouter les activités hebdomadaires dans
            l'onglet « Activités ».
          </Empty>
        </div>
      )}

      {data.custody.mode !== 'off' && (
        <p className="faint" style={{ marginTop: 14 }}>
          Astuce : cliquez sur le nom d'un parent dans une journée pour inverser la garde
          ce jour-là (vacances, échange ponctuel…).
        </p>
      )}

      {newEventDate && (
        <EventForm defaultDate={newEventDate} onClose={() => setNewEventDate(null)} />
      )}
      {editEvent && (
        <EventForm initial={editEvent} onClose={() => setEditEvent(null)} />
      )}
    </>
  )
}
