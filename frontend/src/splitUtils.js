export function generateSplits(pages, pageHeights, renderedHeights) {
    const splits = []
    let currentStart = { page: 1, y: 0 }
  
    // Get all page numbers that have been loaded (from pageHeights)
    const allPageNumbers = Object.keys(pageHeights)
      .map(Number)
      .sort((a, b) => a - b)
    
    if (allPageNumbers.length === 0) {
      console.warn('No pages loaded yet')
      return splits
    }
  
    allPageNumbers.forEach(pageNum => {
      // Get page data or use defaults
      const page = pages[pageNum] || {
        lines: [],
        pageEndCut: 'on'
      }
      
      const lines = [...page.lines].sort((a, b) => a.y - b.y)
      
      // Calculate scale factor: actual PDF height / rendered height
      const actualHeight = pageHeights[pageNum]
      const renderedHeight = renderedHeights[pageNum]
      
      if (!actualHeight || !renderedHeight) {
        console.warn(`Missing height data for page ${pageNum}`)
        return
      }
      
      const scaleFactor = actualHeight / renderedHeight
  
      lines.forEach(line => {
        // Convert frontend y-coordinate to actual PDF coordinate
        const actualY = line.y * scaleFactor
        
        splits.push({
          start_page: currentStart.page,
          start_y: currentStart.y,
          end_page: pageNum,
          end_y: actualY,
          stopDocument: line.stopDocument || false
        })
  
        currentStart = { page: pageNum, y: actualY }
      })
  
      if (page.pageEndCut !== 'off') {
        // Create a split from current position to end of page
        splits.push({
          start_page: currentStart.page,
          start_y: currentStart.y,
          end_page: pageNum,
          end_y: actualHeight,
          stopDocument: page.pageEndCut === 'document-split'
        })
  
        currentStart = { page: pageNum + 1, y: 0 }
      }
    })
  
    return splits
}
