import type { Expense, ParentId, Transfer } from '../types'
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
}

export function computeBalance(
  expenses: Expense[],
  transfers: Transfer[],
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

  return {
    net: round2(net),
    totalPaidByMe: round2(totalPaidByMe),
    totalPaidByOther: round2(totalPaidByOther),
    myShareTotal: round2(myShareTotal),
    otherShareTotal: round2(otherShareTotal),
    transfersToMe: round2(transfersToMe),
    transfersToOther: round2(transfersToOther),
  }
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
export function monthsPresent(expenses: Expense[], transfers: Transfer[]): string[] {
  const set = new Set<string>()
  expenses.forEach((e) => set.add(monthKey(e.date)))
  transfers.forEach((t) => set.add(monthKey(t.date)))
  return [...set].sort().reverse()
}

export function paidByLabel(
  paidBy: ParentId,
  meName: string,
  otherName: string,
): string {
  return paidBy === 'me' ? meName : otherName
}
