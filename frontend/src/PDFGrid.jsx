import { Document } from "react-pdf"
import { useState } from "react"
import PageWrapper from "./PageWrapper"

export default function PDFGrid({
  pdfId,
  pages,
  setPages,
  setPageHeights,
  setRenderedHeights,
  setLineHistory
}) {
  const [numPages, setNumPages] = useState(null)

  const onLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <Document
      file={`http://localhost:8000/uploads/${pdfId}`}
      onLoadSuccess={onLoadSuccess}
    >
      <div className="grid">
        {Array.from(new Array(numPages), (_, i) => (
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
    </Document>
  );
}
