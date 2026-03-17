// ---------------------------------------------------------------------------
// mupdf Web Worker singleton.
//
// All PDF work (loading, rendering pages, splitting) happens inside the
// worker so the main thread stays responsive.  Requests are matched to
// responses via a numeric `id` field on every message.
// ---------------------------------------------------------------------------

let worker = null;
let nextId = 0;
const pending = new Map(); // id → resolve

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./mupdfWorker.js", import.meta.url));
    worker.onmessage = (e) => {
      const { id, ...rest } = e.data;
      const resolve = pending.get(id);
      if (resolve) {
        pending.delete(id);
        resolve(rest);
      }
    };
    worker.onerror = (e) => {
      console.error("mupdf worker error:", e);
      // Reject every in-flight call so callers don't hang forever
      const msg = e.message || "Worker error";
      for (const [id, resolve] of pending) {
        resolve({ type: "ERROR", error: msg });
      }
      pending.clear();
      worker = null; // allow the worker to be re-created on the next call
    };
  }
  return worker;
}

function call(type, payload, transfer = []) {
  const requestId = nextId++;
  return new Promise((resolve) => {
    pending.set(requestId, resolve);
    getWorker().postMessage({ type, id: requestId, payload }, transfer);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a PDF from an ArrayBuffer into the worker.
 * The buffer is *transferred* (zero-copy); the caller must not use it again.
 * Returns { numPages }.
 */
export function loadPdf(buffer) {
  return call("LOAD", { buffer }, [buffer]);
}

/**
 * Render page `pageNum` (1-based) at the given scale.
 * Returns { pdfHeight, pdfWidth, png: Uint8Array }.
 */
export function renderPage(pageNum, scale) {
  return call("RENDER_PAGE", { pageNum, scale });
}

/**
 * Run the split algorithm on the already-loaded PDF.
 * `splits` is the array produced by generateSplits().
 * Returns { result: Uint8Array[] } — one entry per output document.
 */
export function submitSplits(splits) {
  return call("SPLIT", { splits });
}

