import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'

vi.mock('@/components/pdf-viewer', () => ({
  PdfViewer: () => <section aria-label="PDF viewer">PDF viewer</section>,
}))

describe('App', () => {
  afterEach(cleanup)

  it('renders the PDF reader shell', () => {
    render(<App />)

    expect(screen.getByRole('region', { name: 'PDF viewer' })).toBeTruthy()
  })
})
