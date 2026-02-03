export function generateSplits(pages, pageHeights) {
    const splits = []
    let currentStart = { page: 1, y: 0 }
  
    const sortedPages = Object.keys(pages)
      .map(Number)
      .sort((a, b) => a - b)
  
    sortedPages.forEach(pageNum => {
      const page = pages[pageNum]
      const lines = [...page.lines].sort((a, b) => a.y - b.y)
  
      lines.forEach(line => {
        splits.push({
          start_page: currentStart.page,
          start_y: currentStart.y,
          end_page: pageNum,
          end_y: line.y
        })
  
        currentStart = { page: pageNum, y: line.y }
      })
  
      if (page.pageEndCut) {
        splits.push({
          start_page: currentStart.page,
          start_y: currentStart.y,
          end_page: pageNum,
          end_y: pageHeights[pageNum]
        })
  
        currentStart = { page: pageNum + 1, y: 0 }
      }
    })
  
    return splits
  }
  