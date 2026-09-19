import {
  Bug,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  Gauge,
  HelpCircle,
  LoaderCircle,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipBack,
  SkipForward,
  Square,
  StepBack,
  StepForward,
  Timer,
  UploadCloud,
  X,
} from 'lucide-react'
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist'
import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25
const DEFAULT_PDF_URL = `${import.meta.env.BASE_URL}sample.pdf`
const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type RectMode = 'naive' | 'precise'

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function PdfViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const uploadedUrlRef = useRef<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState(DEFAULT_PDF_URL)
  const [fileName, setFileName] = useState('sample.pdf')
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [scale, setScale] = useState(1)
  const [mode, setMode] = useState<RectMode>('precise')
  const [isDebug, setIsDebug] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoadingDocument, setIsLoadingDocument] = useState(true)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadingTask = getDocument({ url: documentUrl })
    let isActive = true

    loadingTask.promise
      .then(loadedPdf => {
        if (isActive) {
          setIsRendering(true)
          setPdf(loadedPdf)
          setIsLoadingDocument(false)
        }
      })
      .catch(() => {
        if (isActive) {
          setError('The PDF could not be opened. Try another file.')
          setIsLoadingDocument(false)
        }
      })

    return () => {
      isActive = false
      void loadingTask.destroy()
    }
  }, [documentUrl])

  useEffect(() => {
    if (pdf === null || canvasRef.current === null) {
      return
    }

    let isActive = true
    let renderTask: RenderTask | null = null

    void pdf
      .getPage(pageNumber)
      .then(page => {
        if (!isActive || canvasRef.current === null) {
          return
        }

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (context === null) {
          throw new Error('Canvas is not supported')
        }

        const viewport = page.getViewport({ scale })
        const outputScale = window.devicePixelRatio || 1

        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        renderTask = page.render({
          canvas,
          canvasContext: context,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        })

        return renderTask.promise
      })
      .then(() => {
        if (isActive) {
          setIsRendering(false)
        }
      })
      .catch(renderError => {
        if (
          isActive &&
          renderError instanceof Error &&
          renderError.name !== 'RenderingCancelledException'
        ) {
          setError('This page could not be rendered.')
          setIsRendering(false)
        }
      })

    return () => {
      isActive = false
      renderTask?.cancel()
    }
  }, [pageNumber, pdf, scale])

  useEffect(
    () => () => {
      if (uploadedUrlRef.current !== null) {
        URL.revokeObjectURL(uploadedUrlRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        setIsPlaying(current => !current)
      } else if (event.key.toLowerCase() === 'd') {
        setIsDebug(current => !current)
      } else if (event.key.toLowerCase() === 'n') {
        setMode(current => (current === 'naive' ? 'precise' : 'naive'))
      } else if (event.key === '+' || event.key === '=') {
        setIsRendering(true)
        setScale(current => Math.min(MAX_SCALE, current + SCALE_STEP))
      } else if (event.key === '-') {
        setIsRendering(true)
        setScale(current => Math.max(MIN_SCALE, current - SCALE_STEP))
      } else if (event.key === '?') {
        setIsShortcutsOpen(current => !current)
      } else if (event.key === 'Escape') {
        setIsPlaying(false)
        setIsSettingsOpen(false)
        setIsShortcutsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function loadFile(file: File) {
    if (!isPdf(file)) {
      setError('Choose a PDF file to continue.')
      return
    }

    if (uploadedUrlRef.current !== null) {
      URL.revokeObjectURL(uploadedUrlRef.current)
    }

    const nextUrl = URL.createObjectURL(file)
    uploadedUrlRef.current = nextUrl
    setError(null)
    setPdf(null)
    setPageNumber(1)
    setPageInput('1')
    setIsLoadingDocument(true)
    setFileName(file.name)
    setDocumentUrl(nextUrl)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file !== undefined) {
      loadFile(file)
    }
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file !== undefined) {
      loadFile(file)
    }
  }

  function restoreSample() {
    if (uploadedUrlRef.current !== null) {
      URL.revokeObjectURL(uploadedUrlRef.current)
      uploadedUrlRef.current = null
    }

    setFileName('sample.pdf')
    setError(null)
    setPdf(null)
    setPageNumber(1)
    setPageInput('1')
    setIsLoadingDocument(true)
    setDocumentUrl(`${DEFAULT_PDF_URL}?retry=${Date.now()}`)
  }

  function goToPage(nextPage: number) {
    if (pdf === null) {
      return
    }

    const safePage = Math.min(pdf.numPages, Math.max(1, nextPage))
    setIsRendering(true)
    setPageNumber(safePage)
    setPageInput(String(safePage))
  }

  function commitPageInput() {
    const parsedPage = Number.parseInt(pageInput, 10)
    if (Number.isNaN(parsedPage)) {
      setPageInput(String(pageNumber))
      return
    }
    goToPage(parsedPage)
  }

  async function fitPageToWidth() {
    if (pdf === null || stageRef.current === null) {
      return
    }

    const page = await pdf.getPage(pageNumber)
    const baseViewport = page.getViewport({ scale: 1 })
    const availableWidth = Math.max(320, stageRef.current.clientWidth - 96)
    setIsRendering(true)
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, availableWidth / baseViewport.width)))
  }

  const pageCount = pdf?.numPages ?? 0

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
      onDrop={handleDrop}
    >
      <input
        id="pdf-upload"
        className="sr-only"
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
      />

      <div className="floating-panel document-panel">
        <span className="document-icon" aria-hidden="true">
          <FileText />
        </span>
        <div className="file-meta">
          <p title={fileName}>{fileName}</p>
          <span>
            {pageCount > 0 ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}` : 'Opening…'}
          </span>
        </div>
        <span className="panel-divider" aria-hidden="true" />
        <Button asChild size="sm" variant="ghost">
          <label htmlFor="pdf-upload">
            <FileUp />
            Open PDF
          </label>
        </Button>
      </div>

      <div className="floating-panel modes-panel">
        <fieldset className="segmented-control">
          <legend className="sr-only">Rectangle strategy</legend>
          <Button
            aria-pressed={mode === 'naive'}
            className={cn(mode === 'naive' && 'is-active')}
            onClick={() => setMode('naive')}
            size="sm"
            variant="ghost"
          >
            Naive
          </Button>
          <Button
            aria-pressed={mode === 'precise'}
            className={cn(mode === 'precise' && 'is-active')}
            onClick={() => setMode('precise')}
            size="sm"
            variant="ghost"
          >
            Precise
          </Button>
        </fieldset>
        <span className="panel-divider" aria-hidden="true" />
        <Button
          aria-label="Toggle debug outlines"
          aria-pressed={isDebug}
          className={cn('debug-button', isDebug && 'is-active')}
          onClick={() => setIsDebug(current => !current)}
          size="sm"
          title="Debug outlines (D)"
          variant="ghost"
        >
          <Bug />
          Debug
        </Button>
        <Button
          aria-label="Reader settings"
          aria-expanded={isSettingsOpen}
          onClick={() => {
            setIsSettingsOpen(current => !current)
            setIsShortcutsOpen(false)
          }}
          size="icon"
          title="Reader settings"
          variant="ghost"
        >
          <Settings2 />
        </Button>
        <Button
          aria-label="Keyboard shortcuts"
          aria-expanded={isShortcutsOpen}
          onClick={() => {
            setIsShortcutsOpen(current => !current)
            setIsSettingsOpen(false)
          }}
          size="icon"
          title="Keyboard shortcuts (?)"
          variant="ghost"
        >
          <HelpCircle />
        </Button>
      </div>

      {isSettingsOpen && (
        <div className="floating-panel popover-panel settings-popover" role="dialog">
          <div className="popover-heading">
            <div>
              <p>Speech settings</p>
              <span>Used while reading the document</span>
            </div>
            <Button
              aria-label="Close settings"
              onClick={() => setIsSettingsOpen(false)}
              size="icon-sm"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
          <label className="field-label" htmlFor="voice-select">
            Voice
          </label>
          <select className="select-control" defaultValue="default" id="voice-select">
            <option value="default">System default</option>
          </select>
          <span className="field-label">Speed</span>
          <div className="speed-options">
            {SPEEDS.map(value => (
              <Button
                aria-pressed={speed === value}
                className={cn(speed === value && 'is-active')}
                key={value}
                onClick={() => setSpeed(value)}
                size="sm"
                variant="ghost"
              >
                {value}×
              </Button>
            ))}
          </div>
        </div>
      )}

      {isShortcutsOpen && (
        <div className="floating-panel popover-panel shortcuts-popover" role="dialog">
          <div className="popover-heading">
            <div>
              <p>Keyboard shortcuts</p>
              <span>Keep your hands on the keyboard</span>
            </div>
            <Button
              aria-label="Close shortcuts"
              onClick={() => setIsShortcutsOpen(false)}
              size="icon-sm"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
          <dl className="shortcuts-list">
            <div>
              <dt>Play or pause</dt>
              <dd>
                <kbd>Space</kbd>
              </dd>
            </div>
            <div>
              <dt>Previous / next word</dt>
              <dd>
                <kbd>←</kbd>
                <kbd>→</kbd>
              </dd>
            </div>
            <div>
              <dt>Previous / next sentence</dt>
              <dd>
                <kbd>⇧</kbd>
                <kbd>←</kbd>
                <kbd>→</kbd>
              </dd>
            </div>
            <div>
              <dt>Stop</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
            <div>
              <dt>Zoom</dt>
              <dd>
                <kbd>−</kbd>
                <kbd>+</kbd>
              </dd>
            </div>
            <div>
              <dt>Debug / strategy</dt>
              <dd>
                <kbd>D</kbd>
                <kbd>N</kbd>
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div ref={stageRef} className="document-stage">
        {error !== null ? (
          <div className="empty-state" role="alert">
            <span className="empty-state-icon">
              <FileText />
            </span>
            <p>Couldn’t open this PDF</p>
            <span>{error}</span>
            <div className="empty-state-actions">
              <Button asChild size="sm">
                <label htmlFor="pdf-upload">
                  <FileUp />
                  Choose another
                </label>
              </Button>
              <Button onClick={restoreSample} size="sm" variant="outline">
                Open sample
              </Button>
            </div>
          </div>
        ) : (
          <div className="canvas-wrap" aria-busy={isLoadingDocument || isRendering}>
            <canvas ref={canvasRef} className="pdf-canvas" aria-label={`Page ${pageNumber}`} />
            {(isLoadingDocument || isRendering) && (
              <div className="page-loading" role="status">
                <LoaderCircle />
                <span>{isLoadingDocument ? 'Opening document' : 'Rendering page'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isDebug && (
        <div className="floating-panel debug-legend" aria-label="Debug legend" role="status">
          <div>
            <i className="legend-swatch naive" />
            Naive rects
          </div>
          <div>
            <i className="legend-swatch precise" />
            Precise rects
          </div>
          <span className="legend-count">Text metrics appear after extraction</span>
        </div>
      )}

      <div className="floating-panel player-panel">
        <div className="player-actions">
          <Button
            aria-label="Previous sentence"
            size="icon"
            title="Previous sentence (Shift + ←)"
            variant="ghost"
          >
            <SkipBack />
          </Button>
          <Button aria-label="Previous word" size="icon" title="Previous word (←)" variant="ghost">
            <StepBack />
          </Button>
          <Button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="play-button"
            onClick={() => setIsPlaying(current => !current)}
            size="icon-lg"
            title="Play or pause (Space)"
          >
            {isPlaying ? <Pause /> : <Play className="play-icon" />}
          </Button>
          <Button aria-label="Next word" size="icon" title="Next word (→)" variant="ghost">
            <StepForward />
          </Button>
          <Button
            aria-label="Next sentence"
            size="icon"
            title="Next sentence (Shift + →)"
            variant="ghost"
          >
            <SkipForward />
          </Button>
          <Button
            aria-label="Stop and return to the beginning"
            onClick={() => setIsPlaying(false)}
            size="icon"
            title="Stop (Esc)"
            variant="ghost"
          >
            <Square />
          </Button>
        </div>
        <span className="player-divider" aria-hidden="true" />
        <button
          className="speed-control"
          onClick={() => {
            const currentIndex = SPEEDS.indexOf(speed)
            setSpeed(SPEEDS[(currentIndex + 1) % SPEEDS.length] ?? 1)
          }}
          type="button"
          title="Change reading speed"
        >
          <Gauge />
          {speed}×
        </button>
        <span className="player-divider" aria-hidden="true" />
        <span className="sentence-progress">
          Sentence <strong>—</strong> of <strong>—</strong>
        </span>
        <span
          className="timer-sync"
          title="Word timing is estimated when the voice provides no boundary events"
        >
          <Timer />
          <span className="sr-only">Timer-based synchronization fallback</span>
        </span>
      </div>

      <div className="floating-panel view-panel">
        <fieldset className="page-navigation">
          <legend className="sr-only">Page navigation</legend>
          <Button
            aria-label="Previous page"
            disabled={pageNumber <= 1 || pdf === null}
            onClick={() => goToPage(pageNumber - 1)}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronLeft />
          </Button>
          <input
            aria-label="Page number"
            className="page-input"
            inputMode="numeric"
            onBlur={commitPageInput}
            onChange={event => setPageInput(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                commitPageInput()
                event.currentTarget.blur()
              }
            }}
            value={pageInput}
          />
          <span className="page-total">/ {pageCount || '—'}</span>
          <Button
            aria-label="Next page"
            disabled={pdf === null || pageNumber >= pageCount}
            onClick={() => goToPage(pageNumber + 1)}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronRight />
          </Button>
        </fieldset>
        <span className="panel-divider" aria-hidden="true" />
        <fieldset className="zoom-controls">
          <legend className="sr-only">Zoom controls</legend>
          <Button
            aria-label="Zoom out"
            disabled={scale <= MIN_SCALE}
            onClick={() => {
              setIsRendering(true)
              setScale(current => Math.max(MIN_SCALE, current - SCALE_STEP))
            }}
            size="icon-sm"
            variant="ghost"
          >
            <Minus />
          </Button>
          <span className="zoom-value">{toPercent(scale)}</span>
          <Button
            aria-label="Zoom in"
            disabled={scale >= MAX_SCALE}
            onClick={() => {
              setIsRendering(true)
              setScale(current => Math.min(MAX_SCALE, current + SCALE_STEP))
            }}
            size="icon-sm"
            variant="ghost"
          >
            <Plus />
          </Button>
          <Button
            aria-label="Fit page to width"
            onClick={fitPageToWidth}
            size="icon-sm"
            title="Fit to width"
            variant="ghost"
          >
            <Maximize2 />
          </Button>
        </fieldset>
        {fileName !== 'sample.pdf' && (
          <Button
            aria-label="Restore sample PDF"
            onClick={restoreSample}
            size="icon-sm"
            title="Restore sample PDF"
            variant="ghost"
          >
            <RotateCcw />
          </Button>
        )}
      </div>

      {isDragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <UploadCloud />
            <p>Drop PDF to open</p>
            <span>The current document will be replaced</span>
          </div>
        </div>
      )}
    </section>
  )
}
