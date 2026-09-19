import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useMemo, useReducer } from 'react'
import { createStrictContext } from './create-strict-context'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type DocumentSource =
  | { kind: 'default'; name: string; url: string }
  | { kind: 'file'; name: string; file: File }

type DocumentState =
  | { status: 'loading'; source: DocumentSource }
  | { status: 'ready'; source: DocumentSource; pdf: PDFDocumentProxy }
  | { status: 'error'; source: DocumentSource; error: string }

type DocumentAction =
  | { type: 'open'; source: DocumentSource }
  | { type: 'loaded'; pdf: PDFDocumentProxy }
  | { type: 'failed'; error: string }

// A fresh object on every call, so reopening the default document always triggers a reload.
function createDefaultSource(): DocumentSource {
  return {
    kind: 'default',
    name: 'Kiryl-Viarenich-Frontend.pdf',
    url: `${import.meta.env.BASE_URL}Kiryl-Viarenich-Frontend.pdf`,
  }
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'open':
      return { status: 'loading', source: action.source }
    case 'loaded':
      return state.status === 'loading'
        ? { status: 'ready', source: state.source, pdf: action.pdf }
        : state
    case 'failed':
      return { status: 'error', source: state.source, error: action.error }
  }
}

export function useDocumentState() {
  const [state, dispatch] = useReducer(documentReducer, undefined, () => ({
    status: 'loading' as const,
    source: createDefaultSource(),
  }))
  const { source } = state

  useEffect(() => {
    const url = source.kind === 'file' ? URL.createObjectURL(source.file) : source.url
    const loadingTask = getDocument({ url })
    let isActive = true

    loadingTask.promise.then(
      pdf => {
        if (isActive) {
          dispatch({ type: 'loaded', pdf })
        }
      },
      () => {
        if (isActive) {
          dispatch({ type: 'failed', error: 'The PDF could not be opened. Try another file.' })
        }
      },
    )

    return () => {
      isActive = false
      void loadingTask.destroy()
      if (source.kind === 'file') {
        URL.revokeObjectURL(url)
      }
    }
  }, [source])

  return useMemo(
    () => ({
      source: state.source,
      pdf: state.status === 'ready' ? state.pdf : null,
      error: state.status === 'error' ? state.error : null,
      openFile(file: File) {
        if (isPdf(file)) {
          dispatch({ type: 'open', source: { kind: 'file', name: file.name, file } })
        } else {
          dispatch({ type: 'failed', error: 'Choose a PDF file to continue.' })
        }
      },
      openDefault() {
        dispatch({ type: 'open', source: createDefaultSource() })
      },
    }),
    [state],
  )
}

export const [DocumentContext, useDocument] =
  createStrictContext<ReturnType<typeof useDocumentState>>('useDocument')
