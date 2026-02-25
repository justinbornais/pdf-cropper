# pdf-cropper
Lightweight web app to split, merge, and crop PDF hymnals while preserving vector content.

## Quick Start
- **Frontend:** run `npm run start` from the `frontend` folder to start the React UI.
- **Backend (dev):** run `uvicorn app:app --reload` from the `backend` folder to start the FastAPI server.

### Deployment
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

### Usage
Upload a PDF using the frontend application, which will save the file inside an `uploads` folder for the backend named with a specific ID.

The webpage will render each page of the PDF in a grid, with scissors icons in between each page. The colors of the icon mean the following:
- **Transparent:** The page will not split. This means the first page will merge with the second page to create one large page.
- **Red (default):** The page will split. This is the default option, as it makes sense upon starting that each page should be separate.
- **Purple:** The PDF will end with the left page, and a new document will begin with the next page.

There are also three buttons at the top of the page that control the scissors icons:
- **All Off:** Makes all scissors transparent. This effectively means all pages will become one.
- **All On:** Makes all scissors red.
- **All Split:** Makes all scissors purple.

You can then click anywhere on the page to specify **page splits** (red) or **document splits** (purple). The behavior is as follows:
- Clicking once on the page will draw a **red** line, indicating the page will be split into two pages at that point.
- Clicking a red line will turn it **purple**, indicating the document itself will end at that point, and a new document will start below.
- Clicking a purple line will remove it entirely.
- You may also press **Undo line** (or `Ctrl + Z`) to undo the last line you clicked.

Once you are done, click **Submit Splits** and you will be given a ZIP file.

An example usage scenario:

> I have a two-page PDF containing three hymns. The second hymn starts in the middle of the first page, and ends in the middle of the second page.
>
> If I wanted to split this PDF into three separate PDF documents, I would do the following:
> 1. Draw a purple line right above the beginning of the second hymn.
> 2. Turn the scissors icon off (transparent).
> 3. Draw a purple line above the beginning of the third hymn.
>
> This will result in a ZIP containing three PDFs: one with the first hymn only, one with the second hymn (both sections merged into one page), and one with the third hymn only.