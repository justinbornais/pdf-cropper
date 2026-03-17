import { useState, useEffect } from "react"
import UploadPDF from "./UploadPDF"
import PDFGrid from "./PDFGrid"
import { submitSplits } from "./api"
import { generateSplits } from "./splitUtils"
import { zipSync } from "fflate"

export default function App() {
  const [pdfFile, setPdfFile] = useState(null)
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

  const setAllScissors = (state) => {
    const allPageNumbers = Object.keys(pageHeights).map(Number)
    
    setPages(prev => {
      const updated = { ...prev }
      allPageNumbers.forEach(pageNum => {
        updated[pageNum] = {
          ...(prev[pageNum] || { lines: [] }),
          pageEndCut: state
        }
      })
      return updated
    })
  }

  const handleSubmit = async () => {
    const splits = generateSplits(pages, pageHeights, renderedHeights)
    console.log('Submitting splits:', splits)

    try {
      const response = await submitSplits(splits)

      if (response.type === 'ERROR') {
        console.error('Split error:', response.error)
        alert(`Error: ${response.error}`)
        return
      }

      const outputs = response.result // Uint8Array[]

      const download = (data, filename) => {
        const url = URL.createObjectURL(new Blob([data]))
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }

      if (outputs.length === 1) {
        download(outputs[0], 'hymns.pdf')
      } else {
        // Bundle multiple output PDFs into a single ZIP
        const zipInput = {}
        outputs.forEach((buf, i) => { zipInput[`hymns-${i}.pdf`] = buf })
        download(zipSync(zipInput), 'split_hymns.zip')
      }

      alert('Download complete!')
    } catch (err) {
      console.error('Error submitting splits:', err)
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div className="app">
      <header className="toolbar">
        <span className="toolbar-title">PDF Hymn Splitter</span>

        {pdfFile ? (
          <>
            <span className="toolbar-filename">{pdfFile.name}</span>
            <div className="toolbar-divider" />
            <button className="btn btn-neutral" onClick={handleUndoLine}>↶ Undo</button>
            <div className="toolbar-divider" />
            <button className="btn btn-split-off" onClick={() => setAllScissors('off')}>✂ All Off</button>
            <button className="btn btn-split-on"  onClick={() => setAllScissors('on')}>✂ All On</button>
            <button className="btn btn-split-doc" onClick={() => setAllScissors('document-split')}>✂ All Split</button>
            <button className="btn btn-primary" onClick={handleSubmit}>↓ Download</button>
          </>
        ) : (
          <span className="toolbar-spacer" />
        )}
      </header>

      {!pdfFile && <UploadPDF onUpload={setPdfFile} />}

      {pdfFile && (
        <PDFGrid
          pdfFile={pdfFile}
          pages={pages}
          setPages={setPages}
          setPageHeights={setPageHeights}
          setRenderedHeights={setRenderedHeights}
          setLineHistory={setLineHistory}
        />
      )}
    </div>
  )
}
