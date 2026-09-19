import { ErrorState } from './error-state'
import { PdfPage } from './pdf-page'
import { useDocument } from './state/document'
import { useViewport } from './state/viewport'
import { usePinchZoom } from './use-pinch-zoom'

export function DocumentStage() {
  const { error } = useDocument()
  const { stageRef } = useViewport()
  usePinchZoom()

  return (
    <div ref={stageRef} className="document-stage">
      {error !== null ? <ErrorState message={error} /> : <PdfPage />}
    </div>
  )
}
