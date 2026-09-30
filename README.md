# PDF Narration Reader

Take-home assignment for [Curie](https://curie.is/): build a PDF reader that narrates text and
highlights the current sentence and word accurately as speech plays.

This proof of concept renders PDFs with PDF.js and compares two highlight strategies: DOM ranges
over the text layer and glyph measurements using the PDF's embedded fonts. Debug mode shows both
sets of rectangles together. It also supports playback controls, word seeking, page navigation,
and zoom.

[Live demo](https://take-home-assignment-pdf-narration-reader.vercel.app/) · Chrome only

## Run locally

Requires Node.js 22.13+ and pnpm 12.

```bash
pnpm install
pnpm dev
```
