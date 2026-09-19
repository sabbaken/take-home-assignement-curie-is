import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { useDocument } from './state/document'

const FILE_INPUT_ID = 'pdf-upload'

export function PdfFileInput() {
  const { openFile } = useDocument()

  return (
    <input
      id={FILE_INPUT_ID}
      className="sr-only"
      type="file"
      accept="application/pdf,.pdf"
      onChange={event => {
        const file = event.target.files?.[0]
        if (file !== undefined) {
          openFile(file)
        }
        event.target.value = ''
      }}
    />
  )
}

export function OpenFileButton({
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'asChild'>) {
  return (
    <Button asChild {...props}>
      <label htmlFor={FILE_INPUT_ID}>{children}</label>
    </Button>
  )
}
