import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs?worker";
pdfjsLib.GlobalWorkerOptions.workerPort = new pdfWorker();

import "./App.css";

export default function PdfViewer({ pdfData }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum] = useState(1);
  const [topY, setTopY] = useState(50);
  const [bottomY, setBottomY] = useState(300);
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    (async () => {
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
    })();
  }, [pdfData]);

  useEffect(() => {
    if (!pdfDoc) return;

    (async () => {
      const page = await pdfDoc.getPage(pageNum);

      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Adjust bottom line if out of bounds
      if (bottomY > viewport.height) setBottomY(viewport.height - 50);

      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
  }, [pdfDoc]);

  // Drag handlers
  const handleMouseDown = (line) => (e) => {
    setDragging({ line, offsetY: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;

    const canvasHeight = canvasRef.current.height;

    // Clamp
    const clampedY = Math.max(0, Math.min(y, canvasHeight));

    if (dragging.line === "top") setTopY(clampedY);
    if (dragging.line === "bottom") setBottomY(clampedY);
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <div
      className="viewer-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* PDF page */}
      <canvas ref={canvasRef} className="pdf-canvas"></canvas>

      {/* Crop lines */}
      <div
        className="crop-line"
        style={{ top: topY }}
        onMouseDown={handleMouseDown("top")}
      ></div>

      <div
        className="crop-line"
        style={{ top: bottomY }}
        onMouseDown={handleMouseDown("bottom")}
      ></div>
    </div>
  );
}
