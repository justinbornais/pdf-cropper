import { useState } from "react"
import UploadPDF from "./UploadPDF"
import PDFGrid from "./PDFGrid"
import { submitSplits } from "./api"
import { generateSplits } from "./splitUtils"
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function App() {
  const [pdfId, setPdfId] = useState(null)
  const [pages, setPages] = useState({})
  const [pageHeights, setPageHeights] = useState({})

  const handleSubmit = async () => {
    const splits = generateSplits(pages, pageHeights)

    await submitSplits(pdfId, splits)
    alert("Split request submitted!")
  }

  return (
    <div className="app">
      <h1>PDF Hymn Splitter</h1>

      {!pdfId && <UploadPDF onUpload={setPdfId} />}

      {pdfId && (
        <>
          <PDFGrid
            pdfId={pdfId}
            pages={pages}
            setPages={setPages}
            setPageHeights={setPageHeights}
          />

          <button className="submit" onClick={handleSubmit}>
            Submit Splits
          </button>
        </>
      )}
    </div>
  )
}
