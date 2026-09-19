import { useModes } from './state/modes'
import { usePageText } from './state/page-text'

export function DebugLegend() {
  const { isDebug } = useModes()
  const { model } = usePageText()

  if (!isDebug) {
    return null
  }

  return (
    <div className="floating-panel debug-legend" aria-label="Debug legend" role="status">
      <div>
        <i className="legend-swatch naive" />
        Naive rects
      </div>
      <div>
        <i className="legend-swatch precise" />
        Precise rects
      </div>
      <span className="legend-count">
        {model === null
          ? 'Extracting text…'
          : `${model.words.length} words · ${model.sentences.length} sentences`}
      </span>
    </div>
  )
}
