"""
==============================================================================
QuickTools API - Python Backend
This file contains the FastAPI endpoints for all heavy computational tasks
including PDF processing, AI text extraction, and advanced Image manipulation.
==============================================================================
"""

# ==============================================================================
# SECTION 1: IMPORTS & SYSTEM CONFIGURATION
# ==============================================================================
import io
from PIL import Image, ImageFilter, ImageColor
try:
    from rembg import remove
except ImportError:
    pass
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass
import sys
import zipfile
import math

# Force utf-8 encoding to prevent crash during model download progress bars on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import fitz  # PyMuPDF
import pikepdf
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="QuickTools API", version="1.0.0")

# Configure CORS so Next.js frontend can communicate with it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"], # Add your frontend URLs here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# ==============================================================================
# SECTION 2: HEALTH & TEST ENDPOINTS
# Basic endpoints to verify the server is running and accepting requests.
# ==============================================================================

@app.get("/")
def read_root():
    return {"message": "Welcome to QuickTools Python Backend API"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "QuickTools API"}

# Example endpoint for future tools
@app.post("/api/tools/upload-test")
async def upload_test(file: UploadFile = File(...)):
    # This is just a test endpoint to verify file uploads work
    content_type = file.content_type
    filename = file.filename
    size = 0
    # read file size
    contents = await file.read()
    size = len(contents)
    
    return {
        "filename": filename,
        "content_type": content_type,
        "size_bytes": size,
        "message": "File received successfully by Python Backend!"
    }

# ==============================================================================
# SECTION 3: PDF TOOLS
# Endpoints for compressing, converting, merging, and splitting PDF documents.
# We utilize PyMuPDF (fitz) for fast, lightweight PDF processing.
# ==============================================================================

from typing import Optional

# Configuration for PDF Uploads
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB limit


def sanitize_pdf_bytes(pdf_bytes: bytes) -> bytes:
    """
    Sanitizes PDF bytes using pikepdf to remove linearization ("fast web view")
    structures that cause PyMuPDF (fitz) to throw 'code=4: Linearisation is no longer supported'.
    Returns sanitized PDF bytes. Raises HTTPException(400) if pikepdf cannot parse the file.
    """
    try:
        pdf_stream = io.BytesIO(pdf_bytes)
        with pikepdf.Pdf.open(pdf_stream) as pdf:
            out_buf = io.BytesIO()
            pdf.save(out_buf, linearize=False)
            return out_buf.getvalue()
    except (pikepdf.PdfError, pikepdf.DataDecodingError) as e:
        print(f"[pikepdf] Error opening/saving PDF: {e}")
        raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[pikepdf] Sanitization error: {e}")
        raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file")


def safe_fitz_open(pdf_bytes: bytes) -> fitz.Document:
    """
    Safely opens a PDF document with PyMuPDF (fitz) after passing it through sanitize_pdf_bytes().
    Catches linearization errors and provides a fallback retry mechanism.
    """
    sanitized = pdf_bytes
    try:
        sanitized = sanitize_pdf_bytes(pdf_bytes)
    except Exception:
        pass

    try:
        return fitz.open(stream=sanitized, filetype="pdf")
    except Exception as e:
        # Fallback retry with sanitize_pdf_bytes explicitly
        try:
            retry_bytes = sanitize_pdf_bytes(pdf_bytes)
            return fitz.open(stream=retry_bytes, filetype="pdf")
        except Exception as err:
            print(f"[fitz] Failed to open PDF: {err}")
            raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file")

def _has_text_content(doc: fitz.Document) -> bool:
    """
    Checks if a PDF document contains real extractable text.
    Returns True if text content is found, False if it's purely scanned/image-only.
    """
    total_chars = 0
    for page in doc:
        text = page.get_text()
        total_chars += len(text.strip())
        if total_chars > 20:  # Threshold for non-trivial text
            return True
    return total_chars > 0


