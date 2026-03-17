/* eslint-env worker */
/* eslint-disable no-restricted-globals */

// US Letter in PDF points (72 pt/inch)
const LETTER_WIDTH = 8.5 * 72;  // 612
const LETTER_HEIGHT = 11 * 72;  // 792

// mupdf initializes its WASM asynchronously.  Queue any messages that arrive
// before init is done, then drain them once the module is ready.
let mupdf = null;
let initError = null;  // set on failure; prevents new messages being queued forever
let srcDoc = null;
const messageQueue = [];

const initPromise = import("mupdf").then((m) => {
  mupdf = m;
  // Drain messages that arrived while we were initializing
  for (const e of messageQueue) dispatch(e);
  messageQueue.length = 0;
}).catch((err) => {
  // Record the failure so future onmessage calls reply immediately instead of queueing
  initError = err?.message || String(err);
  // Surface init failures to every caller that is currently waiting
  for (const e of messageQueue) {
    self.postMessage({ type: "ERROR", id: e.data.id, error: `mupdf init failed: ${initError}` });
  }
  messageQueue.length = 0;
});

self.onmessage = (e) => {
  if (initError) {
    // Init already failed — reply immediately rather than queueing forever
    self.postMessage({ type: "ERROR", id: e.data.id, error: `mupdf init failed: ${initError}` });
    return;
  }
  if (!mupdf) {
    // mupdf not ready yet — hold the message until initPromise resolves
    messageQueue.push(e);
    return;
  }
  dispatch(e);
};

function dispatch(e) {
  const { type, id, payload } = e.data;
  try {
    if (type === "LOAD") {
      handleLoad(id, payload);
    } else if (type === "RENDER_PAGE") {
      handleRenderPage(id, payload);
    } else if (type === "SPLIT") {
      handleSplit(id, payload);
    } else {
      self.postMessage({ type: "ERROR", id, error: `Unknown message type: "${type}"` });
    }
  } catch (err) {
    self.postMessage({ type: "ERROR", id, error: err.message || String(err) });
  }
};

// ---------------------------------------------------------------------------
// LOAD
// ---------------------------------------------------------------------------

function handleLoad(id, { buffer }) {
  if (srcDoc) {
    srcDoc.destroy();
    srcDoc = null;
  }
  // buffer was transferred from the main thread (zero-copy)
  srcDoc = mupdf.Document.openDocument(buffer, "application/pdf");
  const numPages = srcDoc.countPages();
  self.postMessage({ type: "LOADED", id, numPages });
}

// ---------------------------------------------------------------------------
// RENDER_PAGE
// ---------------------------------------------------------------------------

function handleRenderPage(id, { pageNum, scale }) {
  if (!srcDoc) throw new Error("No PDF loaded");

  // pageNum is 1-based; mupdf is 0-based
  const page = srcDoc.loadPage(pageNum - 1);
  const [x0, y0, x1, y1] = page.getBounds();
  const pdfWidth  = x1 - x0;
  const pdfHeight = y1 - y0;

  const matrix  = mupdf.Matrix.scale(scale, scale);
  const pixmap  = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
  const png     = pixmap.asPNG();

  pixmap.destroy();
  page.destroy();

  // Transfer the underlying ArrayBuffer so the main thread receives the PNG
  // bytes without an extra copy.
  self.postMessage(
    { type: "PAGE_RENDERED", id, pageNum, pdfHeight, pdfWidth, png },
    [png.buffer]
  );
}

// ---------------------------------------------------------------------------
// SPLIT
// ---------------------------------------------------------------------------

function handleSplit(id, { splits }) {
  if (!srcDoc) throw new Error("No PDF loaded");

  const outputFiles = splitHymns(srcDoc, splits);

  // Transfer all output buffers (zero-copy)
  const transferables = outputFiles.map((b) => b.buffer);
  self.postMessage({ type: "SPLIT_DONE", id, result: outputFiles }, transferables);
}

// ---------------------------------------------------------------------------
// Core split logic (mirrors backend/app.py split_hymns)
// ---------------------------------------------------------------------------

