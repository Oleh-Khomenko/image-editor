# Image editor

A small browser image editor built around a print-prep workflow: upload, crop,
adjust brightness/contrast/saturation, apply a filter, and export. Editing is
non-destructive and the edits can be saved to JSON and replayed later.

## Running it

```
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:5173 by default).

```
npm test      # unit tests
npm run build # type-check + production build
```

## How edits are modelled

The original image is never mutated. Every change is a typed entry in an
`operations` array:

```ts
type EditOperation =
  | { type: 'crop';   x; y; width; height }   // normalized 0..1
  | { type: 'adjust'; brightness; contrast; saturation }  // -100..100
  | { type: 'filter'; name: 'grayscale' | 'sepia' }
```

Operations always apply in the same order: crop, then adjust, then filter. There
is at most one of each; changing a slider replaces the existing `adjust` entry
rather than stacking. Undo/redo is just snapshots of this array, and "view
original" renders with an empty array without discarding what you have.

Everything above lives in `src/core`, which is plain TypeScript with no Vue
imports, so the model, the JSON format, and the render maths are unit-tested on
their own. The Pinia store in `src/stores/editor.ts` holds the current image and
operations; the Vue components under `src/components` are the UI on top.

## Rendering

The preview and the exported file go through the same code, so what you see is
what you get. A single WebGL fragment shader does the adjustments and filters;
crop is a UV rectangle. The source image is uploaded to a texture once, and
moving a slider only changes a uniform, which keeps dragging smooth on large
images. Export renders at the image's full resolution into the same pipeline and
reads the pixels back into a PNG/JPEG/WebP blob, preserving the original format.

WebGL adds complexity, so here is where it can break and what handles each case:

- No WebGL available: fall back to a Canvas 2D renderer using CSS filter strings.
- Image larger than `MAX_TEXTURE_SIZE`: same fall back, per image.
- Lost GL context: the renderer re-links the program and re-uploads the texture
  on restore.
- Alpha and orientation: unpack flags are set so the read-back matches the
  preview instead of coming out premultiplied or upside down.

Both renderers implement one `Renderer` interface and are chosen at runtime, so
the rest of the app does not care which one is active.

## JSON export and replay

The document is `{ version, source, operations }`. By default it carries only the
operations plus the source name, dimensions, and a SHA-256 of the original, so
importing checks that you loaded the matching image. The "with image" option
embeds the source as a data URL instead, which makes the document self-contained
at the cost of size.

## Stack

Vue 3, Vuetify 3, Pinia, TypeScript, Vite. Tests run on Vitest.
