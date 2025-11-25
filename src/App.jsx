import { useState } from "react";
import PDFViewer from "./PDFViewer";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

import "./App.css";

export default function App() {
  const [pages, setPages] = useState([]);
  const [boxes, setBoxes] = useState([]);

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
    setBoxes((boxes) => [
      ...boxes,
      {
        id: crypto.randomUUID(),
        top: 0,
        height: 200
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
          <button onClick={addBox}>Add Box</button>
          <button onClick={removeLastBox}>Remove Last Box</button>

          <PDFViewer
            pages={pages}
            boxes={boxes}
            updateBox={updateBox}
          />
        </div>
      )}
    </div>
  );
}