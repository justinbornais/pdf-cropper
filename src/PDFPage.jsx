// PDFPage.jsx
import { useEffect, useRef } from "react";

export default function PDFPage({ page, scale, index, onMeasure }) {
  const canvasRef = useRef();
  const wrapperRef = useRef();

  useEffect(() => {
    const render = async () => {
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // After rendering, measure.
      const rect = wrapperRef.current.getBoundingClientRect();
      const parentRect = wrapperRef.current.parentElement.getBoundingClientRect();

      const top = wrapperRef.current.offsetTop; // Top relative to viewer container.
      const height = rect.height;

      onMeasure(top, height);
    };

    render();
  }, [page, scale]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
