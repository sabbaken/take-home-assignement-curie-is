# Curie Reader

A single-page proof of concept for PDF narration. It renders a PDF with PDF.js and highlights
the sentence and word being read aloud. The focus is making the highlight land exactly on the
glyphs drawn on the canvas, not only roughly near them.

**[Live demo](https://sabbaken.github.io/take-home-assignment-curie/)** · **[How it works](#how-it-works)** · **[Status](#status)**

[![Deploy status](https://github.com/sabbaken/take-home-assignment-curie/actions/workflows/deploy.yml/badge.svg)](https://github.com/sabbaken/take-home-assignment-curie/actions/workflows/deploy.yml)

## Stack

- **App:** React 19 + TypeScript, Vite 8
- **PDF:** `pdfjs-dist` (canvas rendering, text content, TextLayer)
- **UI:** Tailwind CSS 4, shadcn/ui on Radix, lucide icons, TanStack Hotkeys
- **Tooling:** Vitest + Testing Library (jsdom), ESLint, Biome
- **Deploy:** GitHub Actions → GitHub Pages

## Layout

```
src/core/                          Framework-free text model and rectangle strategies (unit-tested)
src/components/pdf-viewer/         The single screen: page stage, floating panels, shortcuts
src/components/pdf-viewer/state/   Four contexts (document, viewport, modes, player)
src/components/ui/                 shadcn/ui primitives
public/sample.pdf                  Sample document opened on first load
tmp/plan.md                        Implementation plan (in Russian)
```

## How it works

1. **Render.** PDF.js draws the page onto a high-DPI canvas. Above the canvas sit the PDF.js
   TextLayer, which holds invisible, selectable spans, and an SVG overlay for the highlights.
   Zooming re-renders the page at the new scale and does not use a CSS transform, which would
   blur the canvas and make the highlights drift.
2. **Text model.** The `getTextContent()` items are joined into one string per page. Every
   character keeps a pointer back to its item and its offset inside that item. `Intl.Segmenter`
   splits the string into words and sentences, stored as `[start, end)` ranges.
3. **Rectangles.** Two interchangeable strategies turn a text range into on-screen boxes:
   - **Naive:** runs a DOM `Range` over the TextLayer spans and calls `getClientRects()`. The
     spans are set in a fallback font and stretched to the width of the item, so boxes in the
     middle of a long line drift away from the real glyphs.
   - **Precise:** positions each item from its transform, which gives the baseline and the font
     size. The vertical extent comes from the font's ascent and descent. Horizontal offsets come
     from measuring string prefixes with the embedded font that PDF.js has already registered
     for the canvas, so kerning is included. The measurements are then scaled to the item's real
     width. If the font is not loaded, or it is a Type3 font, the item falls back to the naive
     strategy.
4. **Highlight.** Boxes on the same line are merged. The sentence is drawn as a light,
   rounded outline and the current word as a brighter rounded rectangle on top of it. Debug mode
   outlines every word with both strategies in different colours, so the gap between them is
   visible.
5. **Speech.** `speechSynthesis` reads one sentence at a time. The `charIndex` of each `boundary`
   event maps back to the active word. If the voice sends no boundary events, the reader falls
   back to a timer.

Press `?` in the app to see the keyboard shortcuts.

**Out of scope:** rotated and vertical text, and a dedicated mobile layout. On narrow screens the
panels only wrap.

## Status

- [x] Viewer shell. It opens the bundled sample, a file from the file picker, or a PDF dropped
      anywhere on the page. It also has page navigation, zoom and fit-to-width, and keyboard
      shortcuts.
- [x] Text model: item joining, a character → item map, and word and sentence segmentation.
- [x] Line-merging and SVG path helpers.
- [ ] TextLayer and SVG overlay on the page.
- [ ] Naive strategy wired to the page. The class exists in `src/core/rects.ts`.
- [ ] Precise strategy.
- [ ] Sentence drawn as one continuous stepped outline.
- [ ] Debug overlay. The Naive/Precise toggle and the legend already exist.
- [ ] Speech playback. The player UI exists.
- [ ] Test PDFs: a two-column arXiv paper, justified text, and a document with several fonts.

## Development

Requires Node.js 22.13+ and pnpm 12 (run `corepack enable` if pnpm is not already available).

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

```bash
pnpm test         # Vitest, single run
pnpm check        # Biome + ESLint + tsc + tests
pnpm fix          # auto-fix formatting, imports and lint
```

- Tests run in jsdom, which has no layout engine and no canvas. The `src/core` tests therefore
  cover the pure logic: segmentation, the character map, line merging and path strings. The
  rectangles themselves have to be checked in the browser in debug mode.
- To add a shadcn/ui component, run `pnpm exec shadcn add <component>`.

## Deploy

Every push to `main` runs `pnpm validate` (Biome, ESLint, tsc, Vitest and a production build) and
publishes `dist` to GitHub Pages. This needs a one-time setup: in the repository settings, go to
**Pages** and set **Source** to **GitHub Actions**.

Vite uses a relative base path (`base: './'`), so the same build works on a project page and on a
custom domain.

## Build

```bash
pnpm build        # outputs dist/
pnpm preview      # serve the production build locally
```
