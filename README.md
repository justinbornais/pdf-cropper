# pdf-cropper
Lightweight web app to split, merge, and crop PDF hymnals while preserving full vector quality — runs entirely in the browser, no server required.

## How it works

All PDF processing runs **client-side via WebAssembly**. The app compiles [MuPDF](https://mupdf.com/) — the same C PDF engine used by many professional tools — to WASM using the official [`mupdf` npm package](https://www.npmjs.com/package/mupdf) published by Artifex. This means:

- **No backend, no uploads.** Your PDF never leaves your machine.
- **True PDF accuracy.** Content is cropped and placed using the real MuPDF rendering pipeline, not a JS reimplementation. Fonts, vectors, and embedded images are preserved exactly.
- **Statically deployable.** The built site is plain HTML + JS + a `.wasm` file (~9.5 MB) and can be served from any static host (GitHub Pages, S3, Netlify, etc.).

The heavy work happens in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) so the UI stays responsive while large PDFs are rendered or split. MuPDF is loaded asynchronously inside the worker via a dynamic `import()`, and any messages sent before initialization completes are queued and drained once the WASM module is ready.

## Running locally

You only need Node.js (v18+). There is no backend to start.

```bash
npm install
npm start # opens at http://localhost:3000
```

To produce an optimised production build:

```bash
npm run build # output in build/
```

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically builds and deploys the site to the `gh-pages` branch on every push to `main`. Once GitHub Pages is enabled for that branch in your repository settings, the site will be available at:

```
https://pdfcrop.justinbornais.ca
```

No environment variables or secrets are needed beyond the default `GITHUB_TOKEN` that Actions already has.

---

## Usage

Upload a PDF using the file picker. The file is read locally — nothing is sent to a server.

The webpage will render each page of the PDF in a grid, with scissors icons in between each page. The colors of the icon mean the following:
- **Transparent:** The page will not split. This means the first page will merge with the second page to create one large page.
- **Red (default):** The page will split. This is the default option, as it makes sense upon starting that each page should be separate.
- **Purple:** The PDF will end with the left page, and a new document will begin with the next page.

There are also three buttons at the top of the page that control the scissors icons:
- **All Off:** Makes all scissors transparent. This effectively means all pages will become one.
- **All On:** Makes all scissors red.
- **All Split:** Makes all scissors purple.

You can then click anywhere on the page to specify **page splits** (red) or **document splits** (purple). The behavior is as follows:
- Clicking once on the page will draw a **red** line, indicating the page will be split into two pages at that point.
- Clicking a red line will turn it **purple**, indicating the document itself will end at that point, and a new document will start below.
- Clicking a purple line will remove it entirely.
- You may also press **Undo line** (or `Ctrl + Z`) to undo the last line you clicked.

Once you are done, click **Submit Splits** and you will be given a ZIP file.

An example usage scenario:

> I have a two-page PDF containing three hymns. The second hymn starts in the middle of the first page, and ends in the middle of the second page.
>
> If I wanted to split this PDF into three separate PDF documents, I would do the following:
> 1. Draw a purple line right above the beginning of the second hymn.
> 2. Turn the scissors icon off (transparent).
> 3. Draw a purple line above the beginning of the third hymn.
>
> This will result in a ZIP containing three PDFs: one with the first hymn only, one with the second hymn (both sections merged into one page), and one with the third hymn only.