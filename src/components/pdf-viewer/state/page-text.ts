import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api'
import { useEffect, useMemo, useState } from 'react'
import { buildPageTextModel, type PageTextModel } from '@/core/text-model'
import { createStrictContext } from './create-strict-context'

type PageText = {
  pdf: PDFDocumentProxy
  pageNumber: number
  // The TextLayer is rendered from this same object, so its spans line up with `model.items`.
  textContent: TextContent
  model: PageTextModel<TextItem>
}

const EMPTY_TEXT_CONTENT: TextContent = { items: [], styles: {}, lang: null }

function isTextItem(item: TextContent['items'][number]): item is TextItem {
  return 'str' in item
}

function createPageText(pdf: PDFDocumentProxy, pageNumber: number, textContent: TextContent) {
  const locale = textContent.lang ?? undefined
  const model = buildPageTextModel(textContent.items.filter(isTextItem), locale)
  return { pdf, pageNumber, textContent, model }
}

// The text does not depend on the zoom level, so it is extracted once per page. Rects are
// measured separately for every render scale.
export function usePageTextState(pdf: PDFDocumentProxy | null, pageNumber: number) {
  const [pageText, setPageText] = useState<PageText | null>(null)

  useEffect(() => {
    if (pdf === null) {
      return
    }

    let isActive = true

    pdf
      .getPage(pageNumber)
      .then(page => page.getTextContent())
      .then(
        textContent => {
          if (isActive) {
            setPageText(createPageText(pdf, pageNumber, textContent))
          }
        },
        () => {
          // A page whose text cannot be extracted behaves like a scan: nothing to read.
          if (isActive) {
            setPageText(createPageText(pdf, pageNumber, EMPTY_TEXT_CONTENT))
          }
        },
      )

    return () => {
      isActive = false
    }
  }, [pdf, pageNumber])

  // Derived like the loading state in `PdfPage`: text from another page or document is not current.
  const current =
    pageText !== null && pageText.pdf === pdf && pageText.pageNumber === pageNumber
      ? pageText
      : null

  return useMemo(
    () => ({
      textContent: current?.textContent ?? null,
      model: current?.model ?? null,
    }),
    [current],
  )
}

export const [PageTextContext, usePageText] =
  createStrictContext<ReturnType<typeof usePageTextState>>('usePageText')
