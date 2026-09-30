# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this is

PDF Narration Reader is a proof of concept. It renders a PDF with `pdfjs-dist` and highlights the
sentence and word being read aloud, in the style of Speechify. The core technical focus is getting
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
pnpm validate                     # full local validation: check + production build
pnpm exec shadcn add <component>  # add a shadcn/ui primitive into src/components/ui
```

Vercel handles production deployments from `main`: it runs the Vite production build and serves
`dist`. Vite uses `base: './'`, so reference files in `public/` through `import.meta.env.BASE_URL`
(see `createDefaultSource` in `state/document.ts`), not through absolute paths.

## Architecture

### `src/core/`: framework-free text and geometry

- `text-model.ts`: `buildPageTextModel` joins the `getTextContent()` items into one page string.
  Items on the same line are joined as is, because PDF.js already emits whitespace items for
  visual gaps. `hasEOL` on an item (a wrapped line) becomes a space. An empty item with `hasEOL`
  marks a new text block (a heading, a paragraph, a footnote) and becomes `\n`. This matters because
  `Intl.Segmenter` ends a sentence at every `\n`. `characterSources[i]` maps each UTF-16 code unit
  back to `{ itemIndex, offset }` in the source item, and inserted separators map to `null`.
  Words (`isWordLike`) and sentences come from `Intl.Segmenter` as `[start, end)` ranges over that
  string. Sentences without words are dropped, so every sentence has something to read.
  `findWordIndex` and `findSentenceIndex` turn a speech `charIndex` into the active range.
  `PageTextModel` is generic over the item type. The viewer builds it from PDF.js `TextItem`s, so
  the precise strategy can read `transform`, `width` and `fontName` from `model.items`.
- `rects.ts`: the `RectStrategy` interface (`getRects(start, end) → Rect[]`) that both strategies
  implement, `mergeRectsByLine` (one box per visual line), `roundedRectsPath` (SVG path data) and
  `NaiveRectStrategy`. The naive strategy indexes `textDivs` by the model's `itemIndex` and measures
  one `Range` per item (`sliceByItem`). This works because the PDF.js TextLayer creates one span for
  every item that has `str`, empty ones included (verified in `pdfjs-dist` 6.3). Rects are in
  pixels, relative to the TextLayer, which covers the page. `measurePageLayout` measures every word
  and sentence once per render, so rendering and hit testing (`findWordAtPoint`) are pure.
- `precise-rects.ts`: `PreciseRectStrategy` (plan step 3). It takes the baseline and font size from
  `Util.transform(viewport.transform, item.transform)`, and the height from `ascent`/`descent` in
  `textContent.styles`. Horizontal offsets are prefix widths, `measureText(str.slice(0, i))`,
  scaled so the item spans `item.width` in pixels. It measures at a fixed 100px, since only the
  proportions matter. The per-item fallback to the naive strategy goes through
  `SliceRectSource.getSliceRects`. An item falls back when its font has no loaded `FontFace` in
  `document.fonts` (Type3 and missing fonts have none), or when it is rotated, vertical or RTL.
  The measuring is behind the `FontMeasurer` interface, so the tests use a fake one.
- `speech.ts`: `readAloud` speaks one sentence per `SpeechSynthesisUtterance`, maps `boundary`
  events back to word indexes, falls back to a timer when the voice sends none, and returns a
  cancel function for effect cleanup.
- Keep this layer free of React so it stays unit-testable. jsdom has no layout or canvas, so the
  tests cover only the pure logic (segmentation, merging, path strings, speech with a fake
  `speechSynthesis`, the precise geometry with a fake `FontMeasurer`), not the real rectangles.

### `src/components/pdf-viewer/`: the single screen

- `PdfViewer` composes floating panels (document, modes, player, view, debug legend) around a
  central `DocumentStage` inside a `DropZone` (drop a PDF anywhere to open it).
- State is split into five contexts in `state/`: `document`, `viewport`, `page-text` (the current
  page's `TextContent` and text model), `modes` and `player`.
  `PdfViewerProvider` composes them. They are separate so that fast-changing state, such as the
  active word during playback, re-renders only the components that read it. Each is a
  `useXState()` hook that returns a memoised object, exposed through
  `createStrictContext`, which throws when a hook is used outside the provider. Add new
  cross-panel state to the domain it belongs to rather than to a new global store.
- Each panel registers its own hotkeys with `useHotkey` from `@tanstack/react-hotkeys`. The full
  list shown to users is in `shortcuts-popover.tsx`, so update it when you add a key.
- `state/player.ts` holds the active word (`cursor`) and, while playing, the reading `session`.
  Seeking, pausing or changing speed replaces the session, and the speech effect restarts from it.
  Pause cancels speech instead of calling `speechSynthesis.pause()`, which is unreliable in Chrome.
  At the end of a page, reading moves on to the next one.
- `state/document.ts` configures the PDF.js worker (`new URL('pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url)`) and loads either the bundled `public/Kiryl-Viarenich-Frontend.pdf` or a local
  `File`.

### Async and effect conventions

The app runs under `StrictMode`, so effects mount twice. Every PDF.js task effect uses an
`isActive` flag, calls `cancel()`/`destroy()` in cleanup, and ignores
`RenderingCancelledException`. `PdfPage`, `PageTextLayer` and `useDocumentState` show the pattern.

Prefer deriving state over syncing it inside effects. `PdfPage` works out whether it is loading by
comparing the inputs of the last finished render with the current ones. `useViewportState` keys
the page number to the `pdf` instance, so a new document starts on page 1 without an effect.

### Plan constraints that are easy to miss

- Zoom must re-render the page at the new scale. Never use a CSS transform, because the canvas
  text blurs and the rects drift. The text model does not depend on scale, so it is built once per
  page, but the TextLayer and the measured rects are rebuilt at every scale.
- The canvas CSS size follows `scale` in the same commit, and the last bitmap is stretched to it.
  `PdfPage` re-renders off screen once the scale has held for `RESCALE_DELAY`, so a pinch
  (`use-pinch-zoom.ts`: Ctrl + wheel, or Safari's `gesture*` events) does not start a render per
  event. The highlights are hidden until the new TextLayer is measured. Every zoom goes through
  `zoom()` in `state/viewport.ts`, which records the point under the pointer, or the middle of the
  stage, and a layout effect scrolls it back into place before paint.
- The stage centres the page with auto margins in a column flex container, not with padding
  computed from the page width, so a page wider than the stage scrolls from its left edge.
- The page container stacks three layers: canvas, then TextLayer (`page-text-layer.tsx`), then the
  `<svg>` overlay (`highlight-overlay.tsx`). Clicking a word seeks there and starts reading.
- `PageTextLayer` measures both layouts on every render, so debug mode can outline words with
  both strategies at once. The Naive/Precise toggle picks the layout used for the highlight and
  for click hit testing.
- PDF.js registers the embedded fonts (`FontFace` named after `item.fontName`) while it draws the
  canvas. `PageTextLayer` therefore waits for `isCanvasRendered` from `PdfPage` before it
  measures. Without that wait, every item would silently fall back to the naive strategy.
- `document.fonts.check()` returns true for a family that is not in the set at all, so it cannot
  tell whether a PDF font is loaded. Look the `FontFace` up by family instead.
- PDF.js drops `kern`/`GPOS` when it repacks a font, so prefix widths equal summed glyph advances.
  Kerning written into the PDF (TJ offsets) ends up in `item.width` and is spread across the item
  by the scaling.

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