function splitHymns(src, hymns) {
  const outputFiles = [];

  let outBuffer = new mupdf.Buffer();
  let writer    = new mupdf.DocumentWriter(outBuffer, "pdf", "");

  hymns.forEach((hymn, i) => {
    const startIdx = hymn.start_page - 1;  // convert to 0-based
    const endIdx   = hymn.end_page - 1;

    // -----------------------------------------------------------------------
    // 1. Calculate total content dimensions (identical to Python logic)
    // -----------------------------------------------------------------------
    let totalHeight = 0;
    let pageWidth   = 0;

    for (let p = startIdx; p <= endIdx; p++) {
      const pg = src.loadPage(p);
      const [, , w, h] = pg.getBounds();
      pageWidth = Math.max(pageWidth, w);

      if (hymn.start_page === hymn.end_page) {
        totalHeight = hymn.end_y - hymn.start_y;
      } else if (p === startIdx) {
        totalHeight += h - hymn.start_y;
      } else if (p === endIdx) {
        totalHeight += hymn.end_y;
      } else {
        totalHeight += h;
      }
      pg.destroy();
    }

    // -----------------------------------------------------------------------
    // 2. Scale to fit letter
    // -----------------------------------------------------------------------
    const scaleX = pageWidth   > LETTER_WIDTH  ? LETTER_WIDTH  / pageWidth   : 1.0;
    const scaleY = totalHeight > LETTER_HEIGHT ? LETTER_HEIGHT / totalHeight : 1.0;
    const scale  = Math.min(scaleX, scaleY);

    const finalWidth = pageWidth * scale;
    const xOffset    = (LETTER_WIDTH - finalWidth) / 2;

    // -----------------------------------------------------------------------
    // 3. Render each source-page section onto the output page
    //
    //    We open an output page via DocumentWriter, then for each section:
    //      a) Establish a clip rectangle in output space
    //      b) Run the source page through the device with a combined
    //         scale + translate matrix so the clipped region lands at
    //         the correct position on the output page
    //      c) Pop the clip
    // -----------------------------------------------------------------------
    const device = writer.beginPage([0, 0, LETTER_WIDTH, LETTER_HEIGHT]);
    let yCursor  = 0;

    for (let p = startIdx; p <= endIdx; p++) {
      const srcPage       = src.loadPage(p);
      const [, , srcW, srcH] = srcPage.getBounds();

      // Clip region in source-page coordinates (y-down, matching MuPDF)
      let clipY0, clipY1;
      if (hymn.start_page === hymn.end_page) {
        clipY0 = hymn.start_y;
        clipY1 = hymn.end_y;
      } else if (p === startIdx) {
        clipY0 = hymn.start_y;
        clipY1 = srcH;
      } else if (p === endIdx) {
        clipY0 = 0;
        clipY1 = hymn.end_y;
      } else {
        clipY0 = 0;
        clipY1 = srcH;
      }

      const clipHeight   = clipY1 - clipY0;
      const scaledHeight = clipHeight * scale;
      const scaledWidth  = srcW     * scale;

      // Clip path in output-page coordinates
      const clipPath = new mupdf.Path();
      clipPath.rect(xOffset, yCursor, xOffset + scaledWidth, yCursor + scaledHeight);
      device.clipPath(clipPath, true, mupdf.Matrix.identity);

      // Transformation matrix: maps source coords → output coords
      //   source (x, y)  →  output (x*scale + xOffset,  y*scale + (yCursor - clipY0*scale))
      const matrix = [scale, 0, 0, scale, xOffset, yCursor - clipY0 * scale];
      srcPage.run(device, matrix);

      device.popClip();
      yCursor += scaledHeight;
      srcPage.destroy();
    }

    writer.endPage();

    // -----------------------------------------------------------------------
    // 4. Document boundary: flush and start a new output document
    // -----------------------------------------------------------------------
    if (hymn.stopDocument || i === hymns.length - 1) {
      writer.close();
      // .slice() gives us an independent copy from the mupdf Buffer
      outputFiles.push(outBuffer.asUint8Array().slice());

      if (i < hymns.length - 1) {
        outBuffer = new mupdf.Buffer();
        writer    = new mupdf.DocumentWriter(outBuffer, "pdf", "");
      }
    }
  });

  return outputFiles;
}
