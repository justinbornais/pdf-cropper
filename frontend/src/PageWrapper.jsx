import { Page } from "react-pdf"
import { useRef } from "react"
import { v4 as uuid } from "uuid"

export default function PageWrapper({
  pageNumber,
  pages,
  setPages,
  setPageHeights
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

  const handleClick = (e) => {
    const rect = overlayRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top

    updatePage({
      ...pageData,
      lines: [...pageData.lines, { id: uuid(), y }]
    })
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
