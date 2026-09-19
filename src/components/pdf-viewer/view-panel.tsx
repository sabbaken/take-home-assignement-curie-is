import { RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageNavigation } from './page-navigation'
import { useDocument } from './state/document'
import { ZoomControls } from './zoom-controls'

export function ViewPanel() {
  const { source, openSample } = useDocument()

  return (
    <div className="floating-panel view-panel">
      <PageNavigation />
      <span className="panel-divider" aria-hidden="true" />
      <ZoomControls />
      {source.kind !== 'sample' && (
        <Button
          aria-label="Restore sample PDF"
          onClick={openSample}
          size="icon-sm"
          title="Restore sample PDF"
          variant="ghost"
        >
          <RotateCcwIcon />
        </Button>
      )}
    </div>
  )
}
