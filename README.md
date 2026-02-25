# pdf-cropper
Lightweight web app to split, merge, and crop PDF hymnals while preserving vector content.

**Quick start**
- **Frontend:** run `npm run start` from the `frontend` folder to start the React UI.
- **Backend (dev):** run `uvicorn app:app --reload` from the `backend` folder to start the FastAPI server.

**Deployment**
- **Python deps:** install from `backend/requirements.txt`.
- **Production server (recommended):** use `uvicorn` with a process manager or an ASGI server behind a reverse proxy. Example (from `backend`):

```bash
pip install -r requirements.txt
# run with multiple workers via gunicorn+uvicorn workers (example)
gunicorn -k uvicorn.workers.UvicornWorker app:app -w 4 --bind 0.0.0.0:8000
# or default usage
uvicorn app:app --reload
```

- **Containerized:** build a small image using the `backend` folder, install `requirements.txt`, expose port 8000, and run the ASGI server. Serve the `frontend` build with any static host or web server and configure CORS origins in `backend/app.py` as needed.

**Usage**
- **Upload:** use the frontend to upload a PDF; the server returns a `pdf_id` stored in the `uploads` folder.
- **Define splits/merges:** the `/split` API accepts a `SplitRequest` with `splits` (see `backend/app.py` for the `HymnSplit` model). Each `HymnSplit` has `start_page`, `start_y`, `end_page`, `end_y`, and optional `stopDocument`.

- **Arbitrary page-splitting:** you can split anywhere — inside a page or between pages — by specifying fractional `start_y`/`end_y` coordinates and 1-based page numbers. The backend will extract exactly the rectangular regions you request and compose them into new PDF pages sized to letter (optionally changeable in `app.py`).

- **Document-splitting:** set `stopDocument=true` on a `HymnSplit` to force a new output PDF document boundary at that split. Without `stopDocument`, sequential splits will be composed into the same output PDF until a boundary is reached.

- **Merging pages without quality loss:** when a split spans multiple source pages (for example, merging the bottom of page 1 with the top of page 2), the service extracts the original PDF vector content and places it into a single output page at a scaled resolution that preserves vectors and text (no bitmap rasterization). This retains quality and vector graphics.

- **Output:** the server zips generated PDFs and returns a single ZIP file for download.

**Files**
- `backend/app.py`: main FastAPI backend implementing upload and split logic. See the `HymnSplit` and `SplitRequest` models.
- `backend/requirements.txt`: pinned dependencies for the backend.
- `frontend/`: React app and UI.

If you want version pins added to `backend/requirements.txt` or a Dockerfile + example `docker-compose.yml`, tell me and I will add them.