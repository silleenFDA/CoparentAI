// ---------------------------------------------------------------------------
// Traduction d'un tableau (issu d'un .xlsx ou d'un .csv) en dépenses.
//
// On ne devine jamais en silence : chaque colonne reconnue reste modifiable,
// et chaque ligne refusée est expliquée.
// ---------------------------------------------------------------------------

import type { AppData, Expense, ID, ParentId } from '../types'
import { dateExcel } from './xlsx'
import { newId } from './storage'
import { round2 } from './finance'

export type Champ =
  | 'date'
  | 'label'
  | 'amount'
  | 'category'
  | 'child'
  | 'paidBy'
  | 'shareMe'
  | 'notes'

export const CHAMPS: { id: Champ; nom: string; requis: boolean }[] = [
  { id: 'date', nom: 'Date', requis: true },
  { id: 'label', nom: 'Libellé', requis: true },
  { id: 'amount', nom: 'Montant', requis: true },
  { id: 'category', nom: 'Catégorie', requis: false },
  { id: 'child', nom: 'Enfant', requis: false },
  { id: 'paidBy', nom: 'Payé par', requis: false },
  { id: 'shareMe', nom: 'Ma part (%)', requis: false },
  { id: 'notes', nom: 'Note', requis: false },
]

/** Mots-clés reconnus dans les en-têtes, pour proposer une correspondance. */
const INDICES: Record<Champ, string[]> = {
  date: ['date', 'jour', 'le'],
  label: ['libelle', 'libellé', 'intitule', 'intitulé', 'description', 'objet', 'depense', 'dépense', 'achat', 'nature'],
  amount: ['montant', 'prix', 'somme', 'cout', 'coût', 'total', 'euros', 'eur'],
  category: ['categorie', 'catégorie', 'type', 'poste', 'rubrique'],
  child: ['enfant', 'pour qui', 'concerne', 'beneficiaire', 'bénéficiaire'],
  paidBy: ['paye par', 'payé par', 'payeur', 'qui paye', 'qui a paye', 'regle par', 'réglé par', 'avance par'],
  shareMe: ['part', 'quote', 'pourcentage', '%', 'repartition', 'répartition'],
  notes: ['note', 'commentaire', 'remarque', 'precision', 'précision'],
}

function normaliser(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .trim()
}

/** Propose une colonne pour chaque champ, d'après les en-têtes. */
export function deviner(entetes: string[]): Partial<Record<Champ, number>> {
  const map: Partial<Record<Champ, number>> = {}
  const pris = new Set<number>()

  for (const champ of Object.keys(INDICES) as Champ[]) {
    const indices = INDICES[champ]
    let meilleur = -1
    let meilleurScore = 0
    entetes.forEach((entete, i) => {
      if (pris.has(i)) return
      const n = normaliser(entete)
      if (!n) return
      for (const indice of indices) {
        // Une correspondance exacte prime sur une simple inclusion.
        const score = n === indice ? 3 : n.includes(indice) ? 2 : 0
        if (score > meilleurScore) {
          meilleurScore = score
          meilleur = i
        }
      }
    })
    if (meilleur >= 0) {
      map[champ] = meilleur
      pris.add(meilleur)
    }
  }
  return map
}