def _recompress_images_in_pdf(pdf_bytes: bytes, jpeg_quality: int, max_dim: int = 0) -> bytes:
    """
    Strategy: In-place image recompression.
    Opens a PDF, finds every embedded image, recompresses it as a smaller
    JPEG (or optimized PNG for diagram-like images), optionally downscales,
    and replaces it inside the document. Text/vector content is preserved
    untouched, so the file stays selectable/searchable.
    """
    from PIL import Image as PILImage

    doc = safe_fitz_open(pdf_bytes)
    processed_xrefs = set()
    replaced = 0
    skipped = 0

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        image_list = page.get_images(full=True)

        for img_info in image_list:
            xref = img_info[0]
            if xref in processed_xrefs:
                continue
            processed_xrefs.add(xref)

            try:
                base_image = doc.extract_image(xref)
            except Exception:
                continue

            if not base_image or not base_image.get("image"):
                continue

            img_bytes_orig = base_image.get("image")
            orig_ext = base_image.get("ext", "unknown")
            orig_sz = len(img_bytes_orig)

            try:
                pil_img = PILImage.open(io.BytesIO(img_bytes_orig))
            except Exception:
                continue

            orig_w, orig_h = pil_img.size

            # Convert palette / RGBA images so JPEG save works
            pil_rgb = pil_img
            if pil_rgb.mode in ("P", "PA"):
                pil_rgb = pil_rgb.convert("RGBA")
            if pil_rgb.mode == "RGBA":
                bg = PILImage.new("RGB", pil_rgb.size, (255, 255, 255))
                bg.paste(pil_rgb, mask=pil_rgb.split()[3])
                pil_rgb = bg
            elif pil_rgb.mode != "RGB":
                pil_rgb = pil_rgb.convert("RGB")

            # Downscale if image exceeds max_dim
            was_scaled = False
            if max_dim > 0:
                w, h = pil_rgb.size
                if max(w, h) > max_dim:
                    ratio = max_dim / float(max(w, h))
                    new_w, new_h = max(1, int(w * ratio)), max(1, int(h * ratio))
                    pil_rgb = pil_rgb.resize((new_w, new_h), PILImage.LANCZOS)
                    was_scaled = True

            # Candidate 1: JPEG recompression
            jpeg_buf = io.BytesIO()
            pil_rgb.save(jpeg_buf, format="JPEG", quality=jpeg_quality, optimize=True)
            jpeg_bytes = jpeg_buf.getvalue()
            jpeg_sz = len(jpeg_bytes)

            # Candidate 2: Optimized PNG recompression (good for diagrams/charts)
            png_buf = io.BytesIO()
            pil_rgb.save(png_buf, format="PNG", optimize=True)
            png_bytes = png_buf.getvalue()
            png_sz = len(png_bytes)

            # Pick the best candidate that is smaller than original
            best_bytes = None
            best_sz = orig_sz
            best_fmt = "none"

            if jpeg_sz < best_sz:
                best_bytes = jpeg_bytes
                best_sz = jpeg_sz
                best_fmt = f"JPEG(q={jpeg_quality})"

            if png_sz < best_sz:
                best_bytes = png_bytes
                best_sz = png_sz
                best_fmt = "PNG(optimized)"

            scaled_info = f" scaled {orig_w}x{orig_h}->{pil_rgb.size[0]}x{pil_rgb.size[1]}" if was_scaled else ""
            if best_bytes is not None:
                try:
                    page.replace_image(xref, stream=best_bytes)
                    replaced += 1
                    print(f"    [IMG xref={xref}] {orig_ext} {orig_w}x{orig_h}{scaled_info}: {orig_sz} -> {best_sz} ({best_fmt})")
                except Exception:
                    try:
                        new_pix = fitz.Pixmap(best_bytes)
                        page.replace_image(xref, pixmap=new_pix)
                        replaced += 1
                        print(f"    [IMG xref={xref}] {orig_ext} {orig_w}x{orig_h}{scaled_info}: {orig_sz} -> {best_sz} ({best_fmt}, pixmap fallback)")
                    except Exception as e:
                        skipped += 1
                        print(f"    [IMG xref={xref}] {orig_ext} {orig_w}x{orig_h}: REPLACE FAILED - {e}")
            else:
                skipped += 1
                print(f"    [IMG xref={xref}] {orig_ext} {orig_w}x{orig_h}{scaled_info}: SKIPPED (JPEG={jpeg_sz}, PNG={png_sz}, orig={orig_sz} — all bigger)")

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True, clean=True, use_objstms=1)
    doc.close()
    print(f"  -> In-place recompressed {replaced} images, skipped {skipped} (q={jpeg_quality}, max_dim={max_dim})")
    return buf.getvalue()


