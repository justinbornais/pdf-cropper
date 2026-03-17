import { useState, useEffect } from "react"
import PageWrapper from "./PageWrapper"
import { loadPdf } from "./api"

export default function PDFGrid({
  pdfFile,
  pages,
  setPages,
  setPageHeights,
  setRenderedHeights,
  setLineHistory
}) {
  const [numPages, setNumPages] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!pdfFile) return
    setNumPages(null)
    setLoadError(null)

    // Read the file once and transfer the buffer into the worker (zero-copy).
    pdfFile.arrayBuffer().then((buffer) => {
      loadPdf(buffer).then((result) => {
        if (result.type === "ERROR" || !result.numPages) {
          console.error("PDF load error:", result.error)
          setLoadError(result.error || "Failed to load PDF — check the browser console for details.")
          return
        }
        setNumPages(result.numPages)
      })
    })
  }, [pdfFile])

  if (loadError) return <div className="loading" style={{ color: "red" }}>Error: {loadError}</div>
  if (!numPages) return <div className="loading">Loading PDF…</div>

  return (
    <div className="grid">
      {Array.from({ length: numPages }, (_, i) => (
        <PageWrapper
          key={i + 1}
          pageNumber={i + 1}
          pages={pages}
          setPages={setPages}
          setPageHeights={setPageHeights}
          setRenderedHeights={setRenderedHeights}
          setLineHistory={setLineHistory}
        />
      ))}
    </div>
  )
}

