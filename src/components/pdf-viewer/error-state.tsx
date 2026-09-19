import { FileTextIcon, FileUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OpenFileButton } from './file-input'
import { useDocument } from './state/document'

export function ErrorState({ message }: { message: string }) {
  const { openSample } = useDocument()

  return (
    <div className="empty-state" role="alert">
      <span className="empty-state-icon">
        <FileTextIcon />
      </span>
      <p>Couldn’t open this PDF</p>
      <span>{message}</span>
      <div className="empty-state-actions">
        <OpenFileButton size="sm">
          <FileUpIcon />
          Choose another
        </OpenFileButton>
        <Button onClick={openSample} size="sm" variant="outline">
          Open sample
        </Button>
      </div>
    </div>
  )
}
