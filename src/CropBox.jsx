import { useEffect, useRef, useState } from "react";

export default function CropBox({ box, updateBox, containerHeight }) {
  const dragging = useRef(false);
  const resizingTop = useRef(false);
  const resizingBottom = useRef(false);

  const startY = useRef(0);
  const startTop = useRef(0);
  const startHeight = useRef(0);

  const onMouseDown = (e) => {
    startY.current = e.clientY;
    startTop.current = box.top;
    startHeight.current = box.height;

    if (e.target.dataset.resize === "top") {
      resizingTop.current = true;
    } else if (e.target.dataset.resize === "bottom") {
      resizingBottom.current = true;
    } else {
      dragging.current = true;
    }

    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      const dy = e.clientY - startY.current;

      if (dragging.current) {
        updateBox(box.id, {
          top: Math.max(
            0,
            Math.min(containerHeight - box.height, startTop.current + dy)
          )
        });
      }

      if (resizingTop.current) {
        const newTop = startTop.current + dy;
        const newHeight = startHeight.current - dy;

        if (newHeight > 40 && newTop >= 0) {
          updateBox(box.id, { top: newTop, height: newHeight });
        }
      }

      if (resizingBottom.current) {
        const newHeight = startHeight.current + dy;
        if (newHeight > 40 && box.top + newHeight <= containerHeight) {
          updateBox(box.id, { height: newHeight });
        }
      }
    };

    const onMouseUp = () => {
      dragging.current = false;
      resizingTop.current = false;
      resizingBottom.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [box, updateBox, containerHeight]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: box.top,
        width: "100%",
        height: box.height,
        background: "rgba(255,0,0,0.15)",
        border: "2px solid red"
      }}
      onMouseDown={onMouseDown}
    >
      {/* Resize Top */}
      <div
        data-resize="top"
        style={{
          position: "absolute",
          top: -5,
          left: 0,
          height: 10,
          width: "100%",
          cursor: "ns-resize",
          background: "transparent"
        }}
      />
      {/* Resize Bottom */}
      <div
        data-resize="bottom"
        style={{
          position: "absolute",
          bottom: -5,
          left: 0,
          height: 10,
          width: "100%",
          cursor: "ns-resize",
          background: "transparent"
        }}
      />
    </div>
  );
}
