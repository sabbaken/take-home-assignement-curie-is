# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Curie Reader is a take-home proof of concept. It renders a PDF with `pdfjs-dist` and highlights the
sentence and word being read aloud, in the style of Speechify. The core of the task is getting
**accurate highlight rectangles**. A "naive" strategy uses DOM ranges over the PDF.js TextLayer
spans. A "precise" strategy uses real font metrics per glyph. The UI shows both side by side in a
debug mode.

The roadmap is `tmp/plan.md` (in Russian). Treat it as the spec for the step order, UI layout,
highlight colours and hotkeys. If time runs short, the plan says to cut from the end: TTS first,
then multi-page support. Steps 1–3 (text model, naive strategy, precise strategy) and debug mode
must stay.

## Commands

pnpm 12 and Node ≥ 22.13 are required.

```bash
pnpm dev                          # Vite dev server
pnpm test                         # vitest run (jsdom)
pnpm test src/core/rects.test.ts  # run a single file
pnpm test -t "merges fragments"   # run tests whose name matches
pnpm lint                         # eslint, --max-warnings=0
pnpm typecheck                    # tsc --noEmit
pnpm check                        # biome check + lint + typecheck + test
pnpm fix                          # biome --write + eslint --fix
pnpm validate                     # check + build (this is what CI runs)
pnpm exec shadcn add <component>  # add a shadcn/ui primitive into src/components/ui
```

Every push to `main` runs `pnpm validate` and deploys `dist` to GitHub Pages
(`.github/workflows/deploy.yml`). Vite uses `base: './'`, so reference files in `public/` through
`import.meta.env.BASE_URL` (see `createSampleSource` in `state/document.ts`), not through absolute
paths.

## Architecture

### `src/core/`: framework-free text and geometry

- `text-model.ts`: `buildPageTextModel` joins the `getTextContent()` items into one page string.
  It inserts a space or `\n` between items when needed. `characterSources[i]` maps each character
  back to `{ itemIndex, offset }` in the source item, and inserted separators map to `null`.
  Words (`isWordLike`) and sentences come from `Intl.Segmenter` as `[start, end)` ranges over that
  string. `findWordIndex` and `findSentenceIndex` turn a speech `charIndex` into the active range.
- `rects.ts`: the `RectStrategy` interface (`getRects(start, end) → Rect[]`) that both strategies
  implement, `mergeRectsByLine` (one box per visual line), `roundedRectsPath` (SVG path data) and
  `NaiveRectStrategy`. The naive strategy indexes `textDivs` by the model's `itemIndex`. That only
  works if the TextLayer's divs line up one-to-one with the filtered items, which the plan flags as
  still unverified. Rects are in pixels, relative to the page container.
- Keep this layer free of React so it stays unit-testable. jsdom has no layout or canvas, so the
  tests cover only the pure logic (segmentation, merging, path strings), not the real rectangles.

### `src/components/pdf-viewer/`: the single screen

- `PdfViewer` composes floating panels (document, modes, player, view, debug legend) around a
  central `DocumentStage` inside a `DropZone` (drop a PDF anywhere to open it).
- State is split into four contexts in `state/`: `document`, `viewport`, `modes` and `player`.
  `PdfViewerProvider` composes them. They are separate so that fast-changing state, such as the
  active word during playback, re-renders only the components that read it. Each is a
  `useXState()` hook that returns a memoised object, exposed through
  `createStrictContext`, which throws when a hook is used outside the provider. Add new
  cross-panel state to the domain it belongs to rather than to a new global store.
- Each panel registers its own hotkeys with `useHotkey` from `@tanstack/react-hotkeys`. The full
  list shown to users is in `shortcuts-popover.tsx`, so update it when you add a key.
- `state/document.ts` configures the PDF.js worker (`new URL('pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url)`) and loads either the bundled `public/sample.pdf` or a local `File`.

### Async and effect conventions

The app runs under `StrictMode`, so effects mount twice. Every PDF.js task effect uses an
`isActive` flag, calls `cancel()`/`destroy()` in cleanup, and ignores
`RenderingCancelledException`. `PdfPage` and `useDocumentState` show the pattern. Apply it to
TextLayer rendering as well.

Prefer deriving state over syncing it inside effects. `PdfPage` works out whether it is loading by
comparing the inputs of the last finished render with the current ones. `useViewportState` keys
the page number to the `pdf` instance, so a new document starts on page 1 without an effect.

### Plan constraints that are easy to miss

- Zoom must re-render the page at the new scale and rebuild the text model. Never use a CSS
  transform, because the canvas text blurs and the rects drift.
- The page container should stack three layers: canvas, then TextLayer, then an `<svg>` overlay.
  Right now `pdf-page.tsx` renders only the canvas. The player state, the word and sentence
  navigation buttons and the sentence counter are still UI stubs.
- The precise strategy (plan step 3) measures **prefixes** (`measureText(str.slice(0, i))`) so
  kerning is included, then scales the result to `item.width × scale`. It falls back to the naive
  strategy per item when the font is not loaded or is Type3. Rotated and vertical text is out of
  scope and should be documented in the README.

## Conventions

- Styling: Tailwind v4 sets up the theme tokens in `src/index.css` and is used inside the shadcn
  primitives (`src/components/ui`). App components mostly use semantic class names (such as
  `floating-panel` and `player-panel`) defined in `src/index.css`, not inline utility chains.
  Follow that split.
- Import from `src` through `@/…`. Files are kebab-case and use named exports.
- The TypeScript config enables `noUncheckedIndexedAccess`, so indexed reads are `T | undefined`.
  The code checks them explicitly (`=== null`, `=== undefined`) rather than with `!`.
- Biome owns formatting and import order: single quotes, no semicolons, trailing commas, 100
  columns. ESLint adds the react-hooks and react-refresh rules. Only components may be exported from
  `.tsx` files, and `buttonVariants` is the one allowed exception.
