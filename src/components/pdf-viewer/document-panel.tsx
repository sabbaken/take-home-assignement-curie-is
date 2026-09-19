import { FileTextIcon, FileUpIcon } from 'lucide-react'
import { OpenFileButton } from './file-input'
import { useDocument } from './state/document'
import { useViewport } from './state/viewport'

export function DocumentPanel() {
  const { source, error } = useDocument()
  const { pageCount } = useViewport()

  function getStatus() {
    if (error !== null) {
      return 'Failed to open'
    }
    if (pageCount === 0) {
      return 'Opening…'
    }
    return `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`
  }

  return (
    <div className="floating-panel document-panel">
      <span className="document-icon" aria-hidden="true">
        <FileTextIcon />
      </span>
      <div className="file-meta">
        <p title={source.name}>{source.name}</p>
        <span>{getStatus()}</span>
      </div>
      <span className="panel-divider" aria-hidden="true" />
      <OpenFileButton size="sm" variant="ghost">
        <FileUpIcon />
        Open PDF
      </OpenFileButton>
    </div>
  )
}
