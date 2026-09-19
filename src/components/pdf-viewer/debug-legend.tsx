import { useModes } from './state/modes'

export function DebugLegend() {
  const { isDebug } = useModes()

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
      <span className="legend-count">Text metrics appear after extraction</span>
    </div>
  )
}
