// ---------------------------------------------------------------------------
// Lecture d'un classeur .xlsx : on n'en tire que ce qui nous intéresse,
// à savoir un tableau de lignes et de colonnes.
// ---------------------------------------------------------------------------

import { lireZip, texteDe, zipSupporte } from './zip'

export interface Feuille {
  nom: string
  lignes: string[][]
}

/** "BC12" -> 54 (index de colonne, à partir de 0) */
function indexColonne(reference: string): number {
  const lettres = reference.match(/^[A-Z]+/)?.[0] ?? 'A'
  let n = 0
  for (const c of lettres) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

/**
 * Excel stocke les dates comme un nombre de jours. L'origine est le
 * 30/12/1899 : le décalage compense un bogue historique du tableur, qui
 * considère 1900 comme bissextile.
 */
export function dateExcel(serie: number): string | null {
  if (!Number.isFinite(serie) || serie < 1 || serie > 2_958_465) return null
  const ms = Date.UTC(1899, 11, 30) + Math.round(serie) * 86_400_000
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

function analyser(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

/** Les chaînes de caractères sont mises en commun dans un fichier à part. */
function lireChainesPartagees(xml: string): string[] {
  if (!xml) return []
  const doc = analyser(xml)
  return [...doc.getElementsByTagName('si')].map((si) =>
    [...si.getElementsByTagName('t')].map((t) => t.textContent ?? '').join(''),
  )
}

function lireFeuille(xml: string, chaines: string[]): string[][] {
  const doc = analyser(xml)
  const lignes: string[][] = []

  for (const ligne of doc.getElementsByTagName('row')) {
    const cellules: string[] = []
    for (const cellule of ligne.getElementsByTagName('c')) {
      const colonne = indexColonne(cellule.getAttribute('r') ?? 'A')
      const type = cellule.getAttribute('t')
      let valeur = ''

      if (type === 'inlineStr') {
        valeur = [...cellule.getElementsByTagName('t')]
          .map((t) => t.textContent ?? '')
          .join('')
      } else {
        const v = cellule.getElementsByTagName('v')[0]?.textContent ?? ''
        valeur = type === 's' ? (chaines[Number(v)] ?? '') : v
      }

      while (cellules.length < colonne) cellules.push('')
      cellules[colonne] = valeur.trim()
    }
    lignes.push(cellules)
  }

  // Les lignes entièrement vides ne portent aucune information.
  return lignes.filter((l) => l.some((c) => c !== ''))
}

export async function lireClasseur(buffer: ArrayBuffer): Promise<Feuille[]> {
  if (!zipSupporte()) {
    throw new Error(
      "Ce navigateur ne sait pas ouvrir les fichiers .xlsx. Depuis Excel, faites « Enregistrer sous » et choisissez CSV.",
    )
  }

  const entrees = await lireZip(buffer)
  const chaines = lireChainesPartagees(texteDe(entrees.get('xl/sharedStrings.xml')))

  // Les onglets sont nommés dans le classeur, mais leur fichier est désigné
  // indirectement : on passe par la table des relations pour les relier.
  const relations = new Map<string, string>()
  const relDoc = analyser(texteDe(entrees.get('xl/_rels/workbook.xml.rels')))
  for (const rel of relDoc.getElementsByTagName('Relationship')) {
    relations.set(rel.getAttribute('Id') ?? '', rel.getAttribute('Target') ?? '')
  }

  const feuilles: Feuille[] = []
  const wbDoc = analyser(texteDe(entrees.get('xl/workbook.xml')))
  for (const onglet of wbDoc.getElementsByTagName('sheet')) {
    const nom = onglet.getAttribute('name') ?? 'Feuille'
    const id =
      onglet.getAttribute('r:id') ??
      onglet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ??
      ''
    const cible = relations.get(id)
    if (!cible) continue
    const chemin = cible.startsWith('/')
      ? cible.slice(1)
      : `xl/${cible.replace(/^\.\//, '')}`
    const xml = texteDe(entrees.get(chemin))
    if (xml) feuilles.push({ nom, lignes: lireFeuille(xml, chaines) })
  }

  // Classeur inhabituel : on se rabat sur les feuilles trouvées telles quelles.
  if (feuilles.length === 0) {
    const noms = [...entrees.keys()]
      .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
      .sort()
    noms.forEach((k, i) =>
      feuilles.push({
        nom: `Feuille ${i + 1}`,
        lignes: lireFeuille(texteDe(entrees.get(k)), chaines),
      }),
    )
  }

  return feuilles.filter((f) => f.lignes.length > 0)
}
