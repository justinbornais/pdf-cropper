import { useEffect, useRef, useState } from "react";
import CropBox from "./CropBox";
import PDFPage from "./PDFPage";

export default function PDFViewer({ pages, boxes, updateBox, scale, setScale }) {
  const containerRef = useRef();
  const [pageInfo, setPageInfo] = useState([]);

  // Compute initial scale.
  useEffect(() => {
    if (pages.length === 0) return;

    const firstPage = pages[0];
    const unscaled = firstPage.getViewport({ scale: 1 });
    const containerWidth = containerRef.current.clientWidth;

    setScale(containerWidth / unscaled.width);
  }, [pages.length]);

  const registerPage = (index) => (top, height) => {
    setPageInfo((prev) => {
      const copy = [...prev];
      copy[index] = { top, height };
      return copy;
    });
  };

  const totalHeight =
    pageInfo.length > 0
      ? pageInfo.reduce(
          (acc, p) => Math.max(acc, p.top + p.height),
          0
        )
      : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "50%",
        border: "1px solid #ccc",
        overflowY: "scroll",
        height: "90vh",
        margin: "2rem auto"
      }}
    >
      {pages.map((page, i) => (
        <PDFPage 
          key={i}
          index={i}
          page={page}
          scale={scale}
          onMeasure={registerPage(i)}
        />
      ))}

      {/* Render crop boxes */}
      {boxes.map((box) => (
        <CropBox
          key={box.id}
          box={box}
          updateBox={updateBox}
          containerHeight={totalHeight}
        />
      ))}
    </div>
  );
}