/** Accepte 1 234,56 €, 1234.56, (12,00) pour un négatif… */
export function lireMontant(brut: string): number | null {
  if (!brut) return null
  let v = brut.replace(/[\s  ]/g, '').replace(/[€$]/g, '')
  const negatif = /^\(.*\)$/.test(v) || v.startsWith('-')
  v = v.replace(/[()-]/g, '')
  // Si les deux séparateurs sont présents, le dernier est le décimal.
  const derniereVirgule = v.lastIndexOf(',')
  const dernierPoint = v.lastIndexOf('.')
  if (derniereVirgule >= 0 && dernierPoint >= 0) {
    v =
      derniereVirgule > dernierPoint
        ? v.replace(/\./g, '').replace(',', '.')
        : v.replace(/,/g, '')
  } else if (derniereVirgule >= 0) {
    v = v.replace(',', '.')
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return null
  return round2(negatif ? -n : n)
}

/** Accepte 01/02/2026, 1-2-26, 2026-02-01, ou un numéro de série Excel. */
export function lireDate(brut: string): string | null {
  if (!brut) return null
  const v = brut.trim()

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const fr = v.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if (fr) {
    const [, j, m, a] = fr
    const annee = a.length === 2 ? 2000 + Number(a) : Number(a)
    const mois = Number(m)
    const jour = Number(j)
    if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null
    return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
  }

  if (/^\d+(\.\d+)?$/.test(v)) return dateExcel(Number(v))
  return null
}

export interface LigneImport {
  numero: number
  expense?: Expense
  erreur?: string
  /** Une dépense de même date, même libellé et même montant existe déjà. */
  doublon?: boolean
}

export interface ResultatImport {
  lignes: LigneImport[]
  valides: number
  refusees: number
  doublons: number
  categoriesNouvelles: string[]
}

/** Retrouve un parent d'après ce qui est écrit dans la colonne. */
function lireParent(brut: string, data: AppData): ParentId | null {
  const n = normaliser(brut)
  if (!n) return null
  if (['moi', 'me', 'moi-meme'].includes(n)) return 'me'
  if (normaliser(data.parents.me.name) === n) return 'me'
  if (normaliser(data.parents.other.name) === n) return 'other'
  if (normaliser(data.parents.me.name).startsWith(n) && n.length >= 3) return 'me'
  if (normaliser(data.parents.other.name).startsWith(n) && n.length >= 3) return 'other'
  return null
}

function lireEnfant(brut: string, data: AppData): ID | 'all' | null {
  const n = normaliser(brut)
  if (!n) return null
  if (['tous', 'les deux', 'famille', 'commun', 'all', '2'].includes(n)) return 'all'
  const enfant = data.children.find((c) => normaliser(c.name) === n)
  if (enfant) return enfant.id
  const partiel = data.children.filter(
    (c) => n.length >= 3 && normaliser(c.name).startsWith(n),
  )
  return partiel.length === 1 ? partiel[0].id : null
}

function lirePart(brut: string): number | null {
  if (!brut) return null
  const n = lireMontant(brut.replace('%', ''))
  if (n === null) return null
  // « 50 » comme « 0,5 » veulent dire la moitié.
  const fraction = n > 1 ? n / 100 : n
  return fraction >= 0 && fraction <= 1 ? fraction : null
}

export function construire(
  lignes: string[][],
  mapping: Partial<Record<Champ, number>>,
  data: AppData,
  defauts: { paidBy: ParentId; shareMe: number; category: string; childId: string },
): ResultatImport {
  const resultat: LigneImport[] = []
  const categoriesNouvelles = new Set<string>()
  // Empreinte des dépenses déjà enregistrées, pour repérer un second import.
  const empreinte = (d: string, l: string, m: number) =>
    `${d}|${normaliser(l)}|${m.toFixed(2)}`
  const existantes = new Set(
    data.expenses.map((e) => empreinte(e.date, e.label, e.amount)),
  )

  lignes.forEach((ligne, index) => {
    const numero = index + 2 // ligne 1 = en-têtes, comme dans le tableur
    const cellule = (champ: Champ) => {
      const col = mapping[champ]
      return col === undefined ? '' : (ligne[col] ?? '').trim()
    }

    const date = lireDate(cellule('date'))
    const label = cellule('label')
    const amount = lireMontant(cellule('amount'))

    if (!date && !label && amount === null) return // ligne vide
    if (!date) {
      resultat.push({ numero, erreur: `date illisible (« ${cellule('date')} »)` })
      return
    }
    if (!label) {
      resultat.push({ numero, erreur: 'libellé manquant' })
      return
    }
    if (amount === null || amount <= 0) {
      resultat.push({
        numero,
        erreur: `montant illisible ou nul (« ${cellule('amount')} »)`,
      })
      return
    }

    const categorieBrute = cellule('category')
    const categorie =
      data.categories.find((c) => normaliser(c) === normaliser(categorieBrute)) ??
      (categorieBrute ? categorieBrute : defauts.category)
    if (categorieBrute && !data.categories.includes(categorie)) {
      categoriesNouvelles.add(categorie)
    }

    resultat.push({
      numero,
      doublon: existantes.has(empreinte(date, label, amount)),
      expense: {
        id: newId(),
        date,
        label,
        amount,
        category: categorie,
        childId: lireEnfant(cellule('child'), data) ?? defauts.childId,
        paidBy: lireParent(cellule('paidBy'), data) ?? defauts.paidBy,
        shareMe: lirePart(cellule('shareMe')) ?? defauts.shareMe,
        notes: cellule('notes') || undefined,
      },
    })
  })

  return {
    lignes: resultat,
    valides: resultat.filter((l) => l.expense).length,
    refusees: resultat.filter((l) => l.erreur).length,
    doublons: resultat.filter((l) => l.doublon).length,
    categoriesNouvelles: [...categoriesNouvelles],
  }
}
