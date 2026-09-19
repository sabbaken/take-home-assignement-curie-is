import { RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageNavigation } from './page-navigation'
import { useDocument } from './state/document'
import { ZoomControls } from './zoom-controls'

export function ViewPanel() {
  const { source, openDefault } = useDocument()

  return (
    <div className="floating-panel view-panel">
      <PageNavigation />
      <span className="panel-divider" aria-hidden="true" />
      <ZoomControls />
      {source.kind !== 'default' && (
        <Button
          aria-label="Restore default PDF"
          onClick={openDefault}
          size="icon-sm"
          title="Restore default PDF"
          variant="ghost"
        >
          <RotateCcwIcon />
        </Button>
      )}
    </div>
  )
}
