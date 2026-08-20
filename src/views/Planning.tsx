import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Activity, OneOffEvent } from '../types'
import {
  WEEKDAYS_SHORT,
  addDays,
  formatFull,
  formatShort,
  isToday,
  parseISO,
  today,
  weekdayOf,
} from '../lib/dates'
import {
  custodyEnded,
  custodyParent,
  custodyWeekStart,
  itemsForDay,
  type DayItem,
} from '../lib/schedule'
import { Dot, Empty } from '../components/ui'
import EventForm from '../components/EventForm'
import ImportTimetable from '../components/ImportTimetable'
import ActivityForm from '../components/ActivityForm'

/** Onglet actif : l'identifiant d'un enfant, ou la vue « hors cours ». */
type PlanningTab = string

export default function Planning() {
  const { data, update, childName, childColor, meName, otherName } = useStore()
  const [tab, setTab] = useState<PlanningTab>(
    () => data.children[0]?.id ?? 'hors-cours',
  )
  const [anchor, setAnchor] = useState(() =>
    custodyWeekStart(today(), data.custody),
  )
  const [newEventDate, setNewEventDate] = useState<string | null>(null)
  const [editEvent, setEditEvent] = useState<OneOffEvent | null>(null)
  const [importing, setImporting] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [newCourse, setNewCourse] = useState(false)

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor],
  )

  const isScopeTab = tab === 'hors-cours'

  /** Ne garder que ce que l'onglet courant doit montrer. */
  function visibleItems(date: string): DayItem[] {
    const items = itemsForDay(data, date)
    if (isScopeTab) {
      // Vue transversale : les activités hors cours des deux enfants,
      // plus les rendez-vous ponctuels, qui ne sont jamais des cours.
      return items.filter((it) => it.scope !== 'cours')
    }
    return items.filter((it) => it.childId === tab || it.childId === 'all')
  }

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

  const weekCustodian = custodyParent(anchor, data.custody, data.custodyOverrides)
  const showEndWarning = custodyEnded(anchor, data.custody)
  const lastDay = addDays(anchor, 6)
  const rangeLabel = `${formatShort(anchor)} – ${formatShort(lastDay)} ${parseISO(lastDay).getFullYear()}`

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Emploi du temps</h1>
          <div className="sub">
            {weekCustodian
              ? `Semaine chez ${weekCustodian === 'me' ? meName : otherName}`
              : 'La semaine des enfants'}
          </div>
        </div>
        <div className="row">
          {!isScopeTab && (
            <>
              <button className="btn btn-sm" onClick={() => setImporting(true)}>
                ⬆ Importer un .ics
              </button>
              <button className="btn btn-sm" onClick={() => setNewCourse(true)}>
                + Cours
              </button>
            </>
          )}
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setNewEventDate(today())}
          >
            + Événement
          </button>
        </div>
      </div>

      <div className="segment" style={{ marginBottom: 14 }}>
        {data.children.map((c) => (
          <button
            key={c.id}
            className={tab === c.id ? 'on' : ''}
            onClick={() => setTab(c.id)}
          >
            {c.name}
          </button>
        ))}
        <button
          className={isScopeTab ? 'on' : ''}
          onClick={() => setTab('hors-cours')}
        >
          Activités hors cours
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

      <div className="row" style={{ marginBottom: 14 }}>
        <button
          className="btn btn-sm"
          onClick={() => setAnchor(custodyWeekStart(today(), data.custody))}
        >
          Cette semaine
        </button>
        {isScopeTab && (
          <span className="faint">Les deux enfants, cours exclus.</span>
        )}
      </div>

      {showEndWarning && (
        <div className="callout">
          ⚠️ L'alternance saisie s'arrêtait au{' '}
          <strong>{formatFull(data.custody.endDate!)}</strong>. Elle continue à
          s'afficher au même rythme, mais pensez à la mettre à jour dans les réglages.
        </div>
      )}

      <div className="week">
        {days.map((date) => {
          const items = visibleItems(date)
          const custodian = custodyParent(date, data.custody, data.custodyOverrides)
          const overridden = data.custodyOverrides.some((o) => o.date === date)
          return (
            <div key={date} className={`day-col${isToday(date) ? ' today' : ''}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="dayname">{WEEKDAYS_SHORT[weekdayOf(date)]}</div>
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
                  {overridden && ' *'}
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
                    className={`slot${it.scope === 'cours' ? ' slot-cours' : ''}`}
                    style={{ borderLeftColor: childColor(it.childId) }}
                  >
                    <button
                      title="Modifier ce créneau"
                      onClick={() => {
                        if (it.source === 'event') {
                          const ev = data.events.find((e) => e.id === it.id)
                          if (ev) setEditEvent(ev)
                        } else {
                          const act = data.activities.find((a) => a.id === it.id)
                          if (act) setEditActivity(act)
                        }
                      }}
                    >
                      <div className="t">
                        {it.start ?? '—'}
                        {it.end ? `–${it.end}` : ''}
                      </div>
                      <div className="n">{it.title}</div>
                      <div className="l">
                        {isScopeTab ? `${childName(it.childId)} · ` : ''}
                        {it.location ?? ''}
                        {it.driverId
                          ? `${it.location ? ' · ' : ''}${it.driverId === 'me' ? meName : otherName} emmène`
                          : ''}
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
            Rien à afficher pour l'instant. Le plus rapide : importer l'emploi du temps
            scolaire depuis Pronote ou École Directe avec le bouton « Importer un .ics ».
            Les activités hors cours se saisissent dans l'onglet « Activités ».
          </Empty>
        </div>
      )}

      {data.custody.mode !== 'off' && (
        <p className="faint" style={{ marginTop: 14 }}>
          Astuces : cliquez sur un créneau pour le modifier ou le supprimer. Cliquez sur
          le nom d'un parent dans une journée pour inverser la garde ce jour-là
          (vacances, échange ponctuel…) ; un astérisque signale une exception.
        </p>
      )}

      {importing && (
        <ImportTimetable
          defaultChildId={isScopeTab ? undefined : tab}
          onClose={() => setImporting(false)}
        />
      )}
      {newEventDate && (
        <EventForm defaultDate={newEventDate} onClose={() => setNewEventDate(null)} />
      )}
      {editEvent && (
        <EventForm initial={editEvent} onClose={() => setEditEvent(null)} />
      )}
      {editActivity && (
        <ActivityForm initial={editActivity} onClose={() => setEditActivity(null)} />
      )}
      {newCourse && (
        <ActivityForm
          defaultScope="cours"
          defaultChildId={isScopeTab ? undefined : tab}
          onClose={() => setNewCourse(false)}
        />
      )}
    </>
  )
}
