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
  const wrapperRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const updatePage = (data) => {
    setPages(prev => ({
      ...prev,
      [pageNumber]: data
    }))
  }

  useEffect(() => {
    updatePage(pageData); //eslint-disable-next-line
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '400px',
        threshold: 0.01
      }
    );

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => {
      if (wrapperRef.current) {
        observer.unobserve(wrapperRef.current);
      }
    };
  }, []);

  const handleClick = (e) => {
    if (!isVisible) return; // Prevent clicks on placeholder.
    
    const rect = overlayRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top

    // Check if click is near an existing line (within 10 pixels).
    const nearbyLine = pageData.lines.find(line => Math.abs(line.y - y) <= 10)

    if (nearbyLine) {
      // Clicking on existing line - cycle through states
      if (nearbyLine.stopDocument) {
        // If it's a stopDocument line, remove it.
        updatePage({
          ...pageData,
          lines: pageData.lines.filter(line => line.id !== nearbyLine.id)
        })
        // Remove from history.
        setLineHistory(prev => prev.filter(item => item.lineId !== nearbyLine.id))
      } else {
        // If it's a regular line, convert to stopDocument.
        updatePage({
          ...pageData,
          lines: pageData.lines.map(line => 
            line.id === nearbyLine.id 
              ? { ...line, stopDocument: true }
              : line
          )
        })
      }
      return
    }

    // No nearby line - create new line
    const lineId = uuid()

    updatePage({
      ...pageData,
      lines: [...pageData.lines, { id: lineId, y, stopDocument: false }]
    })

    // Add to history
    setLineHistory(prev => [...prev, { pageNumber, lineId }])
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
    <div className="page-wrapper" ref={wrapperRef}>
      <div className="page-overlay" ref={overlayRef} onClick={handleClick}>
        {isVisible ? (
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onLoadSuccess={(page) => {
              setPageHeights(prev => ({
                ...prev,
                [pageNumber]: page.height
              }))
              if (overlayRef.current) {
                const renderedHeight = overlayRef.current.getBoundingClientRect().height
                setRenderedHeights(prev => ({
                  ...prev,
                  [pageNumber]: renderedHeight
                }))
              }
            }}
          />
        ) : (
          <div style={{
            width: '220px',
            height: '300px',
            background: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px'
          }}>
            Page {pageNumber}
          </div>
        )}

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
