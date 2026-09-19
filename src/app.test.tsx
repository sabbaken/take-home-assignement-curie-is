import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'

vi.mock('@/components/pdf-viewer', () => ({
  PdfViewer: () => <section aria-label="PDF viewer">PDF viewer</section>,
}))

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the PDF reader shell', () => {
    render(<App />)

    expect(screen.getByRole('region', { name: 'PDF viewer' })).toBeTruthy()
  })

  it('warns Safari users to open the demo in Chrome', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
    })

    render(<App />)

    expect(screen.getByRole('alert').textContent).toContain('Please use Google Chrome')
  })

  it('does not show the warning in Chrome', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    })

    render(<App />)

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
