import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs?worker";
pdfjsLib.GlobalWorkerOptions.workerPort = new pdfWorker();

import "./App.css";

export default function PDFViewer({ file }) {
  const containerRef = useRef(null);
    
  const [pageData, setPageData] = useState([]);  
  // Each entry: { top: number, bottom: number, canvasRef }

  useEffect(() => {
    if (!file) return;

    const loadPdf = async () => {
      const pdf = await pdfjsLib.getDocument(file).promise;

      const pages = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        // Default crop lines 50px from top and bottom  
        pages.push({
          pageNum,
          canvas,
          width: canvas.width,
          height: canvas.height,
          top: 50,
          bottom: canvas.height - 50
        });
      }

      setPageData(pages);
    };

    loadPdf();
  }, [file]);

  // Dragging logic for crop lines  
  const handleDrag = (pageIndex, which, event) => {
    const rect = event.target.parentElement.getBoundingClientRect();
    const y = event.clientY - rect.top;

    setPageData(prev => {
      const updated = [...prev];
      const page = { ...updated[pageIndex] };

      if (which === "top") {
        page.top = Math.max(0, Math.min(y, page.bottom - 20));
      } else {
        page.bottom = Math.min(page.height, Math.max(y, page.top + 20));
      }

      updated[pageIndex] = page;
      return updated;
    });
  };

  if (!file) {
    return <p>Upload a PDF to begin.</p>;
  }

  return (
    <div>
      <h2>PDF Preview</h2>

      <div ref={containerRef}>
        {pageData.map((p, i) => (
          <div key={i} style={{ position: "relative", marginBottom: "40px" }}>
            {/* Canvas */}
            <canvas
              ref={(ref) => {
                if (ref && ref !== p.canvas) {
                  ref.width = p.canvas.width;
                  ref.height = p.canvas.height;
                  const ctx = ref.getContext("2d");
                  ctx.drawImage(p.canvas, 0, 0);
                }
              }}
            />

            {/* Top crop line */}
            <div
              style={{
                position: "absolute",
                top: p.top,
                left: 0,
                width: "100%",
                height: "2px",
                background: "red",
                cursor: "ns-resize"
              }}
              onMouseDown={(e) => {
                const move = (ev) => handleDrag(i, "top", ev);
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
            />

            {/* Bottom crop line */}
            <div
              style={{
                position: "absolute",
                top: p.bottom,
                left: 0,
                width: "100%",
                height: "2px",
                background: "blue",
                cursor: "ns-resize"
              }}
              onMouseDown={(e) => {
                const move = (ev) => handleDrag(i, "bottom", ev);
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}