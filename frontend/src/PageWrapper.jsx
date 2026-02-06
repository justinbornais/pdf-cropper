import { Page } from "react-pdf"
import { useEffect, useRef, useState } from "react"
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
    pageEndCut: 'on' // 'off', 'on', or 'document-split'
  }

  const overlayRef = useRef(null);
  const [lastClick, setLastClick] = useState(null);

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
    const now = Date.now()

    // Check for double-click within proximity
    if (lastClick && 
        Math.abs(lastClick.y - y) <= 10 && 
        now - lastClick.time < 500) {
      
      // Find the line that was just created
      const lastLine = pageData.lines[pageData.lines.length - 1]
      if (lastLine) {
        // Convert to document split (purple line)
        updatePage({
          ...pageData,
          lines: pageData.lines.map(line => 
            line.id === lastLine.id 
              ? { ...line, stopDocument: true }
              : line
          )
        })
      }
      
      setLastClick(null) // Reset after double-click
      return
    }

    // Single click - add new line
    const lineId = uuid()

    updatePage({
      ...pageData,
      lines: [...pageData.lines, { id: lineId, y, stopDocument: false }]
    })

    // Add to history
    setLineHistory(prev => [...prev, { pageNumber, lineId }])
    
    // Track this click for double-click detection
    setLastClick({ y, time: now })
  }

  const cycleScissorsState = () => {
    const states = ['off', 'on', 'document-split']
    const currentIndex = states.indexOf(pageData.pageEndCut)
    const nextIndex = (currentIndex + 1) % states.length
    
    updatePage({
      ...pageData,
      pageEndCut: states[nextIndex]
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
            className={`split-line ${line.stopDocument ? 'document-split' : ''}`}
            style={{ top: `${line.y}px` }}
          />
        ))}
      </div>

      <button
        className={`scissors ${pageData.pageEndCut === 'on' ? 'active' : ''} ${pageData.pageEndCut === 'document-split' ? 'document-split' : ''}`}
        onClick={cycleScissorsState}
        title={pageData.pageEndCut === 'off' ? 'Off' : pageData.pageEndCut === 'on' ? 'Page End' : 'Document Split'}
      >
        ✂️
      </button>
    </div>
  )
}