@app.post("/api/tools/compress-pdf")
async def compress_pdf(
    file: UploadFile = File(...), 
    level: str = Form("medium"),
    target_size_kb: Optional[int] = Form(None)
):
    """
    Endpoint: PDF Compressor
    Description: Reduces PDF file size:
      - For text-based PDFs: Recompresses embedded images without rasterization so text remains selectable.
      - For scanned PDFs: Uses page rasterization as fallback.
    Returns: A compressed application/pdf file.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        raw_bytes = await file.read()
        original_size = len(raw_bytes)

        if original_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")

        if original_size == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        pdf_bytes = sanitize_pdf_bytes(raw_bytes)
        doc = safe_fitz_open(pdf_bytes)

        if doc.page_count == 0:
            doc.close()
            raise HTTPException(status_code=400, detail="The PDF has no pages.")

        # Detect PDF characteristics: total embedded images and text presence
        total_images = sum(len(page.get_images(full=True)) for page in doc)
        has_text = _has_text_content(doc)

        # ── PATH 1: Text-Only PDFs (no embedded images) ──
        if total_images == 0:
            print(f"[DEBUG COMPRESS] Starting Text-Only Compression for '{file.filename}' (Initial: {original_size} bytes)")
            
            # Step 1: Clean page content streams
            for page in doc:
                try:
                    page.clean_contents()
                except Exception:
                    pass

            buf_clean = io.BytesIO()
            doc.save(buf_clean, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
            sz_clean = len(buf_clean.getvalue())
            print(f"[DEBUG COMPRESS] Step 1 (page.clean_contents + garbage=4): {original_size} -> {sz_clean} bytes")

            # Step 2: Apply font subsetting if supported by PyMuPDF
            if hasattr(doc, "subset_fonts"):
                try:
                    doc.subset_fonts()
                    print("[DEBUG COMPRESS] Step 2 (doc.subset_fonts()): Executed successfully")
                except Exception as e:
                    print(f"[DEBUG COMPRESS] Step 2 (doc.subset_fonts()): Notice/Failed - {e}")

            # Step 3: Save structural buffer with use_objstms=1, deflate=True, clean=True, garbage=4
            struct_buf = io.BytesIO()
            doc.save(struct_buf, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
            struct_bytes = struct_buf.getvalue()
            sz_struct = len(struct_bytes)
            print(f"[DEBUG COMPRESS] Step 3 (PyMuPDF save with use_objstms=1, deflate=True, clean=True, garbage=4): {sz_clean} -> {sz_struct} bytes")

            # Step 4: Recompress loose PDF objects via pikepdf object streams
            try:
                p_pdf = pikepdf.Pdf.open(io.BytesIO(struct_bytes))
                p_buf = io.BytesIO()
                p_pdf.save(p_buf, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
                p_pdf.close()
                pike_bytes = p_buf.getvalue()
                sz_pike = len(pike_bytes)
                print(f"[DEBUG COMPRESS] Step 4 (pikepdf object streams): {sz_struct} -> {sz_pike} bytes")
                if sz_pike < sz_struct:
                    struct_bytes = pike_bytes
            except Exception as e:
                print(f"[DEBUG COMPRESS] Step 4 (pikepdf object streams): Notice/Failed - {e}")

            struct_size = len(struct_bytes)

            # Step 5: Check if raster candidate yields smaller size (for extreme/medium or target size)
            raster_buf = None
            raster_size = float('inf')
            if level in ("extreme", "medium") or target_size_kb:
                try:
                    r_dpi = 72 if level == "extreme" else 100
                    r_qual = 35 if level == "extreme" else 60
                    raster_doc = fitz.open()
                    for page in doc:
                        pix = page.get_pixmap(dpi=r_dpi)
                        img_bytes = pix.tobytes("jpeg", jpg_quality=r_qual)
                        new_page = raster_doc.new_page(width=page.rect.width, height=page.rect.height)
                        new_page.insert_image(new_page.rect, stream=img_bytes)

                    r_buf = io.BytesIO()
                    raster_doc.save(r_buf, garbage=4, deflate=True, clean=True, use_objstms=1)
                    raster_doc.close()
                    r_bytes = r_buf.getvalue()
                    
                    try:
                        rp_pdf = pikepdf.Pdf.open(io.BytesIO(r_bytes))
                        rp_buf = io.BytesIO()
                        rp_pdf.save(rp_buf, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
                        rp_pdf.close()
                        if len(rp_buf.getvalue()) < len(r_bytes):
                            r_bytes = rp_buf.getvalue()
                    except Exception:
                        pass

                    raster_size = len(r_bytes)
                    raster_buf = io.BytesIO(r_bytes)
                    print(f"[DEBUG COMPRESS] Step 5 (Raster candidate {level}): {original_size} -> {raster_size} bytes")
                except Exception as e:
                    print(f"[DEBUG COMPRESS] Step 5 (Raster candidate): Error - {e}")

            doc.close()

            # Select best candidate
            if raster_buf and raster_size < struct_size and raster_size < original_size:
                best_buffer = raster_buf
                best_size = raster_size
                method = f"text-only (rasterized {level})"
            elif struct_size < original_size:
                best_buffer = io.BytesIO(struct_bytes)
                best_size = struct_size
                method = "text-only (structural, content stream & font compression)"
            else:
                best_buffer = io.BytesIO(pdf_bytes)
                best_size = original_size
                method = "text-only (already optimal)"

            best_buffer.seek(0)
            reduction_pct = round(((original_size - best_size) / original_size) * 100, 1)
            print(f"✓ Compressed [{method}]: {original_size} -> {best_size} bytes ({reduction_pct}% reduction)")

            headers = {
                "Content-Disposition": f'attachment; filename="compressed-{file.filename}"',
            }

            return Response(
                content=best_buffer.getvalue(),
                media_type="application/pdf",
                headers=headers
            )

        # ── PATH 2 & 3: Image-based PDFs (Text+Images or Scanned/Image-Only) ──
        print(f"  Compressing PDF '{file.filename}' ({original_size} bytes). Embedded images: {total_images}, Text-based: {has_text}")

                # ── Quality presets ──
        # Log the received compression level for debugging
        print(f"[DEBUG COMPRESS] Received compression level: '{level}'")
        if level == "low":
            img_quality = 80
            raster_dpi = 150
            raster_quality = 80
            max_dim = 1200  # low: max 1200px width/height
        elif level == "extreme":
            img_quality = 35
            raster_dpi = 72
            raster_quality = 35
            max_dim = 600   # extreme: max 600px
        else:  # medium (default)
            img_quality = 60
            raster_dpi = 100
            raster_quality = 60
            max_dim = 900   # medium: max 900px

        candidates = []

        # ── Strategy 1: Lossless cleanup & font subsetting ──
        if hasattr(doc, "subset_fonts"):
            try:
                doc.subset_fonts()
            except Exception:
                pass

        for page in doc:
            try:
                page.clean_contents()
            except Exception:
                pass

        lossless_buf = io.BytesIO()
        doc.save(lossless_buf, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
        lossless_bytes = lossless_buf.getvalue()
        try:
            p_pdf = pikepdf.Pdf.open(io.BytesIO(lossless_bytes))
            p_buf = io.BytesIO()
            p_pdf.save(p_buf, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
            p_pdf.close()
            if len(p_buf.getvalue()) < len(lossless_bytes):
                lossless_bytes = p_buf.getvalue()
        except Exception:
            pass

        lossless_size = len(lossless_bytes)
        candidates.append((io.BytesIO(lossless_bytes), lossless_size, "lossless"))
        print(f"[DEBUG COMPRESS] Strategy 1 (Lossless + use_objstms=1): {original_size} -> {lossless_size} bytes")

        # ── Strategy 2: In-place image recompression ──
        recomp_size = float('inf')
        try:
            recomp_bytes = _recompress_images_in_pdf(pdf_bytes, img_quality, max_dim)
            recomp_size = len(recomp_bytes)
            candidates.append((io.BytesIO(recomp_bytes), recomp_size, "image-recompress"))
            print(f"[DEBUG COMPRESS] Strategy 2 (Image-recompress): {original_size} -> {recomp_size} bytes")
        except Exception as e:
            print(f"[DEBUG COMPRESS] Strategy 2 (Image-recompress): Failed - {e}")

        # ── Strategy 3: Page rasterization ──
        # Evaluate raster candidate if has_text is False, OR if image-recompress yielded < 20% reduction
        recomp_reduction = 0
        if recomp_size < original_size:
            recomp_reduction = (original_size - recomp_size) / original_size

        if not has_text or recomp_reduction < 0.20 or level == "extreme" or target_size_kb:
            try:
                raster_doc = fitz.open()
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap(dpi=raster_dpi)
                    img_bytes = pix.tobytes("jpeg", jpg_quality=raster_quality)
                    new_page = raster_doc.new_page(width=page.rect.width, height=page.rect.height)
                    new_page.insert_image(new_page.rect, stream=img_bytes)

                raster_buf = io.BytesIO()
                raster_doc.save(raster_buf, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
                raster_bytes = raster_buf.getvalue()
                
                try:
                    rp_pdf = pikepdf.Pdf.open(io.BytesIO(raster_bytes))
                    rp_buf = io.BytesIO()
                    rp_pdf.save(rp_buf, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
                    rp_pdf.close()
                    if len(rp_buf.getvalue()) < len(raster_bytes):
                        raster_bytes = rp_buf.getvalue()
                except Exception:
                    pass

                raster_size = len(raster_bytes)
                candidates.append((io.BytesIO(raster_bytes), raster_size, "rasterize"))
                print(f"  Rasterize (high-yield fallback): {original_size} -> {raster_size} bytes")
            except Exception as e:
                print(f"  Rasterize failed: {e}")

        doc.close()

        # ── Target Size Mode ──
        if target_size_kb and target_size_kb > 0:
            target_bytes = target_size_kb * 1024
            fitting = [(b, s, m) for b, s, m in candidates if s <= target_bytes]
            if fitting:
                fitting.sort(key=lambda c: c[1], reverse=True)  # largest that still fits
                best_buffer, best_size, method = fitting[0]
            else:
                # Binary search using page rasterization to hit target size
                low_q, high_q = 5, 60
                best_buffer, best_size, method = candidates[0][0], candidates[0][1], "target-miss"
                for _ in range(5):
                    mid_q = (low_q + high_q) // 2
                    temp_doc = safe_fitz_open(pdf_bytes)
                    out_doc = fitz.open()
                    for pn in range(len(temp_doc)):
                        pg = temp_doc.load_page(pn)
                        px = pg.get_pixmap(dpi=72)
                        ib = px.tobytes("jpeg", jpg_quality=mid_q)
                        np2 = out_doc.new_page(width=pg.rect.width, height=pg.rect.height)
                        np2.insert_image(np2.rect, stream=ib)
                    tb = io.BytesIO()
                    out_doc.save(tb, garbage=4, deflate=True, clean=True, deflate_fonts=True)
                    ts = tb.getbuffer().nbytes
                    out_doc.close()
                    temp_doc.close()
                    if ts <= target_bytes:
                        best_buffer, best_size = tb, ts
                        method = f"target({target_size_kb}KB, rasterize)"
                        low_q = mid_q + 1
                    else:
                        high_q = mid_q - 1
        else:
            # ── Standard Mode ──
            candidates.sort(key=lambda c: c[1])
            # If image-recompress achieved >= 20% reduction, prefer it to keep text selectable
            image_recomp_candidates = [c for c in candidates if c[2] == "image-recompress"]
            if image_recomp_candidates:
                b_buf, b_sz, m_th = image_recomp_candidates[0]
                if (original_size - b_sz) / original_size >= 0.20:
                    best_buffer, best_size, method = b_buf, b_sz, m_th
                else:
                    best_buffer, best_size, method = candidates[0]
            else:
                best_buffer, best_size, method = candidates[0]

        # If nothing helped, return original
        if best_size >= original_size and not target_size_kb:
            best_buffer = io.BytesIO(pdf_bytes)
            best_size = original_size
            method = "original (already optimal)"

        best_buffer.seek(0)
        reduction_pct = round(((original_size - best_size) / original_size) * 100, 1)
        print(f"✓ Compressed [{method}]: {original_size} -> {best_size} bytes ({reduction_pct}% reduction)")

        headers = {
            "Content-Disposition": f'attachment; filename="compressed-{file.filename}"',
        }

        return Response(
            content=best_buffer.getvalue(),
            media_type="application/pdf",
            headers=headers
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error compressing PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


import os
import tempfile
from pdf2docx import Converter

@app.post("/api/tools/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    """
    Endpoint: PDF to Word Converter
    Description: Converts a PDF document into an editable Microsoft Word (.docx) file.
    Returns: An application/vnd.openxmlformats-officedocument.wordprocessingml.document file.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        raw_bytes = await file.read()
        pdf_bytes = sanitize_pdf_bytes(raw_bytes)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_pdf_path = temp_pdf.name
            
        temp_docx_path = temp_pdf_path.replace(".pdf", ".docx")
        
        try:
            # Convert PDF to DOCX
            cv = Converter(temp_pdf_path)
            cv.convert(temp_docx_path)
            cv.close()
            
            with open(temp_docx_path, "rb") as f:
                docx_bytes = f.read()
                
            headers = {
                "Content-Disposition": f'attachment; filename="{file.filename.replace(".pdf", "")}.docx"',
            }

            return Response(
                content=docx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers=headers
            )
            
        finally:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
            if os.path.exists(temp_docx_path):
                os.remove(temp_docx_path)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error converting PDF to Word: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tools/merge-pdf")
