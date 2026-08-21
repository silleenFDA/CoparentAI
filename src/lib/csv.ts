// ---------------------------------------------------------------------------
// Lecture d'un CSV, avec les habitudes françaises d'Excel : séparateur
// point-virgule, virgule décimale, et parfois un encodage Windows.
// ---------------------------------------------------------------------------

/**
 * Excel enregistre souvent en Windows-1252 : lu comme de l'UTF-8, le texte
 * se remplit de caractères de remplacement. On le détecte et on reprend la
 * lecture dans le bon encodage.
 */
export function decoder(buffer: ArrayBuffer): string {
  const octets = new Uint8Array(buffer)
  if (octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(octets.subarray(3))
  }
  const utf8 = new TextDecoder('utf-8').decode(octets)
  if (!utf8.includes('�')) return utf8
  try {
    return new TextDecoder('windows-1252').decode(octets)
  } catch {
    return utf8
  }
}

/** Le séparateur est celui qui revient le plus régulièrement d'une ligne à l'autre. */
export function detecterSeparateur(texte: string): string {
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10)
  let meilleur = ';'
  let meilleurScore = -1
  for (const sep of [';', ',', '\t', '|']) {
    const comptes = lignes.map((l) => l.split(sep).length - 1)
    const total = comptes.reduce((a, b) => a + b, 0)
    if (total === 0) continue
    const moyenne = total / comptes.length
    const ecart = comptes.reduce((a, c) => a + Math.abs(c - moyenne), 0)
    const score = moyenne - ecart // régulier et fréquent
    if (score > meilleurScore) {
      meilleurScore = score
      meilleur = sep
    }
  }
  return meilleur
}

/** Découpe en respectant les guillemets, qui peuvent contenir le séparateur. */
export function lireCsv(texte: string, separateur?: string): string[][] {
  const sep = separateur ?? detecterSeparateur(texte)
  const lignes: string[][] = []
  let champs: string[] = []
  let courant = ''
  let entreGuillemets = false

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]

    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          courant += '"'
          i++
        } else entreGuillemets = false
      } else courant += c
      continue
    }

    if (c === '"') entreGuillemets = true
    else if (c === sep) {
      champs.push(courant.trim())
      courant = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++
      champs.push(courant.trim())
      if (champs.some((x) => x !== '')) lignes.push(champs)
      champs = []
      courant = ''
    } else courant += c
  }

  champs.push(courant.trim())
  if (champs.some((x) => x !== '')) lignes.push(champs)
  return lignes
}
