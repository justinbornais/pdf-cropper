import { useEffect, useRef, useState } from "react";
import CropBox from "./CropBox";

export default function PDFViewer({ pages, boxes, updateBox }) {
  const containerRef = useRef();
  const [pageInfo, setPageInfo] = useState([]);

  useEffect(() => {
    const load = async () => {
      const info = [];
      let cumulativeTop = 0;

      for (const page of pages) {
        const viewport = page.getViewport({ scale: 1.5 });

        info.push({
          page,
          viewport,
          top: cumulativeTop,
          height: viewport.height
        });

        cumulativeTop += viewport.height;
      }
      setPageInfo(info);
    };

    load();
  }, [pages]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "80vw",
        border: "1px solid #ccc",
        overflowY: "scroll",
        height: "90vh",
        margin: "2rem auto"
      }}
    >
      {/* Render pages */}
      {pageInfo.map((p, idx) => (
        <canvas
          key={idx}
          ref={async (canvas) => {
            if (!canvas) return;
            const ctx = canvas.getContext("2d");

            canvas.width = p.viewport.width;
            canvas.height = p.viewport.height;

            await p.page.render({
              canvasContext: ctx,
              viewport: p.viewport
            }).promise;
          }}
          style={{
            position: "absolute",
            top: p.top,
            left: 0
          }}
        />
      ))}

      {/* Render crop boxes */}
      {boxes.map((box) => (
        <CropBox
          key={box.id}
          box={box}
          updateBox={updateBox}
          containerHeight={
            pageInfo.length > 0
              ? pageInfo[pageInfo.length - 1].top +
                pageInfo[pageInfo.length - 1].height
              : 0
          }
        />
      ))}
    </div>
  );
}