async def merge_pdf(files: list[UploadFile] = File(...)):
    """
    Endpoint: PDF Merger
    Description: Combines multiple PDF files sequentially into a single document.
    Returns: A merged application/pdf file.
    """
    if not files or len(files) < 2:
        raise HTTPException(status_code=400, detail="Please upload at least 2 PDF files to merge.")

    merged_doc = fitz.open()

    try:
        for file in files:
            if file.content_type != "application/pdf":
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF.")
            
            raw_bytes = await file.read()
            pdf_bytes = sanitize_pdf_bytes(raw_bytes)
            doc = safe_fitz_open(pdf_bytes)
            merged_doc.insert_pdf(doc)
            doc.close()

        out_buffer = io.BytesIO()
        merged_doc.save(out_buffer, garbage=4, deflate=True)
        merged_doc.close()
        out_buffer.seek(0)

        headers = {
            "Content-Disposition": 'attachment; filename="merged_document.pdf"',
        }

        return Response(
            content=out_buffer.getvalue(),
            media_type="application/pdf",
            headers=headers
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error merging PDFs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import os
from PIL import Image
import pytesseract
import base64

# Configure Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


# ==============================================================================
# SECTION 3B: LOCAL OCR ENGINE (No External API)
# Uses Tesseract for printed text + TrOCR (microsoft/trocr-base-handwritten)
# as a fallback for handwritten content. Models are loaded once at startup.
# ==============================================================================

# ── TrOCR Model (lazy-loaded on first use for faster server startup) ──
_trocr_processor = None
_trocr_model = None
_trocr_load_attempted = False

def _load_trocr():
    """Load the TrOCR model once. Called on first OCR request that needs it."""
    global _trocr_processor, _trocr_model, _trocr_load_attempted
    if _trocr_load_attempted:
        return
    _trocr_load_attempted = True
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        print("[OCR] Loading TrOCR handwriting model (first time only)...")
        _trocr_processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
        _trocr_model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')
        print("[OCR] TrOCR model loaded successfully.")
    except Exception as e:
        print(f"[OCR] WARNING: TrOCR model could not be loaded: {e}")
        print("[OCR] Handwriting fallback will be unavailable. Tesseract-only mode.")


def _trocr_on_lines(img: Image.Image) -> str:
    """
    Run TrOCR on an image by splitting it into horizontal line crops.
    TrOCR processes single text lines, so we segment the image first.
    """
    if _trocr_processor is None or _trocr_model is None:
        return ""

    import torch
    gray = img.convert('L')
    width, height = gray.size

    # Use simple horizontal projection to find text line boundaries
    import numpy as np
    arr = np.array(gray)
    # Binarize: pixels darker than 200 are "ink"
    ink = (arr < 200).astype(np.uint8)
    row_sums = ink.sum(axis=1)
    threshold = width * 0.01  # at least 1% of row width has ink

    # Find contiguous regions of text
    in_text = False
    lines = []
    start = 0
    for y in range(height):
        if row_sums[y] > threshold and not in_text:
            start = y
            in_text = True
        elif row_sums[y] <= threshold and in_text:
            if y - start > 5:  # ignore tiny gaps
                lines.append((max(0, start - 4), min(height, y + 4)))
            in_text = False
    if in_text and height - start > 5:
        lines.append((max(0, start - 4), height))

    if not lines:
        # No lines detected — process entire image as one line
        lines = [(0, height)]

    results = []
    for top, bottom in lines:
        crop = img.crop((0, top, width, bottom))
        # TrOCR expects RGB
        crop = crop.convert('RGB')
        pixel_values = _trocr_processor(images=crop, return_tensors="pt").pixel_values
        with torch.no_grad():
            generated_ids = _trocr_model.generate(pixel_values, max_new_tokens=256)
        text = _trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        if text.strip():
            results.append(text.strip())

    return "\n".join(results)


def run_local_ocr(img: Image.Image) -> str:
    """
    Local OCR pipeline — no external API calls.
    1. Try Tesseract (fast, good for printed text).
    2. If confidence is very low or text is empty, fall back to TrOCR (handwriting).
    """
    # ── Step 1: Tesseract ──
    try:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        confidences = [int(c) for c in data['conf'] if str(c) != '-1' and int(c) > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        text = pytesseract.image_to_string(img).strip()

        # If Tesseract returned decent text with reasonable confidence, use it
        if text and avg_confidence > 40:
            return text
    except Exception as e:
        print(f"[OCR] Tesseract failed: {e}")
        text = ""
        avg_confidence = 0

    # ── Step 2: TrOCR fallback (handwriting) ──
    _load_trocr()
    try:
        trocr_text = _trocr_on_lines(img)
        if trocr_text.strip():
            return trocr_text.strip()
    except Exception as e:
        print(f"[OCR] TrOCR fallback failed: {e}")

    # ── Step 3: Return whatever Tesseract got (even if low confidence) ──
    if text:
        return text

    return ""


# ==============================================================================
# OCR ENDPOINTS (fully local — no Gemini, no external API)
# ==============================================================================

@app.post("/api/ocr")
async def ocr_endpoint(
    file: UploadFile = File(None),
    base64_data: str = Form(None),
    mime_type: str = Form(None),
):
    """
    Endpoint: General OCR (Image to Text)
    Description: Accepts an image via file upload OR base64 string and extracts text locally.
    Used by the Next.js frontend proxy (/api/ocr) for HandwritingTool, ImageToTextTool, BulkOcrTool.
    Returns: { "text": "..." }
    """
    try:
        img = None

        # Accept file upload
        if file and file.filename:
            img_bytes = await file.read()
            img = Image.open(io.BytesIO(img_bytes))
        # Accept base64 encoded image
        elif base64_data:
            decoded = base64.b64decode(base64_data)
            img = Image.open(io.BytesIO(decoded))
        else:
            raise HTTPException(status_code=400, detail="No image provided. Send a file or base64_data.")

        text = run_local_ocr(img)

        if not text:
            return {"text": "", "warning": "No text could be extracted from this image."}

        return {"text": text}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[OCR] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tools/pdf-to-text-local")
async def pdf_to_text_local(file: UploadFile = File(...)):
    """
    Endpoint: PDF OCR (Image/Scan to Text) — Fully Local
    Description: Extracts text from scanned/image PDFs using local Tesseract + TrOCR.
    No external API calls. No API key required.
    Returns: Extracted raw text as JSON.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        raw_bytes = await file.read()
        pdf_bytes = sanitize_pdf_bytes(raw_bytes)
        doc = safe_fitz_open(pdf_bytes)

        # Limit to 20 pages to avoid very long processing
        max_pages = min(len(doc), 20)
        extracted_text = []

        for page_num in range(max_pages):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")

            img = Image.open(io.BytesIO(img_bytes))
            page_text = run_local_ocr(img)
            extracted_text.append(f"--- Page {page_num + 1} ---\n{page_text}")

        doc.close()

        return {"text": "\n\n".join(extracted_text)}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def parse_page_ranges(range_str, total_pages):
    ranges = []
    parts = range_str.split(',')
    for part in parts:
        part = part.strip()
        if not part: continue
        if '-' in part:
            s, e = part.split('-', 1)
            try:
                start = max(0, int(s) - 1)
                end = min(total_pages - 1, int(e) - 1)
                if start <= end:
                    ranges.append((start, end))
            except ValueError:
                pass
        else:
            try:
                p = int(part) - 1
                if 0 <= p < total_pages:
                    ranges.append((p, p))
            except ValueError:
                pass
    return ranges

@app.post("/api/tools/split-pdf")
async def split_pdf(
    file: UploadFile = File(...),
    tab: str = Form(...),
    range_mode: str = Form(None),
    range_from: int = Form(None),
    range_to: int = Form(None),
    fixed_pages: int = Form(None),
    pages_mode: str = Form(None),
    selected_pages: str = Form(None),
    target_size_mb: float = Form(None)
):
    """
    Endpoint: PDF Splitter
    Description: Extracts specific pages, ranges, or splits PDF into fixed sizes from a single document.
    Returns: A single PDF or a ZIP file containing multiple split PDFs.
    """
    try:
        raw_bytes = await file.read()
        pdf_bytes = sanitize_pdf_bytes(raw_bytes)
        doc = safe_fitz_open(pdf_bytes)
        total_pages = len(doc)
        
        output_pdfs = [] # list of (filename, bytes)

        if tab == 'range':
            if range_mode == 'custom' and range_from is not None and range_to is not None:
                start = max(0, range_from - 1)
                end = min(total_pages - 1, range_to - 1)
                if start <= end:
                    new_doc = fitz.open()
                    new_doc.insert_pdf(doc, from_page=start, to_page=end)
                    output_pdfs.append((f"split_{start+1}_to_{end+1}.pdf", new_doc.tobytes()))
                    new_doc.close()
            elif range_mode == 'fixed' and fixed_pages and fixed_pages > 0:
                for i in range(0, total_pages, fixed_pages):
                    start = i
                    end = min(i + fixed_pages - 1, total_pages - 1)
                    new_doc = fitz.open()
                    new_doc.insert_pdf(doc, from_page=start, to_page=end)
                    output_pdfs.append((f"split_{start+1}_to_{end+1}.pdf", new_doc.tobytes()))
                    new_doc.close()

        elif tab == 'pages':
            if pages_mode == 'all':
                for i in range(total_pages):
                    new_doc = fitz.open()
                    new_doc.insert_pdf(doc, from_page=i, to_page=i)
                    output_pdfs.append((f"page_{i+1}.pdf", new_doc.tobytes()))
                    new_doc.close()
            elif pages_mode == 'select' and selected_pages:
                ranges = parse_page_ranges(selected_pages, total_pages)
                # Combine all selected pages into a single PDF
                if ranges:
                    new_doc = fitz.open()
                    for (start, end) in ranges:
                        new_doc.insert_pdf(doc, from_page=start, to_page=end)
                    output_pdfs.append(("extracted_pages.pdf", new_doc.tobytes()))
                    new_doc.close()

        elif tab == 'size' and target_size_mb and target_size_mb > 0:
            target_bytes = target_size_mb * 1024 * 1024
            current_start = 0
            
            while current_start < total_pages:
                # Binary search or incremental addition to find the split point
                # Simple incremental approach for reliability
                new_doc = fitz.open()
                last_valid_bytes = None
                
                for i in range(current_start, total_pages):
                    new_doc.insert_pdf(doc, from_page=i, to_page=i)
                    current_bytes = new_doc.tobytes()
                    
                    if len(current_bytes) > target_bytes and i > current_start:
                        # Too big, revert to previous page
                        new_doc.close()
                        
                        # Create final doc up to previous page
                        final_doc = fitz.open()
                        final_doc.insert_pdf(doc, from_page=current_start, to_page=i-1)
                        output_pdfs.append((f"split_{current_start+1}_to_{i}.pdf", final_doc.tobytes()))
                        final_doc.close()
                        
                        current_start = i
                        break
                    elif i == total_pages - 1:
                        # Reached the end
                        output_pdfs.append((f"split_{current_start+1}_to_{total_pages}.pdf", current_bytes))
                        current_start = total_pages
                        new_doc.close()
                        break

        doc.close()

        if not output_pdfs:
            raise HTTPException(status_code=400, detail="No pages matched the given criteria.")

        if len(output_pdfs) == 1:
            return Response(
                content=output_pdfs[0][1],
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{output_pdfs[0][0]}"'}
            )
        else:
            memory_zip = io.BytesIO()
            with zipfile.ZipFile(memory_zip, "w") as zf:
                for filename, b in output_pdfs:
                    zf.writestr(filename, b)
            
            return Response(
                content=memory_zip.getvalue(),
                media_type="application/zip",
                headers={"Content-Disposition": f'attachment; filename="split_documents.zip"'}
            )

    except Exception as e:
        print(f"Error splitting PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# SECTION 4: IMAGE PROCESSING TOOLS
# Endpoints for resizing, compressing, converting formats, and AI background removal.
# ==============================================================================

@app.post("/api/tools/image-compressor")
async def compress_image(
    file: UploadFile = File(...),
    target_kb: float = Form(100)
):
    """
    Endpoint: Image Compressor
    Description: Reduces image size to match a target KB value while preserving as much quality as possible.
    Uses binary search quantization for PNGs and quality degradation for JPEGs.
    Returns: A compressed image file in its original format.
    """
    try:
        img_bytes = await file.read()
        img = Image.open(io.BytesIO(img_bytes))

        # Detect original format
        original_format = (img.format or 'JPEG').upper()
        original_filename = file.filename or "compressed"
        base_name = os.path.splitext(original_filename)[0]

        # Format mapping — preserve original format
        format_map = {
            'JPEG': ('JPEG', 'image/jpeg', f'{base_name}.jpg'),
            'JPG':  ('JPEG', 'image/jpeg', f'{base_name}.jpg'),
            'PNG':  ('PNG',  'image/png',  f'{base_name}.png'),
            'WEBP': ('WEBP', 'image/webp', f'{base_name}.webp'),
            'GIF':  ('GIF',  'image/gif',  f'{base_name}.gif'),
            'BMP':  ('JPEG', 'image/jpeg', f'{base_name}.jpg'),  # BMP → JPEG for size savings
            'TIFF': ('JPEG', 'image/jpeg', f'{base_name}.jpg'),  # TIFF → JPEG for size savings
        }
        img_format, mime, out_name = format_map.get(original_format, ('JPEG', 'image/jpeg', f'{base_name}.jpg'))

        target_bytes = int(target_kb * 1024)

        def save_at_quality(q):
            buf = io.BytesIO()
            if img_format == 'PNG':
                if q >= 95:
                    img.save(buf, format='PNG', optimize=True)
                else:
                    # To reduce PNG file size, we must reduce the number of colors
                    # Map q (1-94) to colors (2-256)
                    colors = max(2, min(256, int(q * 2.7)))
                    
                    # Ensure RGBA image alpha is handled during quantization
                    if img.mode == 'RGBA':
                        # Convert to P mode with alpha handling
                        quantized = img.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
                    else:
                        quantized = img.quantize(colors=colors)
                        
                    quantized.save(buf, format='PNG', optimize=True)
            elif img_format == 'GIF':
                img.save(buf, format='GIF', optimize=True)
            else:
                converted = img.convert('RGB') if img.mode in ('RGBA', 'LA', 'P') else img
                converted.save(buf, format=img_format, quality=q, optimize=True)
            return buf.getvalue()

        # Binary search for the right quality level
        low, high = 1, 95
        best_result = save_at_quality(high)  # start with highest quality

        # For GIF, binary search doesn't work well — just save optimized
        if img_format == 'GIF':
            best_result = save_at_quality(50)
        else:
            for _ in range(8):  # 8 iterations gives precision within ~1%
                mid = (low + high) // 2
                result = save_at_quality(mid)
                if len(result) <= target_bytes:
                    best_result = result
                    low = mid + 1  # try higher quality (bigger file)
                else:
                    high = mid - 1  # need smaller file

            # Final check: if even quality=1 exceeds target, just use quality=1
            if len(best_result) > target_bytes:
                best_result = save_at_quality(1)

        return Response(
            content=best_result,
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except Exception as e:
        print(f"Error compressing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tools/image-resizer")
async def resize_image(
    file: UploadFile = File(...),
    width: int = Form(...),
    height: int = Form(...)
):
    """
    Endpoint: Image Resizer
    Description: Resizes an image to exact pixel dimensions using the LANCZOS filter for high quality.
    Returns: The resized image.
    """
    try:
        img_bytes = await file.read()
        img = Image.open(io.BytesIO(img_bytes))
        
        output = io.BytesIO()
        
        # Detect original format
        original_format = (img.format or 'JPEG').upper()
        original_filename = file.filename or "resized"
        base_name = os.path.splitext(original_filename)[0]
        
        # Format mapping — preserve original format
        format_map = {
            'JPEG': ('JPEG', 'image/jpeg', f'{base_name}.jpg'),
            'JPG':  ('JPEG', 'image/jpeg', f'{base_name}.jpg'),
            'PNG':  ('PNG',  'image/png',  f'{base_name}.png'),
            'WEBP': ('WEBP', 'image/webp', f'{base_name}.webp'),
            'GIF':  ('GIF',  'image/gif',  f'{base_name}.gif'),
            'BMP':  ('BMP',  'image/bmp',  f'{base_name}.bmp'),
            'TIFF': ('TIFF', 'image/tiff', f'{base_name}.tiff'),
        }
        img_format, mime, out_name = format_map.get(original_format, ('JPEG', 'image/jpeg', f'{base_name}.jpg'))
        
        # Resize image
        resized_img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        # Save image
        if img_format == 'JPEG':
            converted = resized_img.convert('RGB') if resized_img.mode in ('RGBA', 'LA', 'P') else resized_img
            converted.save(output, format='JPEG', quality=95, optimize=True)
        else:
            resized_img.save(output, format=img_format, optimize=True)
            
        return Response(
            content=output.getvalue(),
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except Exception as e:
        print(f"Error resizing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tools/remove-background")
async def remove_background(
    file: UploadFile = File(...),
    bg_color: str = Form(None),
    outline_color: str = Form(None),
    outline_size: int = Form(0),
    border_radius: int = Form(0),
    border_color: str = Form(None),
    border_thickness: int = Form(0),
    skip_remove: bool = Form(False),
):
    """
    Endpoint: AI Background Remover
    Description: Uses the `rembg` U2Net model to detect subjects and strip backgrounds.
    Also provides options for custom background colors, borders, drop shadows, and cropping.
    Returns: A PNG (with transparency) or JPEG (if solid background is applied).
    """
    import math
    try:
        img_bytes = await file.read()
        img = Image.open(io.BytesIO(img_bytes))

        # Remove background using rembg (keeps RGBA with transparency)
        if skip_remove:
            output_image = img.convert('RGBA')
        else:
            output_image = remove(img)

        # To exactly match the CSS preview (aspect-square object-contain), we must
        # place the subject in a square canvas. We also need to calculate the scaling 
        # factor relative to the CSS container (approx 384px) to ensure proportions match.
        scale = max(output_image.width, output_image.height) / 384.0
        
        scaled_outline_size = int(outline_size * scale)
        scaled_border_thick = int(border_thickness * scale)
        scaled_radius = 999999 if border_radius >= 999 else int(border_radius * scale)

        # ── 1. Subject Outline / Stroke (Shiny/Glow) ──────────────────────────
        if outline_color and scaled_outline_size > 0:
            mask = output_image.split()[3]
            
            # MaxFilter size must be an odd integer >= 3
            filter_size = max(3, scaled_outline_size)
            if filter_size % 2 == 0:
                filter_size += 1
                
            base_mask = mask.filter(ImageFilter.MaxFilter(filter_size))
            blurred_mask = base_mask.filter(ImageFilter.GaussianBlur(scaled_outline_size * 0.7))
            blurred_mask = blurred_mask.point(lambda p: min(255, int(p * 1.5)))
            
            stroke_img = Image.new('RGBA', output_image.size, ImageColor.getrgb(outline_color))
            stroke_img.putalpha(blurred_mask)
            output_image = Image.alpha_composite(stroke_img, output_image)

        # ── 2. Create Square Canvas (matches object-contain behavior) ─────────
        pad = scaled_outline_size if outline_color else 0
        max_dim = max(output_image.width, output_image.height)
        square_dim = max_dim + (pad * 2)
        
        canvas = Image.new('RGBA', (square_dim, square_dim), (0,0,0,0))
        offset_x = (square_dim - output_image.width) // 2
        offset_y = (square_dim - output_image.height) // 2
        canvas.alpha_composite(output_image, (offset_x, offset_y))
        output_image = canvas

        # ── 3. Solid Background ───────────────────────────────────────────────
        if bg_color:
            bg = Image.new('RGBA', (square_dim, square_dim), ImageColor.getrgb(bg_color))
            output_image = Image.alpha_composite(bg, output_image)

        # ── 4. Decorative Border & Shape Mask ─────────────────────────────────
        has_transparency = False
        if scaled_radius > 0 or (border_color and scaled_border_thick > 0):
            import numpy as np
            from PIL import ImageDraw
            
            r = min(scaled_radius, square_dim // 2)
            
            # Create outer mask for cropping
            outer_mask = Image.new('L', (square_dim, square_dim), 0)
            ImageDraw.Draw(outer_mask).rounded_rectangle([0, 0, square_dim - 1, square_dim - 1], radius=r, fill=255)
            
            # Draw perfect anti-aliased border using numpy mask subtraction
            if border_color and scaled_border_thick > 0:
                inner_mask = Image.new('L', (square_dim, square_dim), 0)
                inner_r = max(0, r - scaled_border_thick)
                b = scaled_border_thick
                ImageDraw.Draw(inner_mask).rounded_rectangle([b, b, square_dim - 1 - b, square_dim - 1 - b], radius=inner_r, fill=255)
                
                border_alpha = np.clip(np.array(outer_mask, dtype=int) - np.array(inner_mask, dtype=int), 0, 255).astype('uint8')
                
                border_layer = Image.new('RGBA', (square_dim, square_dim), ImageColor.getrgb(border_color))
                border_layer.putalpha(Image.fromarray(border_alpha))
                output_image = Image.alpha_composite(output_image, border_layer)
            
            # Apply cropping mask
            if scaled_radius > 0:
                has_transparency = True
                r_ch, g_ch, b_ch, a_ch = output_image.split()
                new_alpha = np.minimum(np.array(a_ch), np.array(outer_mask)).astype('uint8')
                output_image = Image.merge('RGBA', (r_ch, g_ch, b_ch, Image.fromarray(new_alpha)))

        # ── 5. Save Output ────────────────────────────────────────────────────
        if bg_color and not has_transparency: 
            output_image = output_image.convert('RGB')
            out_format = 'JPEG'
            mime = 'image/jpeg'
            ext = 'jpg'
        else:
            out_format = 'PNG'
            mime = 'image/png'
            ext = 'png'
            
        original_filename = file.filename or "image"
        base_name = os.path.splitext(original_filename)[0]
        out_name = f"{base_name}_nobg.{ext}"
        
        output = io.BytesIO()
        output_image.save(output, format=out_format, optimize=True)
            
        return Response(
            content=output.getvalue(),
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tools/image-converter")
async def convert_image(
    file: UploadFile = File(...),
    target_format: str = Form(...)
):
    """
    Endpoint: Image Format Converter
    Description: Converts an image to the requested format (JPEG, PNG, WEBP, GIF, BMP, TIFF).
    Handles transparency conversions automatically (e.g., adding white background for JPEG).
    Returns: The converted image file.
    """
    import os
    try:
        img_bytes = await file.read()
        img = Image.open(io.BytesIO(img_bytes))
        
        target = target_format.upper()
        
        # Handle alpha channel for formats that don't support it
        if target in ['JPEG', 'JPG', 'BMP']:
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create a white background
                bg = Image.new('RGB', img.size, (255, 255, 255))
                # Paste using alpha channel as mask if it exists
                if img.mode == 'RGBA':
                    bg.paste(img, mask=img.split()[3])
                else:
                    # Just convert it
                    bg = img.convert('RGB')
                img = bg
        else:
            # For PNG, WEBP, TIFF, GIF keep transparency but ensure standard mode
            if img.mode == 'P' and target != 'GIF':
                img = img.convert('RGBA')

        output = io.BytesIO()
        
        # Set format specific parameters for highest quality
        if target in ['JPEG', 'JPG']:
            img.save(output, format='JPEG', quality=100, optimize=True)
            mime = 'image/jpeg'
            ext = 'jpg'
        elif target == 'PNG':
            img.save(output, format='PNG', optimize=True)
            mime = 'image/png'
            ext = 'png'
        elif target == 'WEBP':
            img.save(output, format='WEBP', quality=100, lossless=True)
            mime = 'image/webp'
            ext = 'webp'
        elif target == 'GIF':
            img.save(output, format='GIF')
            mime = 'image/gif'
            ext = 'gif'
        elif target == 'BMP':
            img.save(output, format='BMP')
            mime = 'image/bmp'
            ext = 'bmp'
        elif target == 'TIFF':
            img.save(output, format='TIFF', compression='tiff_deflate')
            mime = 'image/tiff'
            ext = 'tiff'
        else:
            raise ValueError(f"Unsupported target format: {target}")

        original_filename = file.filename or "image"
        base_name = os.path.splitext(original_filename)[0]
        out_name = f"{base_name}_converted.{ext}"
        
        return Response(
            content=output.getvalue(),
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# ENTRY POINT
# Runs the Uvicorn ASGI server when script is executed directly.
# ==============================================================================
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
