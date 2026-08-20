// Assemble le résultat du build en un seul fichier HTML autonome.
// Sert à publier l'application là où l'on ne peut déposer qu'une page.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const assets = readdirSync(join(dist, 'assets'))
const css = readFileSync(join(dist, 'assets', assets.find((f) => f.endsWith('.css'))), 'utf8')
const js = readFileSync(join(dist, 'assets', assets.find((f) => f.endsWith('.js'))), 'utf8')

const out = `<title>CoparentAI</title>
<meta name="theme-color" content="#4f46e5">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`

const target = process.argv[2] ?? 'dist/coparentai.html'
writeFileSync(target, out)
console.log(`${target} — ${(out.length / 1024).toFixed(0)} Ko`)
