import { Page } from "react-pdf"
import { v4 as uuid } from "uuid"

export default function PageWrapper({
  pageNumber,
  pages,
  setPages,
  setPageHeights
}) {
  const pageData = pages[pageNumber] || {
    lines: [],
    pageEndCut: false
  }

  const updatePage = (data) => {
    setPages(prev => ({
      ...prev,
      [pageNumber]: data
    }))
  }

  const handleClick = (e) => {
    const rect = e.target.getBoundingClientRect()
    const y = e.clientY - rect.top

    updatePage({
      ...pageData,
      lines: [...pageData.lines, { id: uuid(), y }]
    })
  }

  return (
    <div className="page-wrapper">
      <Page
        pageNumber={pageNumber}
        onClick={handleClick}
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
