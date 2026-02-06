import { useState, useEffect } from "react"
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
  const [renderedHeights, setRenderedHeights] = useState({})
  const [lineHistory, setLineHistory] = useState([])

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndoLine()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lineHistory, pages]) // Dependencies needed for handleUndoLine

  const handleUndoLine = () => {
    if (lineHistory.length === 0) {
      alert("No lines to undo")
      return
    }

    // Get the last line added
    const lastLine = lineHistory[lineHistory.length - 1]
    
    // Remove it from the page
    setPages(prev => ({
      ...prev,
      [lastLine.pageNumber]: {
        ...prev[lastLine.pageNumber],
        lines: prev[lastLine.pageNumber].lines.filter(line => line.id !== lastLine.lineId)
      }
    }))

    // Remove from history
    setLineHistory(prev => prev.slice(0, -1))
  }

  const handleSubmit = async () => {
    const splits = generateSplits(pages, pageHeights, renderedHeights)
    
    console.log('Submitting splits:', { pdfId, splits })

    try {
      const response = await submitSplits(pdfId, splits)
      
      if (!response.ok) {
        const error = await response.text()
        console.error('Error response:', error)
        alert(`Error: ${error}`)
        return
      }
      
      // Download the resulting ZIP file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'split_hymns.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      alert("Split request submitted and ZIP downloaded!")
    } catch (error) {
      console.error('Error submitting splits:', error)
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="app">
      <h1>PDF Hymn Splitter</h1>

      {!pdfId && <UploadPDF onUpload={setPdfId} />}

      {pdfId && (
        <>
          <button className="undo-button" onClick={handleUndoLine}>
            ↶ Undo Line
          </button>
          
          <PDFGrid
            pdfId={pdfId}
            pages={pages}
            setPages={setPages}
            setPageHeights={setPageHeights}
            setRenderedHeights={setRenderedHeights}
            setLineHistory={setLineHistory}
          />

          <button className="submit" onClick={handleSubmit}>
            Submit Splits
          </button>
        </>
      )}
    </div>
  )
}
