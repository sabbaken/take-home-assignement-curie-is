import { type PDFDocumentProxy, TextLayer } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { PreciseRectStrategy } from '@/core/precise-rects'
import {
  findWordAtPoint,
  measurePageLayout,
  NaiveRectStrategy,
  type PageLayout,
} from '@/core/rects'
import type { PageTextModel } from '@/core/text-model'
import { HighlightOverlay } from './highlight-overlay'
import { useDocument } from './state/document'
import { type RectMode, useModes } from './state/modes'
import { usePageText } from './state/page-text'
import { usePlayer } from './state/player'
import { useViewport } from './state/viewport'

type MeasuredLayer = {
  pdf: PDFDocumentProxy
  pageNumber: number
  scale: number
  model: PageTextModel<TextItem>
  layouts: Record<RectMode, PageLayout>
}

// Renders the PDF.js TextLayer over the canvas and measures word and sentence rects with both
// strategies, so debug mode can show them together. The layer is rebuilt at every scale; the
// rects are relative to the layer, which covers the page.
export function PageTextLayer({ isCanvasRendered }: { isCanvasRendered: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { pdf } = useDocument()
  const { pageNumber, scale } = useViewport()
  const { textContent, model } = usePageText()
  const { seek } = usePlayer()
  const { rectMode } = useModes()
  const [measured, setMeasured] = useState<MeasuredLayer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    // The precise strategy measures with the fonts that PDF.js registers while it draws the
    // canvas, so measuring waits until the canvas for this page and scale is done.
    if (
      !isCanvasRendered ||
      pdf === null ||
      textContent === null ||
      model === null ||
      container === null
    ) {
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
            const naive = new NaiveRectStrategy(model, layer.textDivs, container)
            const precise = new PreciseRectStrategy(
              model,
              textContent.styles,
              viewport.transform,
              naive,
            )
            setMeasured({
              pdf,
              pageNumber,
              scale,
              model,
              layouts: {
                naive: measurePageLayout(model, naive),
                precise: measurePageLayout(model, precise),
              },
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
  }, [pdf, pageNumber, scale, textContent, model, isCanvasRendered])

  const layouts =
    measured !== null &&
    measured.pdf === pdf &&
    measured.pageNumber === pageNumber &&
    measured.scale === scale &&
    measured.model === model
      ? measured.layouts
      : null
  const layout = layouts?.[rectMode] ?? null

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
      <HighlightOverlay layouts={layouts} />
    </>
  )
}
