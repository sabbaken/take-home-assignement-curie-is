import { DebugLegend } from './debug-legend'
import { DocumentPanel } from './document-panel'
import { DocumentStage } from './document-stage'
import { DropZone } from './drop-zone'
import { PdfFileInput } from './file-input'
import { ModesPanel } from './modes-panel'
import { PdfViewerProvider } from './pdf-viewer-provider'
import { PlayerPanel } from './player-panel'
import { ViewPanel } from './view-panel'

export function PdfViewer() {
  return (
    <PdfViewerProvider>
      <DropZone>
        <PdfFileInput />
        <DocumentPanel />
        <ModesPanel />
        <DocumentStage />
        <DebugLegend />
        <PlayerPanel />
        <ViewPanel />
      </DropZone>
    </PdfViewerProvider>
  )
}
