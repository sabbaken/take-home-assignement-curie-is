import { UploadCloudIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDocument } from './state/document'

export function DropZone({ children }: { children: ReactNode }) {
  const { openFile } = useDocument()
  const [isDragging, setIsDragging] = useState(false)

  return (
    <section
      className={cn('viewer-shell', isDragging && 'is-dragging')}
      aria-label="PDF viewer"
      onDragEnter={event => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => {
        const nextTarget = event.relatedTarget
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setIsDragging(false)
        }
      }}
      onDrop={event => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files[0]
        if (file !== undefined) {
          openFile(file)
        }
      }}
    >
      {children}

      {isDragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <UploadCloudIcon />
            <p>Drop PDF to open</p>
            <span>The current document will be replaced</span>
          </div>
        </div>
      )}
    </section>
  )
}
