import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { TabId } from '../App'
import { addDays, formatLong, isToday, today } from '../lib/dates'
import { balanceSentence, computeBalance, euros } from '../lib/finance'
import { ACTIVITY_KIND_ICON, custodyParent, itemsForDay, upcoming } from '../lib/schedule'
import { Dot, Empty } from '../components/ui'
import ExpenseForm from '../components/ExpenseForm'
import EventForm from '../components/EventForm'

export default function Home({ goTo }: { goTo: (t: TabId) => void }) {
  const { data, childName, childColor, meName, otherName } = useStore()
  const [showExpense, setShowExpense] = useState(false)
  const [showEvent, setShowEvent] = useState(false)

  const now = today()
  const balance = useMemo(
    () => computeBalance(data.expenses, data.transfers),
    [data.expenses, data.transfers],
  )
  const todayItems = useMemo(() => itemsForDay(data, now), [data, now])
  const next = useMemo(() => upcoming(data, addDays(now, 1), 7), [data, now])
  const custodian = custodyParent(now, data.custody, data.custodyOverrides)

  const tone =
    Math.abs(balance.net) < 0.01 ? '' : balance.net > 0 ? 'positive' : 'negative'

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour 👋</h1>
          <div className="sub">{formatLong(now)}</div>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setShowEvent(true)}>
            + Événement
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setShowExpense(true)}>
            + Dépense
          </button>
        </div>
      </div>

      <button
        className={`balance ${tone}`}
        style={{ display: 'block', width: '100%', border: 'none', cursor: 'pointer' }}
        onClick={() => goTo('finances')}
      >
        <div className="label">Solde entre parents</div>
        <div className="amount">{euros(Math.abs(balance.net))}</div>
        <div className="explain">{balanceSentence(balance.net, otherName)}</div>
      </button>

      {custodian && (
        <div className="callout">
          🏠 Cette semaine, les enfants sont chez{' '}
          <strong>{custodian === 'me' ? meName : otherName}</strong>.
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <h2>Aujourd'hui</h2>
          <button className="btn btn-sm btn-ghost" onClick={() => goTo('planning')}>
            Voir la semaine →
          </button>
        </div>
        {todayItems.length === 0 ? (
          <Empty>Rien de prévu aujourd'hui.</Empty>
        ) : (
          <div className="list">
            {todayItems.map((item) => (
              <div key={`${item.source}-${item.id}`} className="item">
                <span
                  className="stripe"
                  style={{ background: childColor(item.childId) }}
                />
                <span className="time">{item.start ?? '—'}</span>
                <div className="body">
                  <div className="title">
                    {item.kind ? `${ACTIVITY_KIND_ICON[item.kind]} ` : '📌 '}
                    {item.title}
                  </div>
                  <div className="meta">
                    {childName(item.childId)}
                    {item.location ? ` · ${item.location}` : ''}
                    {item.driverId
                      ? ` · ${item.driverId === 'me' ? meName : otherName} emmène`
                      : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Les 7 prochains jours</h2>
        </div>
        {next.length === 0 ? (
          <Empty>
            Rien de prévu.{' '}
            <button className="btn btn-sm btn-ghost" onClick={() => goTo('activities')}>
              Ajouter les activités
            </button>
          </Empty>
        ) : (
          next.map((day) => (
            <div key={day.date} className="day-group">
              <div className={`day-head${isToday(day.date) ? ' is-today' : ''}`}>
                {formatLong(day.date)}
              </div>
              <div className="list">
                {day.items.map((item) => (
                  <div key={`${item.source}-${item.id}`} className="item">
                    <Dot color={childColor(item.childId)} />
                    <span className="time">{item.start ?? '—'}</span>
                    <div className="body">
                      <div className="title">{item.title}</div>
                      <div className="meta">
                        {childName(item.childId)}
                        {item.location ? ` · ${item.location}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showExpense && <ExpenseForm onClose={() => setShowExpense(false)} />}
      {showEvent && <EventForm onClose={() => setShowEvent(false)} />}
    </>
  )
}
