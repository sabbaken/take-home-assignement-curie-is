import type { ReactNode } from 'react'
import { DocumentContext, useDocumentState } from './state/document'
import { ModesContext, useModesState } from './state/modes'
import { PageTextContext, usePageTextState } from './state/page-text'
import { PlayerContext, usePlayerState } from './state/player'
import { useViewportState, ViewportContext } from './state/viewport'

// Each domain has its own context, so a change in one (e.g. the active word during playback)
// only re-renders the components that read that domain.
export function PdfViewerProvider({ children }: { children: ReactNode }) {
  const pdfDocument = useDocumentState()
  const viewport = useViewportState(pdfDocument.pdf)
  const pageText = usePageTextState(pdfDocument.pdf, viewport.pageNumber)
  const modes = useModesState()
  const player = usePlayerState({
    pdf: pdfDocument.pdf,
    pageNumber: viewport.pageNumber,
    pageCount: viewport.pageCount,
    goToPage: viewport.goToPage,
    model: pageText.model,
  })

  return (
    <DocumentContext value={pdfDocument}>
      <ViewportContext value={viewport}>
        <PageTextContext value={pageText}>
          <ModesContext value={modes}>
            <PlayerContext value={player}>{children}</PlayerContext>
          </ModesContext>
        </PageTextContext>
      </ViewportContext>
    </DocumentContext>
  )
}
