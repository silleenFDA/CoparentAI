import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Allowance, Expense, Transfer } from '../types'
import { formatMonth, formatShort, monthKey } from '../lib/dates'
import {
  allowanceById,
  balanceSentence,
  computeBalance,
  envelope,
  euros,
  expenseBalance,
  groupTotals,
  monthsPresent,
  round2,
} from '../lib/finance'
import { Empty, Stat } from '../components/ui'
import ExpenseForm from '../components/ExpenseForm'
import TransferForm from '../components/TransferForm'
import AllowanceForm, { ALLOWANCE_KINDS } from '../components/AllowanceForm'
import ImportExpenses from '../components/ImportExpenses'

const KIND_LABEL: Record<Transfer['kind'], string> = {
  remboursement: 'Remboursement',
  pension: 'Pension',
  autre: 'Autre',
}

export default function Finances() {
  const { data, childName, childColor, meName, otherName } = useStore()
  const [tab, setTab] = useState<
    'expenses' | 'allowances' | 'transfers' | 'summary'
  >('expenses')
  const [month, setMonth] = useState('all')
  const [child, setChild] = useState('all')
  const [category, setCategory] = useState('all')
  const [newExpense, setNewExpense] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [newTransfer, setNewTransfer] = useState(false)
  const [editTransfer, setEditTransfer] = useState<Transfer | null>(null)
  const [importing, setImporting] = useState(false)
  const [newAllowance, setNewAllowance] = useState(false)
  const [editAllowance, setEditAllowance] = useState<Allowance | null>(null)

  const months = useMemo(
    () => monthsPresent(data.expenses, data.transfers, data.allowances),
    [data.expenses, data.transfers, data.allowances],
  )

  const filteredExpenses = useMemo(
    () =>
      data.expenses
        .filter((e) => month === 'all' || monthKey(e.date) === month)
        .filter((e) => child === 'all' || e.childId === child)
        .filter((e) => category === 'all' || e.category === category)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.expenses, month, child, category],
  )

  const filteredTransfers = useMemo(
    () =>
      data.transfers
        .filter((t) => month === 'all' || monthKey(t.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.transfers, month],
  )

  /** Le solde global tient compte de TOUT l'historique, sans les filtres. */
  const globalBalance = useMemo(
    () => computeBalance(data.expenses, data.transfers, data.allowances),
    [data.expenses, data.transfers, data.allowances],
  )

  const filteredAllowances = useMemo(
    () =>
      data.allowances
        .filter((a) => month === 'all' || monthKey(a.date) === month)
        .filter((a) => child === 'all' || a.childId === child)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.allowances, month, child],
  )

  /** Les statistiques suivent, elles, les filtres choisis. */
  const view = useMemo(
    () => computeBalance(filteredExpenses, filteredTransfers, filteredAllowances),
    [filteredExpenses, filteredTransfers, filteredAllowances],
  )

  const byCategory = useMemo(
    () => groupTotals(filteredExpenses, (e) => e.category),
    [filteredExpenses],
  )
  const byChild = useMemo(
    () => groupTotals(filteredExpenses, (e) => childName(e.childId)),
    [filteredExpenses, childName],
  )
  const totalFiltered = round2(
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
  )
  /** Nombre de mois réellement couverts par les dépenses affichées. */
  const monthsCovered = useMemo(
    () => Math.max(1, new Set(filteredExpenses.map((e) => monthKey(e.date))).size),
    [filteredExpenses],
  )

  const tone =
    Math.abs(globalBalance.net) < 0.01
      ? ''
      : globalBalance.net > 0
        ? 'positive'
        : 'negative'

  const settleAmount = round2(Math.abs(globalBalance.net))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Finances</h1>
          <div className="sub">Dépenses partagées et versements entre parents.</div>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setImporting(true)}>
            ⬆ Importer
          </button>
          <button className="btn btn-sm" onClick={() => setNewAllowance(true)}>
            + Somme perçue
          </button>
          <button className="btn btn-sm" onClick={() => setNewTransfer(true)}>
            + Versement
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setNewExpense(true)}>
            + Dépense
          </button>
        </div>
      </div>

      <div className={`balance ${tone}`}>
        <div className="label">Solde global</div>
        <div className="amount">{euros(settleAmount)}</div>
        <div className="explain">
          {balanceSentence(globalBalance.net, otherName)}
        </div>
        {settleAmount >= 0.01 && (
          <button
            className="btn btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => setNewTransfer(true)}
          >
            Enregistrer un remboursement
          </button>
        )}
      </div>

      <div className="segment" style={{ marginBottom: 14 }}>
        <button
          className={tab === 'expenses' ? 'on' : ''}
          onClick={() => setTab('expenses')}
        >
          Dépenses
        </button>
        <button
          className={tab === 'allowances' ? 'on' : ''}
          onClick={() => setTab('allowances')}
        >
          Sommes perçues
        </button>
        <button
          className={tab === 'transfers' ? 'on' : ''}
          onClick={() => setTab('transfers')}
        >
          Versements
        </button>
        <button
          className={tab === 'summary' ? 'on' : ''}
          onClick={() => setTab('summary')}
        >
          Bilan
        </button>
      </div>

      <div className="filters">
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">Tous les mois</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </select>
        {tab !== 'transfers' && (
          <>
            <select value={child} onChange={(e) => setChild(e.target.value)}>
              <option value="all">Tous les enfants</option>
              {data.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Toutes les catégories</option>
              {data.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {tab === 'expenses' && (
        <div className="card">
          <div className="card-title">
            <h2>
              {filteredExpenses.length} dépense
              {filteredExpenses.length > 1 ? 's' : ''}
            </h2>
            <strong>{euros(totalFiltered)}</strong>
          </div>
          {filteredExpenses.length === 0 ? (
            <Empty>
              Aucune dépense pour ce filtre. Ajoutez-en une avec le bouton « + Dépense ».
            </Empty>
          ) : (
            <div className="list">
              {filteredExpenses.map((e) => {
                const impact = expenseBalance(e)
                return (
                  <button
                    key={e.id}
                    className="item"
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => setEditExpense(e)}
                  >
                    <span
                      className="stripe"
                      style={{ background: childColor(e.childId) }}
                    />
                    <div className="body">
                      <div className="title">{e.label}</div>
                      <div className="meta">
                        {formatShort(e.date)} · {e.category} · {childName(e.childId)} ·
                        payé par {e.paidBy === 'me' ? meName : otherName}
                        {allowanceById(data.allowances, e.allowanceId) &&
                          ` · sur « ${allowanceById(data.allowances, e.allowanceId)!.label} »`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="amount">{euros(e.amount)}</div>
                      <div
                        className="faint nowrap"
                        style={{
                          color:
                            Math.abs(impact) < 0.01
                              ? undefined
                              : impact > 0
                                ? 'var(--green)'
                                : 'var(--red)',
                        }}
                      >
                        {Math.abs(impact) < 0.01
                          ? 'neutre'
                          : impact > 0
                            ? `+${euros(impact)}`
                            : `−${euros(-impact)}`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          <p className="faint" style={{ marginTop: 12 }}>
            La colonne de droite indique l'effet sur le solde :{' '}
            <span style={{ color: 'var(--green)' }}>vert</span> = en votre faveur,{' '}
            <span style={{ color: 'var(--red)' }}>rouge</span> = en faveur de {otherName}.
          </p>
        </div>
      )}

      {tab === 'allowances' && (
        <div className="card">
          <div className="card-title">
            <h2>
              {filteredAllowances.length} somme
              {filteredAllowances.length > 1 ? 's' : ''} perçue
              {filteredAllowances.length > 1 ? 's' : ''}
            </h2>
            <strong>
              {euros(filteredAllowances.reduce((sum, a) => sum + a.amount, 0))}
            </strong>
          </div>

          {filteredAllowances.length === 0 ? (
            <Empty>
              Rien pour ce filtre. Enregistrez ici l'argent qui arrive de l'extérieur
              pour les enfants : allocation de rentrée, allocations familiales, bourse,
              remboursement de mutuelle.
            </Empty>
          ) : (
            <div className="list">
              {filteredAllowances.map((a) => {
                const env = envelope(a, data.expenses)
                const beneficiaire = a.receivedBy === 'me' ? meName : otherName
                return (
                  <div key={a.id} className="item" style={{ alignItems: 'flex-start' }}>
                    <span
                      className="stripe"
                      style={{ background: childColor(a.childId) }}
                    />
                    <div className="body">
                      <div className="title">{a.label}</div>
                      <div className="meta">
                        {formatShort(a.date)} · {ALLOWANCE_KINDS[a.kind]} ·{' '}
                        {childName(a.childId)} · perçue par {beneficiaire}
                      </div>

                      {env.expenseCount > 0 ? (
                        <div className="envelope">
                          <div className="envelope-line">
                            <span>Perçu</span>
                            <span>{euros(env.received)}</span>
                          </div>
                          <div className="envelope-line">
                            <span>
                              Dépensé ({env.expenseCount} dépense
                              {env.expenseCount > 1 ? 's' : ''})
                            </span>
                            <span>− {euros(env.spent)}</span>
                          </div>
                          <div className="envelope-line total">
                            <span>{env.remainder >= 0 ? 'Reliquat' : 'Dépassement'}</span>
                            <span>{euros(Math.abs(env.remainder))}</span>
                          </div>
                          <div
                            className="envelope-line"
                            style={{
                              color:
                                Math.abs(env.balance) < 0.01
                                  ? undefined
                                  : env.balance > 0
                                    ? 'var(--green)'
                                    : 'var(--red)',
                            }}
                          >
                            <span>
                              {Math.abs(env.balance) < 0.01
                                ? 'Rien à reverser'
                                : env.balance < 0
                                  ? `À reverser à ${otherName}`
                                  : `${otherName} vous doit`}
                            </span>
                            <span>
                              {Math.abs(env.balance) < 0.01
                                ? ''
                                : euros(Math.abs(env.balance))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="faint" style={{ marginTop: 6 }}>
                          Aucune dépense rattachée. Dans une dépense, choisissez cette
                          somme au champ « Payée avec une somme perçue ? » pour suivre
                          ce qu'il en reste.
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="amount">{euros(a.amount)}</div>
                      <button
                        className="icon-btn"
                        title="Modifier"
                        onClick={() => setEditAllowance(a)}
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p className="faint" style={{ marginTop: 12 }}>
            Une somme perçue fonctionne à l'envers d'une dépense : celui qui l'encaisse
            détient la part de l'autre, et les dépenses qu'on y rattache viennent la
            compenser. Le reliquat à reverser se calcule donc tout seul.
          </p>
        </div>
      )}

      {tab === 'transfers' && (
        <div className="card">
          <div className="card-title">
            <h2>
              {filteredTransfers.length} versement
              {filteredTransfers.length > 1 ? 's' : ''}
            </h2>
          </div>
          {filteredTransfers.length === 0 ? (
            <Empty>
              Aucun versement enregistré. Notez ici l'argent qui passe réellement d'un
              parent à l'autre : remboursements, pension…
            </Empty>
          ) : (
            <div className="list">
              {filteredTransfers.map((t) => (
                <button
                  key={t.id}
                  className="item"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setEditTransfer(t)}
                >
                  <span
                    className="stripe"
                    style={{
                      background: t.to === 'me' ? 'var(--green)' : 'var(--red)',
                    }}
                  />
                  <div className="body">
                    <div className="title">
                      {t.label || KIND_LABEL[t.kind]}
                      {!t.countsInBalance && (
                        <span className="chip" style={{ marginLeft: 6 }}>
                          hors solde
                        </span>
                      )}
                    </div>
                    <div className="meta">
                      {formatShort(t.date)} ·{' '}
                      {t.from === 'me' ? meName : otherName} →{' '}
                      {t.to === 'me' ? meName : otherName} · {KIND_LABEL[t.kind]}
                    </div>
                  </div>
                  <div
                    className="amount"
                    style={{ color: t.to === 'me' ? 'var(--green)' : 'var(--red)' }}
                  >
                    {t.to === 'me' ? '+' : '−'}
                    {euros(t.amount)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <>
          <div className="card">
            <div className="card-title">
              <h2>
                Bilan {month === 'all' ? '— tout l’historique' : `— ${formatMonth(month)}`}
              </h2>
            </div>
            <div className="grid grid-2">
              <Stat k="Total des dépenses" v={euros(totalFiltered)} />
              <Stat
                k={`Moyenne par mois (${monthsCovered} mois)`}
                v={euros(totalFiltered / monthsCovered)}
              />
              <Stat k="Avancé par vous" v={euros(view.totalPaidByMe)} />
              <Stat k={`Avancé par ${otherName}`} v={euros(view.totalPaidByOther)} />
              <Stat k="Votre part réelle" v={euros(view.myShareTotal)} />
              <Stat k={`Part réelle de ${otherName}`} v={euros(view.otherShareTotal)} />
              <Stat k="Reçu de l'autre parent" v={euros(view.transfersToMe)} />
              <Stat k={`Versé à ${otherName}`} v={euros(view.transfersToOther)} />
              <Stat k="Sommes perçues par vous" v={euros(view.allowancesToMe)} />
              <Stat
                k={`Sommes perçues par ${otherName}`}
                v={euros(view.allowancesToOther)}
              />
            </div>
            <p className="faint" style={{ marginTop: 12 }}>
              « Avancé » = l'argent réellement sorti de la poche. « Part réelle » = ce qui
              revient à chacun une fois la répartition appliquée. L'écart entre les deux,
              c'est le solde à rééquilibrer.
            </p>
          </div>

          <div className="card">
            <div className="card-title">
              <h2>Par catégorie</h2>
            </div>
            {byCategory.length === 0 ? (
              <Empty>Pas encore de données.</Empty>
            ) : (
              byCategory.map((g) => (
                <div key={g.key} className="bar-row">
                  <span className="name">{g.key}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width: `${totalFiltered ? (g.total / totalFiltered) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="val">{euros(g.total)}</span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-title">
              <h2>Par enfant</h2>
            </div>
            {byChild.length === 0 ? (
              <Empty>Pas encore de données.</Empty>
            ) : (
              byChild.map((g) => (
                <div key={g.key} className="bar-row">
                  <span className="name">{g.key}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width: `${totalFiltered ? (g.total / totalFiltered) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="val">{euros(g.total)}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {newExpense && <ExpenseForm onClose={() => setNewExpense(false)} />}
      {editExpense && (
        <ExpenseForm initial={editExpense} onClose={() => setEditExpense(null)} />
      )}
      {importing && <ImportExpenses onClose={() => setImporting(false)} />}
      {newAllowance && <AllowanceForm onClose={() => setNewAllowance(false)} />}
      {editAllowance && (
        <AllowanceForm initial={editAllowance} onClose={() => setEditAllowance(null)} />
      )}
      {newTransfer && <TransferForm onClose={() => setNewTransfer(false)} />}
      {editTransfer && (
        <TransferForm initial={editTransfer} onClose={() => setEditTransfer(null)} />
      )}
    </>
  )
}
