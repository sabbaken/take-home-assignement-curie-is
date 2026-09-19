import { ErrorState } from './error-state'
import { PdfPage } from './pdf-page'
import { useDocument } from './state/document'
import { useViewport } from './state/viewport'

export function DocumentStage() {
  const { error } = useDocument()
  const { stageRef } = useViewport()

  return (
    <div ref={stageRef} className="document-stage">
      {error !== null ? <ErrorState message={error} /> : <PdfPage />}
    </div>
  )
}
