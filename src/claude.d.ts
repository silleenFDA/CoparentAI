// L'application peut être hébergée telle quelle (serveur, GitHub Pages) ou
// publiée comme page claude.ai. Dans ce second cas, le téléchargement d'un
// fichier passe obligatoirement par le lecteur, qui demande confirmation.
// Ces déclarations décrivent le peu dont nous avons besoin de cette interface.
interface ClaudeDownloads {
  save(request: {
    filename: string
    data: string | Blob | ArrayBuffer
  }): Promise<{ status: 'saved' }>
}

interface ClaudeRuntime {
  use(name: 'downloads'): Promise<ClaudeDownloads | null>
}

interface Window {
  claude?: ClaudeRuntime
}
