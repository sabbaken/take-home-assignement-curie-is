import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useViewport } from './state/viewport'

export function PageNavigation() {
  const { pageNumber, pageCount, goToPage } = useViewport()

  return (
    <fieldset className="page-navigation">
      <legend className="sr-only">Page navigation</legend>
      <Button
        aria-label="Previous page"
        disabled={pageNumber <= 1 || pageCount === 0}
        onClick={() => goToPage(pageNumber - 1)}
        size="icon-sm"
        variant="ghost"
      >
        <ChevronLeftIcon />
      </Button>
      {/* Keyed by the page so the draft resets whenever the page changes from outside. */}
      <PageInput key={pageNumber} pageNumber={pageNumber} onCommit={goToPage} />
      <span className="page-total">/ {pageCount || '—'}</span>
      <Button
        aria-label="Next page"
        disabled={pageNumber >= pageCount}
        onClick={() => goToPage(pageNumber + 1)}
        size="icon-sm"
        variant="ghost"
      >
        <ChevronRightIcon />
      </Button>
    </fieldset>
  )
}

function PageInput({
  pageNumber,
  onCommit,
}: {
  pageNumber: number
  onCommit: (pageNumber: number) => void
}) {
  const [draft, setDraft] = useState(String(pageNumber))

  function commit() {
    const parsedPage = Number.parseInt(draft, 10)
    if (!Number.isNaN(parsedPage)) {
      onCommit(parsedPage)
    }
    // Covers invalid input and out-of-range pages that clamp back to the current one.
    setDraft(String(pageNumber))
  }

  return (
    <input
      aria-label="Page number"
      className="page-input"
      inputMode="numeric"
      onBlur={commit}
      onChange={event => setDraft(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          commit()
          event.currentTarget.blur()
        }
      }}
      value={draft}
    />
  )
}
