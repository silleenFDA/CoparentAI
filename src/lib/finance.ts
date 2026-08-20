import type { Allowance, Expense, ID, ParentId, Transfer } from '../types'
import { monthKey } from './dates'

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function euros(n: number): string {
  return round2(n).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })
}

/**
 * Pour une dépense, ce que l'autre parent me doit (ou ce que je lui dois).
 * Résultat positif = en ma faveur.
 */
export function expenseBalance(e: Expense): number {
  const shareOther = 1 - e.shareMe
  return e.paidBy === 'me'
    ? e.amount * shareOther // j'ai avancé sa part
    : -e.amount * e.shareMe // il a avancé ma part
}

/**
 * Miroir d'une dépense : encaisser une somme qui revient aux deux, c'est
 * détenir la part de l'autre. Résultat positif = en ma faveur.
 */
export function allowanceBalance(a: Allowance): number {
  const shareOther = 1 - a.shareMe
  return a.receivedBy === 'me'
    ? -a.amount * shareOther // je détiens sa part
    : a.amount * a.shareMe // il détient la mienne
}

/** Résultat positif = en ma faveur (l'argent est arrivé chez l'autre). */
export function transferBalance(t: Transfer): number {
  if (!t.countsInBalance) return 0
  if (t.from === 'me' && t.to === 'other') return t.amount
  if (t.from === 'other' && t.to === 'me') return -t.amount
  return 0
}

export interface Balance {
  /** > 0 : l'autre parent me doit. < 0 : je dois à l'autre parent. */
  net: number
  totalPaidByMe: number
  totalPaidByOther: number
  myShareTotal: number
  otherShareTotal: number
  transfersToMe: number
  transfersToOther: number
  allowancesToMe: number
  allowancesToOther: number
}

export function computeBalance(
  expenses: Expense[],
  transfers: Transfer[],
  allowances: Allowance[] = [],
): Balance {
  let net = 0
  let totalPaidByMe = 0
  let totalPaidByOther = 0
  let myShareTotal = 0
  let otherShareTotal = 0

  for (const e of expenses) {
    net += expenseBalance(e)
    if (e.paidBy === 'me') totalPaidByMe += e.amount
    else totalPaidByOther += e.amount
    myShareTotal += e.amount * e.shareMe
    otherShareTotal += e.amount * (1 - e.shareMe)
  }

  let transfersToMe = 0
  let transfersToOther = 0
  for (const t of transfers) {
    net += transferBalance(t)
    if (t.to === 'me') transfersToMe += t.amount
    else transfersToOther += t.amount
  }

  let allowancesToMe = 0
  let allowancesToOther = 0
  for (const a of allowances) {
    net += allowanceBalance(a)
    if (a.receivedBy === 'me') allowancesToMe += a.amount
    else allowancesToOther += a.amount
  }

  return {
    net: round2(net),
    totalPaidByMe: round2(totalPaidByMe),
    totalPaidByOther: round2(totalPaidByOther),
    myShareTotal: round2(myShareTotal),
    otherShareTotal: round2(otherShareTotal),
    transfersToMe: round2(transfersToMe),
    transfersToOther: round2(transfersToOther),
    allowancesToMe: round2(allowancesToMe),
    allowancesToOther: round2(allowancesToOther),
  }
}

/**
 * L'aide vue comme une enveloppe : ce qui est entré, ce qui en a été
 * dépensé, ce qu'il en reste.
 *
 * `balance` ne se déduit pas du reliquat mais des contributions réelles au
 * solde : les deux coïncident quand l'aide et les dépenses se partagent de
 * la même façon, et seul ce calcul-ci reste juste quand ce n'est pas le cas.
 */
export interface Envelope {
  received: number
  spent: number
  remainder: number
  /** > 0 : l'autre parent me doit. < 0 : je dois à l'autre parent. */
  balance: number
  expenseCount: number
}

export function envelope(allowance: Allowance, expenses: Expense[]): Envelope {
  const linked = expenses.filter((e) => e.allowanceId === allowance.id)
  const spent = sumBy(linked, (e) => e.amount)
  return {
    received: round2(allowance.amount),
    spent,
    remainder: round2(allowance.amount - spent),
    balance: round2(
      allowanceBalance(allowance) + linked.reduce((s, e) => s + expenseBalance(e), 0),
    ),
    expenseCount: linked.length,
  }
}

export function allowanceById(allowances: Allowance[], id?: ID): Allowance | null {
  return id ? (allowances.find((a) => a.id === id) ?? null) : null
}

/**
 * Phrase lisible expliquant le solde. On s'adresse toujours à la deuxième
 * personne : l'utilisateur est forcément le parent « me ».
 */
export function balanceSentence(net: number, otherName: string): string {
  const v = round2(net)
  if (Math.abs(v) < 0.01) return 'Vous êtes à l’équilibre. Rien à rembourser.'
  return v > 0
    ? `${otherName} vous doit ${euros(v)}.`
    : `Vous devez ${euros(-v)} à ${otherName}.`
}

export function sumBy<T>(items: T[], f: (x: T) => number): number {
  return round2(items.reduce((acc, x) => acc + f(x), 0))
}

export interface GroupTotal {
  key: string
  total: number
  count: number
}

export function groupTotals(
  expenses: Expense[],
  keyOf: (e: Expense) => string,
): GroupTotal[] {
  const map = new Map<string, GroupTotal>()
  for (const e of expenses) {
    const key = keyOf(e)
    const cur = map.get(key) ?? { key, total: 0, count: 0 }
    cur.total += e.amount
    cur.count += 1
    map.set(key, cur)
  }
  return [...map.values()]
    .map((g) => ({ ...g, total: round2(g.total) }))
    .sort((a, b) => b.total - a.total)
}

/** Tous les mois présents dans les données, du plus récent au plus ancien. */
export function monthsPresent(
  expenses: Expense[],
  transfers: Transfer[],
  allowances: Allowance[] = [],
): string[] {
  const set = new Set<string>()
  expenses.forEach((e) => set.add(monthKey(e.date)))
  transfers.forEach((t) => set.add(monthKey(t.date)))
  allowances.forEach((a) => set.add(monthKey(a.date)))
  return [...set].sort().reverse()
}

export function paidByLabel(
  paidBy: ParentId,
  meName: string,
  otherName: string,
): string {
  return paidBy === 'me' ? meName : otherName
}
