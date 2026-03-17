import { useEffect, useRef, useState } from "react"
import { v4 as uuid } from "uuid"
import { renderPage } from "./api"

// Scale at which pages are rendered to PNG.
// 1.5 × 72 pt/inch = 108 ppi — sharp enough for screen, keeps file sizes small.
const RENDER_SCALE = 1.5

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
  const imgUrlRef  = useRef(null);           // track object URL for cleanup
  const [isVisible, setIsVisible] = useState(false);
  const [imgUrl, setImgUrl]       = useState(null);

  const updatePage = (data) => {
    setPages(prev => ({
      ...prev,
      [pageNumber]: data
    }))
  }

  useEffect(() => {
    updatePage(pageData); //eslint-disable-next-line
  }, []);

  // Revoke the object URL when the component unmounts to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imgUrlRef.current) URL.revokeObjectURL(imgUrlRef.current);
    };
  }, []);

  // Lazy-load via IntersectionObserver (unchanged from original)
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

  // Once the page scrolls into view, ask the worker to render it
  useEffect(() => {
    if (!isVisible) return;

    renderPage(pageNumber, RENDER_SCALE).then(({ pdfHeight, png }) => {
      // Store the actual PDF height (in points) for coordinate conversion
      setPageHeights(prev => ({ ...prev, [pageNumber]: pdfHeight }))

      // Create an object URL for the PNG and swap out the old one
      const url = URL.createObjectURL(new Blob([png], { type: "image/png" }))
      if (imgUrlRef.current) URL.revokeObjectURL(imgUrlRef.current);
      imgUrlRef.current = url;
      setImgUrl(url);
    });
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (e) => {
    if (!isVisible) return; // Prevent clicks on placeholder.
    
    const rect = overlayRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top

    // Check if click is near an existing line (within 10 pixels).
    const nearbyLine = pageData.lines.find(line => Math.abs(line.y - y) <= 10)

    if (nearbyLine) {
      // Clicking on existing line - cycle through states
      if (nearbyLine.stopDocument) {
        // If it is a stopDocument line, remove it.
        updatePage({
          ...pageData,
          lines: pageData.lines.filter(line => line.id !== nearbyLine.id)
        })
        // Remove from history.
        setLineHistory(prev => prev.filter(item => item.lineId !== nearbyLine.id))
      } else {
        // If it is a regular line, convert to stopDocument.
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
      <div className="page-card">
        <div className="page-overlay" ref={overlayRef} onClick={handleClick}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={`Page ${pageNumber}`}
              style={{ width: "100%", display: "block" }}
              onLoad={() => {
                // Measure the rendered CSS height for coordinate conversion
                if (overlayRef.current) {
                  const renderedHeight = overlayRef.current.getBoundingClientRect().height
                  setRenderedHeights(prev => ({ ...prev, [pageNumber]: renderedHeight }))
                }
              }}
            />
          ) : (
            <div className="page-placeholder" />
          )}

          <span className="page-number-badge">{pageNumber}</span>

          {pageData.lines.map(line => (
            <div
              key={line.id}
              className={`split-line ${line.stopDocument ? 'document-split' : ''}`}
              style={{ top: `${line.y}px` }}
            />
          ))}
        </div>
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
