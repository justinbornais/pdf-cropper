import { useRef, useState } from "react";

export default function CropBox({ box, updateBox, containerHeight }) {
  const boxRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [resizingTop, setResizingTop] = useState(false);
  const [resizingBottom, setResizingBottom] = useState(false);
  const startY = useRef(0);
  const startTop = useRef(0);
  const startHeight = useRef(0);

  const onMouseDown = (e) => {
    if (e.target.dataset.resize === "top") {
      setResizingTop(true);
    } else if (e.target.dataset.resize === "bottom") {
      setResizingBottom(true);
    } else {
      setDragging(true);
    }
    startY.current = e.clientY;
    startTop.current = box.top;
    startHeight.current = box.height;
  };

  const onMouseMove = (e) => {
    if (!dragging && !resizingTop && !resizingBottom) return;

    const dy = e.clientY - startY.current;

    if (dragging) {
      updateBox(box.id, {
        top: Math.max(0, Math.min(containerHeight - box.height, startTop.current + dy))
      });
    }

    if (resizingTop) {
      let newTop = startTop.current + dy;
      let newHeight = startHeight.current - dy;

      if (newHeight >= 30 && newTop >= 0) {
        updateBox(box.id, { top: newTop, height: newHeight });
      }
    }

    if (resizingBottom) {
      let newHeight = startHeight.current + dy;

      if (newHeight >= 30 && box.top + newHeight <= containerHeight) {
        updateBox(box.id, { height: newHeight });
      }
    }
  };

  const onMouseUp = () => {
    setDragging(false);
    setResizingTop(false);
    setResizingBottom(false);
  };

  return (
    <div
      ref={boxRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        position: "absolute",
        left: 0,
        top: box.top,
        width: "100%",
        height: box.height,
        border: "2px solid red",
        backgroundColor: "rgba(255,0,0,0.1)",
        cursor: dragging ? "grabbing" : "grab"
      }}
    >
      {/* Top resize handle */}
      <div
        data-resize="top"
        style={{
          position: "absolute",
          top: -4,
          left: 0,
          width: "100%",
          height: 8,
          background: "rgba(0,0,0,0.2)",
          cursor: "ns-resize"
        }}
      />

      {/* Bottom resize handle */}
      <div
        data-resize="bottom"
        style={{
          position: "absolute",
          bottom: -4,
          left: 0,
          width: "100%",
          height: 8,
          background: "rgba(0,0,0,0.2)",
          cursor: "ns-resize"
        }}
      />
    </div>
  );
}