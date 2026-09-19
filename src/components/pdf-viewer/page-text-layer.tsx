import { type PDFDocumentProxy, TextLayer } from 'pdfjs-dist'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import {
  findWordAtPoint,
  measurePageLayout,
  NaiveRectStrategy,
  type PageLayout,
} from '@/core/rects'
import type { PageTextModel } from '@/core/text-model'
import { HighlightOverlay } from './highlight-overlay'
import { useDocument } from './state/document'
import { usePageText } from './state/page-text'
import { usePlayer } from './state/player'
import { useViewport } from './state/viewport'

type MeasuredLayer = {
  pdf: PDFDocumentProxy
  pageNumber: number
  scale: number
  model: PageTextModel
  layout: PageLayout
}

// Renders the PDF.js TextLayer over the canvas and measures word and sentence rects on it. The
// layer is rebuilt at every scale; the rects are relative to the layer, which covers the page.
export function PageTextLayer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { pdf } = useDocument()
  const { pageNumber, scale } = useViewport()
  const { textContent, model } = usePageText()
  const { seek } = usePlayer()
  const [measured, setMeasured] = useState<MeasuredLayer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (pdf === null || textContent === null || model === null || container === null) {
      return
    }

    let isActive = true
    let textLayer: TextLayer | null = null

    pdf
      .getPage(pageNumber)
      .then(page => {
        if (!isActive) {
          return
        }

        const viewport = page.getViewport({ scale })
        container.style.setProperty(
          '--total-scale-factor',
          String(viewport.scale * viewport.userUnit),
        )
        const layer = new TextLayer({ textContentSource: textContent, container, viewport })
        textLayer = layer

        return layer.render().then(() => {
          if (isActive) {
            const strategy = new NaiveRectStrategy(model, layer.textDivs, container)
            setMeasured({
              pdf,
              pageNumber,
              scale,
              model,
              layout: measurePageLayout(model, strategy),
            })
          }
        })
      })
      // Cancelling rejects with an AbortException. Any other failure leaves the canvas without
      // highlights, which is the same state as a page that is still loading.
      .catch(() => {})

    return () => {
      isActive = false
      textLayer?.cancel()
      container.replaceChildren()
    }
  }, [pdf, pageNumber, scale, textContent, model])

  const layout =
    measured !== null &&
    measured.pdf === pdf &&
    measured.pageNumber === pageNumber &&
    measured.scale === scale &&
    measured.model === model
      ? measured.layout
      : null

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    // A drag that selected text is not a click on a word.
    if (layout === null || window.getSelection()?.isCollapsed === false) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const wordIndex = findWordAtPoint(layout.words, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
    seek(wordIndex, { play: true })
  }

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the arrow hotkeys move between words */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: clicks land on the PDF text spans */}
      <div ref={containerRef} className="text-layer" onClick={handleClick} />
      <HighlightOverlay layout={layout} />
    </>
  )
}
