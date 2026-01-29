import { useState } from "react";
import PDFViewer from "./PDFViewer";
import * as pdfjsLib from "pdfjs-dist";
import { generateFinalPDF } from "./pdf-export";
import "pdfjs-dist/build/pdf.worker.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

import "./App.css";

export default function App() {
  const [pages, setPages] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [scale, setScale] = useState(1);
  const [greyscale, setGreyscale] = useState();

  const loadPDF = async (file) => {
    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuf).promise;

    const loadedPages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      loadedPages.push(p);
    }
    setPages(loadedPages);
  };

  const addBox = () => {
    const newTop = boxes.length > 0
      ? boxes[boxes.length - 1].top + boxes[boxes.length - 1].height
      : 0;
    
    setBoxes((boxes) => [
      ...boxes,
      {
        id: crypto.randomUUID(),
        top: newTop,
        height: pages[0]?.getViewport().height || 500
      }
    ]);
  };

  const removeLastBox = () => {
    setBoxes((boxes) => boxes.slice(0, -1));
  };

  const updateBox = (id, newData) => {
    setBoxes((boxes) =>
      boxes.map((b) => (b.id === id ? { ...b, ...newData } : b))
    );
  };

  return (
    <div>
      <h1>PDF Crop Box Tool</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => loadPDF(e.target.files[0])}
      />

      {pages.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button className="ms-3 btn btn-primary" onClick={addBox}>Add Box</button>
          <button className="ms-3 btn btn-danger" onClick={removeLastBox}>Remove Last Box</button>
          <button className="ms-3 btn btn-secondary" onClick={() => setGreyscale(g => !g)}>
            {greyscale ? 'Greyscale: ON' : 'Greyscale: OFF'}
          </button>
          <button className="ms-3 btn btn-success" onClick={() => generateFinalPDF({ pages, boxes, scale, greyscale })}>Generate PDF</button>

          <PDFViewer
            pages={pages}
            boxes={boxes}
            updateBox={updateBox}
            scale={scale}
            setScale={setScale}
          />
        </div>
      )}
    </div>
  );
}