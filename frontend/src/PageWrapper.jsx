import { Page } from "react-pdf"
import { useEffect, useRef } from "react"
import { v4 as uuid } from "uuid"

export default function PageWrapper({
  pageNumber,
  pages,
  setPages,
  setPageHeights,
  setRenderedHeights,
  setLineHistory
}) {
  const pageData = pages[pageNumber] || {
    lines: [],
    pageEndCut: true
  }

  const overlayRef = useRef(null);

  const updatePage = (data) => {
    setPages(prev => ({
      ...prev,
      [pageNumber]: data
    }))
  }

  useEffect(() => {
    updatePage(pageData); //eslint-disable-next-line
  }, []);

  const handleClick = (e) => {
    const rect = overlayRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    
    const lineId = uuid()

    updatePage({
      ...pageData,
      lines: [...pageData.lines, { id: lineId, y }]
    })

    // Add to history
    setLineHistory(prev => [...prev, { pageNumber, lineId }])
  }

  return (
    <div className="page-wrapper" ref={overlayRef}>
      <div className="page-overlay" ref={overlayRef} onClick={handleClick}>
        <Page
          pageNumber={pageNumber}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onLoadSuccess={(page) => {
            setPageHeights(prev => ({
              ...prev,
              [pageNumber]: page.height
            }))
            // Store rendered height from DOM
            if (overlayRef.current) {
              const renderedHeight = overlayRef.current.getBoundingClientRect().height
              setRenderedHeights(prev => ({
                ...prev,
                [pageNumber]: renderedHeight
              }))
            }
          }}
        />

        {pageData.lines.map(line => (
          <div
            key={line.id}
            className="split-line"
            style={{ top: `${line.y}px` }}
          />
        ))}
      </div>

      <button
        className={`scissors ${pageData.pageEndCut ? "active" : ""}`}
        onClick={() =>
          updatePage({
            ...pageData,
            pageEndCut: !pageData.pageEndCut
          })
        }
      >
        ✂️
      </button>
    </div>
  )
}
