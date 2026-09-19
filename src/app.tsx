import { TriangleAlert } from 'lucide-react'
import { PdfViewer } from '@/components/pdf-viewer'

function isSafari(userAgent: string) {
  return (
    /Safari/i.test(userAgent) &&
    !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|Android)/i.test(userAgent)
  )
}

export function App() {
  const showSafariWarning = isSafari(navigator.userAgent)

  return (
    <main className="app-shell">
      {showSafariWarning && (
        <aside className="browser-warning" role="alert">
          <TriangleAlert aria-hidden="true" />
          <p>
            <strong>Please use Google Chrome.</strong> Safari is not currently supported by this
            proof of concept.
          </p>
        </aside>
      )}
      <PdfViewer />
    </main>
  )
}
