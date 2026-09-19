# Curie Reader

A single-page proof of concept for PDF narration. The current version opens and renders a bundled
PDF with PDF.js and provides the foundation for adding text extraction and speech playback.

## Stack

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4
- shadcn/ui
- `pdfjs-dist`
- Vitest, Testing Library, ESLint and Biome
- GitHub Actions deployment to GitHub Pages

## Requirements

- Node.js 22.13 or newer
- pnpm 12 (`corepack enable` if pnpm is not already available)

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm build
pnpm validate
```

To add another shadcn/ui component:

```bash
pnpm exec shadcn add dialog
```

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` validates and deploys `dist` on every push to
`main`. In the repository settings, choose **GitHub Actions** as the Pages source. Vite uses a
relative base path, so the same build works for both project pages and a custom domain.

## PDF.js integration

`src/components/pdf-viewer/state/document.ts` configures the PDF.js worker and loads
`public/sample.pdf`, and `pdf-page.tsx` renders the selected page to a high-DPI canvas. Local PDF
files can also be opened from the toolbar without uploading them to a server.

Viewer state is split into four contexts under `src/components/pdf-viewer/state/` (document,
viewport, modes, player), composed by `PdfViewerProvider`. Each panel reads only the domain it
needs and registers its own keyboard shortcuts with TanStack Hotkeys.
