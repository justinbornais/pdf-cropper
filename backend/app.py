from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import fitz  # PyMuPDF
import os
import tempfile
import uuid
import zipfile
from typing import List, Optional

app = FastAPI(title="PDF Hymnal Splitter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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
    stopDocument: Optional[bool] = False

class SplitRequest(BaseModel):
    pdf_id: str
    splits: List[HymnSplit]

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# -----------------------------
# Core PDF Logic
# -----------------------------

def split_hymns(
    src_pdf_path: str,
    hymns: List[HymnSplit],
    output_dir: str,
    base_name: str,
):
    """
    Split a source PDF into multiple PDFs based on stopDocument flags.
    Returns a list of output file paths.
    """
    src = fitz.open(src_pdf_path)
    output_files = []
    
    current_doc = fitz.open()
    doc_index = 0

    for i, hymn in enumerate(hymns):
        if hymn.start_page > hymn.end_page:
            raise ValueError("start_page must be <= end_page")

        # Convert 1-based page numbers to 0-based indices
        start_idx = hymn.start_page - 1
        end_idx = hymn.end_page - 1

        # Collect all content rectangles for this hymn
        total_height = 0
        page_width = 0
        
        for page_num in range(start_idx, end_idx + 1):
            if page_num < 0 or page_num >= len(src):
                raise ValueError(f"Invalid page number: {page_num + 1}")

            src_page = src[page_num]
            page_height = src_page.rect.height
            page_width = max(page_width, src_page.rect.width)

            # Determine the height contribution from this page
            if hymn.start_page == hymn.end_page:
                # Single-page hymn
                total_height = hymn.end_y - hymn.start_y
            elif page_num == start_idx:
                # First page: from start_y to bottom
                total_height += page_height - hymn.start_y
            elif page_num == end_idx:
                # Last page: from top to end_y
                total_height += hymn.end_y
            else:
                # Middle page: full height
                total_height += page_height

        # Calculate scale factor to fit within letter size
        scale_x = LETTER_WIDTH / page_width if page_width > LETTER_WIDTH else 1.0
        scale_y = LETTER_HEIGHT / total_height if total_height > LETTER_HEIGHT else 1.0
        scale = min(scale_x, scale_y)

        # Calculate final dimensions
        final_width = page_width * scale
        final_height = total_height * scale

        # Create output page
        out_page = current_doc.new_page(width=LETTER_WIDTH, height=LETTER_HEIGHT)

        # Center content horizontally
        x_offset = (LETTER_WIDTH - final_width) / 2
        y_offset = 0

        # Draw each page section
        y_cursor = y_offset
        
        for page_num in range(start_idx, end_idx + 1):
            src_page = src[page_num]
            page_height = src_page.rect.height
            page_width = src_page.rect.width

            # Determine clip rectangle for this page
            if hymn.start_page == hymn.end_page:
                # Single-page hymn
                clip = fitz.Rect(0, hymn.start_y, page_width, hymn.end_y)
            elif page_num == start_idx:
                # First page
                clip = fitz.Rect(0, hymn.start_y, page_width, page_height)
            elif page_num == end_idx:
                # Last page
                clip = fitz.Rect(0, 0, page_width, hymn.end_y)
            else:
                # Middle full page
                clip = src_page.rect

            # Calculate target rectangle
            clip_height = clip.height
            scaled_height = clip_height * scale
            
            target_rect = fitz.Rect(
                x_offset,
                y_cursor,
                x_offset + final_width,
                y_cursor + scaled_height
            )

            # Draw the page section
            out_page.show_pdf_page(
                target_rect,
                src,
                page_num,
                clip=clip,
            )

            y_cursor += scaled_height

        # Check if this is a document boundary
        if hymn.stopDocument or i == len(hymns) - 1:
            # Save current document
            output_path = os.path.join(output_dir, f"{base_name}-{doc_index}.pdf")
            current_doc.save(output_path)
            output_files.append(output_path)
            current_doc.close()
            
            # Start new document if not the last split
            if i < len(hymns) - 1:
                current_doc = fitz.open()
                doc_index += 1

    src.close()
    return output_files


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
async def split_pdf(request: SplitRequest):
    """
    Split a PDF hymnal into multiple PDFs using user-defined regions.
    Returns a zip file containing all generated PDFs.

    The frontend must supply:
    - pdf_id: the uploaded PDF identifier
    - splits: list of HymnSplit objects with start_page, start_y, end_page, end_y, stopDocument

    Page numbers are 1-based.
    Coordinates are in PyMuPDF/PDF.js space (origin top-left, y increases downward).
    """
    print(f"Received request: pdf_id={request.pdf_id}")
    
    if not request.splits:
        raise HTTPException(status_code=400, detail="No split regions provided")

    input_path = os.path.join(UPLOAD_DIR, request.pdf_id)
    
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail=f"PDF not found: {request.pdf_id}")

    # Generate output directory
    base_name = os.path.splitext(request.pdf_id)[0]
    
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            output_files = split_hymns(input_path, request.splits, tmpdir, base_name)
        except Exception as e:
            import traceback
            print(f"Error splitting PDF: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))

        # Create zip file
        zip_path = os.path.join(UPLOAD_DIR, f"{base_name}-output.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for pdf_file in output_files:
                zipf.write(pdf_file, os.path.basename(pdf_file))

        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename="split_hymns.zip",
        )
