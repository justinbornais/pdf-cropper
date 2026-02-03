from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import fitz  # PyMuPDF
import os
import tempfile
import uuid
from typing import List

app = FastAPI(title="PDF Hymnal Splitter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Letter size in PDF points (72 DPI)
DPI = 72
LETTER_WIDTH = 8.5 * DPI
LETTER_HEIGHT = 11 * DPI

# -----------------------------
# Data Models
# -----------------------------

class HymnSplit(BaseModel):
    start_page: int
    start_y: float
    end_page: int
    end_y: float

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# -----------------------------
# Core PDF Logic
# -----------------------------

def split_hymns(
    src_pdf_path: str,
    hymns: List[HymnSplit],
    out_pdf_path: str,
):
    """
    Split a source PDF into a new PDF using lossless vector clipping.
    Each HymnSplit may span multiple pages and start/end mid-page.
    """
    src = fitz.open(src_pdf_path)
    out = fitz.open()

    for hymn in hymns:
        if hymn.start_page > hymn.end_page:
            raise ValueError("start_page must be <= end_page")

        for page_num in range(hymn.start_page, hymn.end_page + 1):
            if page_num < 0 or page_num >= len(src):
                raise ValueError(f"Invalid page number: {page_num}")

            src_page = src[page_num]
            page_height = src_page.rect.height
            page_width = src_page.rect.width

            # Determine clip rectangle for this page
            if hymn.start_page == hymn.end_page:
                # Single-page hymn
                clip = fitz.Rect(
                    0,
                    hymn.start_y,
                    page_width,
                    hymn.end_y,
                )
            elif page_num == hymn.start_page:
                # First page
                clip = fitz.Rect(
                    0,
                    hymn.start_y,
                    page_width,
                    page_height,
                )
            elif page_num == hymn.end_page:
                # Last page
                clip = fitz.Rect(
                    0,
                    0,
                    page_width,
                    hymn.end_y,
                )
            else:
                # Middle full page
                clip = src_page.rect

            # Paginate vertically into Letter pages
            remaining_height = clip.height
            y_cursor = clip.y0

            while remaining_height > 0:
                slice_height = min(LETTER_HEIGHT, remaining_height)

                slice_clip = fitz.Rect(
                    0,
                    y_cursor,
                    page_width,
                    y_cursor + slice_height,
                )

                out_page = out.new_page(
                    width=LETTER_WIDTH,
                    height=LETTER_HEIGHT,
                )

                out_page.show_pdf_page(
                    out_page.rect,
                    src,
                    page_num,
                    clip=slice_clip,
                )

                y_cursor += slice_height
                remaining_height -= slice_height

    out.save(out_pdf_path)
    out.close()
    src.close()


# -----------------------------
# API Endpoint
# -----------------------------

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs allowed")

    pdf_id = f"{uuid.uuid4()}.pdf"
    out_path = os.path.join(UPLOAD_DIR, pdf_id)

    with open(out_path, "wb") as f:
        f.write(await file.read())

    return {
        "pdf_id": pdf_id,
        "filename": file.filename,
    }

@app.get("/uploads/{filename}")
def get_pdf(filename: str):
    return FileResponse(f"uploads/{filename}", media_type="application/pdf")

@app.post("/split")
async def split_pdf(
    pdf: UploadFile = File(...),
    splits: List[HymnSplit] = [],
):
    """
    Split a PDF hymnal into a new PDF using user-defined regions.

    The frontend must supply:
    - start_page, start_y
    - end_page, end_y

    Coordinates are expected in PyMuPDF/PDF.js space
    (origin top-left, y increases downward).
    """
    if not splits:
        raise HTTPException(status_code=400, detail="No split regions provided")

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.pdf")
        output_path = os.path.join(tmpdir, "output.pdf")

        # Save uploaded PDF
        with open(input_path, "wb") as f:
            f.write(await pdf.read())

        try:
            split_hymns(input_path, splits, output_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename="split_hymns.pdf",
        )
