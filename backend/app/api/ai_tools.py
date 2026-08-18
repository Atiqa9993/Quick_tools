"""
app/api/ai_tools.py
===================
OCR endpoint — image-to-text, handwriting, bulk OCR.
"""
import io
import base64

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import anyio
from PIL import Image

from app.utils.ml_sessions import run_local_ocr

router = APIRouter()


@router.post("/api/ocr")
async def ocr_endpoint(
    file:        UploadFile = File(None),
    base64_data: str        = Form(None),
    mime_type:   str        = Form(None),
):
    """
    General OCR (Image → Text).
    Accepts file upload OR base64-encoded image.
    Runs Tesseract + TrOCR in thread pool — does not block the event loop.
    Returns: {"text": "..."}
    """
    try:
        if file and file.filename:
            raw = await file.read()
            img = Image.open(io.BytesIO(raw))
        elif base64_data:
            img = Image.open(io.BytesIO(base64.b64decode(base64_data)))
        else:
            raise HTTPException(status_code=400, detail="No image provided.")

        # CPU-heavy OCR → thread pool
        text = await anyio.to_thread.run_sync(run_local_ocr, img)

        if not text:
            return {"text": "", "warning": "No text could be extracted."}
        return {"text": text}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
