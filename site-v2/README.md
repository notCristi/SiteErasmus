# Local development

Open `index.html` directly, or serve this directory as a static website. No runtime dependencies or server-side rendering are required.

Internal navigation replaces only `<main>`. The video, menu, footer and lightbox stay mounted. On HTTP(S), addresses keep their normal HTML paths. With `file://`, navigation uses a `_page` query parameter on the entry document so browser history and reload work without changing the local file path.

The standalone HTML files are the source of truth. After editing their main content, regenerate the bundled templates:

```sh
node scripts/build-page-templates.cjs
```

This produces `assets/js/page-templates.js`, which allows navigation without fetching local HTML files. Page controllers use an `AbortSignal` to remove listeners and observers when leaving a page. Home retains its scene and suspends its controls while an interior page is active.

To run the DOM integration tests:

```sh
npm ci --ignore-scripts
npm test
```

Tests cover video identity and media calls, route history, deep links, home lifecycle and menu styling. Media decoding, canvas rendering and animation frames are mocked; these tests do not replace visual checks in a browser.
