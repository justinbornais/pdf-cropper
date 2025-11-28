import jsPDF from "jspdf";

// LETTER (change to A4 if you want)
const PAGE_WIDTH = 612;  // 8.5 inch × 72dpi
const PAGE_HEIGHT = 792; // 11 inch × 72dpi

export async function generateFinalPDF({ pages, boxes, scale }) {

  const pixelScale = 3; // Larger value = higher resolution.

  const pdf = new jsPDF({
    unit: "pt",
    format: [PAGE_WIDTH, PAGE_HEIGHT]
  });

  for (let i = 0; i < boxes.length; i++) {
    const { top, height } = boxes[i];

    // 1. Render FULL PDF page at scale=1 (true pixels).
    const page = pages[0];
    const tempVP = page.getViewport({ scale: 1 });

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = tempVP.width * pixelScale;
    fullCanvas.height = tempVP.height * pages.length * pixelScale;
    const fullCtx = fullCanvas.getContext("2d");

    let yOffset = 0;
    for (const p of pages) {
      const vp = p.getViewport({ scale: pixelScale });
      const c = document.createElement("canvas");
      c.width = vp.width;
      c.height = vp.height;
      await p.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;

      fullCtx.drawImage(c, 0, yOffset);
      yOffset += vp.height;
    }

    // 2. Convert crop box coords into unscaled PDF pixel coords.
    const cropTopPx = (top / scale) * pixelScale;
    const cropHeightPx = (height / scale) * pixelScale;
    const cropWidthPx = fullCanvas.width;

    // 3. Crop the image data.
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidthPx;
    cropCanvas.height = cropHeightPx;

    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(
      fullCanvas,
      0, cropTopPx, cropWidthPx, cropHeightPx,
      0, 0, cropWidthPx, cropHeightPx
    );

    const imgData = cropCanvas.toDataURL("image/png", 0.95);

    // 4. Fit into the PDF page with padding.
    const contentW = cropCanvas.width;
    const contentH = cropCanvas.height;
    const aspect = contentW / contentH;
    const pageAspect = PAGE_WIDTH / PAGE_HEIGHT;

    let drawW, drawH;

    // Fit width and height.
    if (aspect > pageAspect) {
      drawW = PAGE_WIDTH;
      drawH = PAGE_WIDTH / aspect;
    } else {
      drawH = PAGE_HEIGHT;
      drawW = PAGE_HEIGHT * aspect;
    }

    drawW = Math.max(1, Math.round(drawW));
    drawH = Math.max(1, Math.round(drawH));
    
    const padX = (PAGE_WIDTH - drawW) / 2;
    const padY = (PAGE_HEIGHT - drawH) / 2;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", padX, padY, drawW, drawH);
  }

  pdf.save("cropped_output.pdf");
}
