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
from PIL import Image, ImageFilter, ImageColor, ImageSequence
# Requirement 2 & 3: Global rembg session — initialized once at startup to prevent
# per-request model loading memory leaks. u2netp is the lightweight CPU-optimized model.
try:
    from rembg import remove, new_session
    REMBG_SESSION = new_session("u2netp")  # Lightweight, CPU-safe. Use "u2net" for higher accuracy.
except ImportError:
    remove = None
    new_session = None
    REMBG_SESSION = None
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass
import sys
import zipfile
import math
import anyio

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
from starlette.concurrency import run_in_threadpool
import uvicorn

app = FastAPI(title="QuickTools API", version="1.0.0")

# Configure CORS so Next.js frontend can communicate with it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type"]
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


def _get_total_font_bytes(doc):
    total = 0
    font_xrefs = set()
    for page in doc:
        try:
            for f in page.get_fonts():
                xref = f[0]
                if xref > 0 and xref not in font_xrefs:
                    font_xrefs.add(xref)
                    try:
                        name, ext, stype, data = doc.extract_font(xref)
                        if data:
                            total += len(data)
                    except Exception:
                        pass
        except Exception:
            pass
    return total, len(font_xrefs)


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

    # Apply page content stream cleaning and font subsetting (critical for text-heavy PDFs)
    for page in doc:
        try:
            page.clean_contents()
        except Exception:
            pass

    if hasattr(doc, "subset_fonts"):
        try:
            doc.subset_fonts()
        except Exception as e:
            print(f"    [FONT SUBSET] Exception in _recompress_images_in_pdf: {e}")

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
    doc.close()
    
    out_bytes = buf.getvalue()
    try:
        p_pdf = pikepdf.Pdf.open(io.BytesIO(out_bytes))
        p_buf = io.BytesIO()
        p_pdf.save(p_buf, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
        p_pdf.close()
        if len(p_buf.getvalue()) < len(out_bytes):
            out_bytes = p_buf.getvalue()
    except Exception as e:
        print(f"    [PIKEPDF] Stream compression notice: {e}")

    print(f"  -> In-place recompressed {replaced} images, skipped {skipped} (q={jpeg_quality}, max_dim={max_dim}) -> {len(out_bytes)} bytes")
    return out_bytes


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

        # Log initial font size
        f_bytes_init, f_count_init = _get_total_font_bytes(doc)
        print(f"[DEBUG COMPRESS] Initial Fonts: {f_count_init} fonts ({round(f_bytes_init/1024, 1)} KB font data)")

        # ── Strategy 1: Lossless cleanup & font subsetting ──
        if hasattr(doc, "subset_fonts"):
            try:
                doc.subset_fonts()
                print("[DEBUG COMPRESS] doc.subset_fonts(): Executed successfully")
            except Exception as e:
                print(f"[DEBUG COMPRESS] doc.subset_fonts() Exception: {e}")
        else:
            print("[DEBUG COMPRESS] doc.subset_fonts(): Not supported by this PyMuPDF version")

        for page in doc:
            try:
                page.clean_contents()
            except Exception:
                pass

        lossless_buf = io.BytesIO()
        print("[DEBUG COMPRESS] Executing doc.save(garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)")
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
            if level == "extreme":
                # For extreme level, select the absolute smallest candidate
                candidates.sort(key=lambda c: c[1])
                best_buffer, best_size, method = candidates[0]
            else:
                # For low/medium: pick the smallest text-preserving candidate
                # (lossless and image-recompress both preserve text; rasterize does not)
                text_safe = [c for c in candidates if c[2] in ("lossless", "image-recompress")]
                if text_safe:
                    text_safe.sort(key=lambda c: c[1])
                    best_buffer, best_size, method = text_safe[0]
                    # If best text-safe candidate achieves < 20% reduction, consider rasterize too
                    best_reduction = (original_size - best_size) / original_size if original_size > 0 else 0
                    if best_reduction < 0.20:
                        all_sorted = sorted(candidates, key=lambda c: c[1])
                        if all_sorted[0][1] < best_size:
                            best_buffer, best_size, method = all_sorted[0]
                else:
                    candidates.sort(key=lambda c: c[1])
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
import zipfile
import lxml.etree as LXML_ET
from pdf2docx import Converter

W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
XML_NS = 'http://www.w3.org/XML/1998/namespace'
W = f'{{{W_NS}}}'
XML_SPACE = f'{{{XML_NS}}}space'


def _optimize_document_xml(xml_bytes: bytes) -> bytes:
    """
    Applies generic XML optimizations to Word document.xml using lxml (preserving OOXML namespaces & schema):
    1. Replaces mid-sentence line-wrap newlines (\\n or \\\\n) with single spaces,
       while preserving sentence/paragraph boundaries.
    2. Strips leading/trailing spaces on paragraphs, skips empty paragraphs,
       and collapses 2+ consecutive empty paragraphs into at most 1.
    3. Merges consecutive runs (<w:r>) that share identical formatting (<w:rPr>).
    4. Ensures xml:space="preserve" is maintained for text elements with whitespace.
    """
    try:
        parser = LXML_ET.XMLParser(strip_cdata=False, resolve_entities=False)
        root = LXML_ET.fromstring(xml_bytes, parser)
    except Exception as e:
        print(f"[DOCX XML OPT] Parse error: {e}")
        return xml_bytes

    def get_rpr_str(r_elem):
        rpr = r_elem.find(f'{W}rPr')
        if rpr is None:
            return b''
        return LXML_ET.tostring(rpr)

    def has_special_children(r_elem):
        special_tags = {f'{W}drawing', f'{W}pict', f'{W}object', f'{W}fldChar', f'{W}footnoteReference', f'{W}tab'}
        return any(child.tag in special_tags for child in r_elem)

    def clean_text_wraps(text):
        if not text:
            return text
        text = text.replace('\\\\n', '\n').replace('\\n', '\n')
        def replacer(m):
            p, n = m.group(1), m.group(2)
            if p in '.!?:;\n\r' or n.isupper() or n.isdigit():
                return f'{p}\n{n}'
            return f'{p} {n}'
        cleaned = re.sub(r'([^\n\r])[\r\n]+([^\n\r])', replacer, text)
        return re.sub(r'[ \t]+', ' ', cleaned)

    merged_runs_count = 0
    collapsed_p_count = 0

    # Step A: Scan for repeating headers/footers (non-table paragraphs with len > 15 repeating >= 2 times)
    non_table_p_freqs = {}
    for p in root.iter(f'{W}p'):
        # Check if inside table cell
        is_inside_tc = any(ancestor.tag == f'{W}tc' for ancestor in p.iterancestors())
        if not is_inside_tc:
            t_elems = p.findall(f'.//{W}t')
            text = ''.join([t.text or '' for t in t_elems]).strip()
            if len(text) > 15:
                non_table_p_freqs[text] = non_table_p_freqs.get(text, 0) + 1

    headers_to_remove = {text for text, count in non_table_p_freqs.items() if count >= 2}

    # Step B: Remove page number tables & page number paragraphs
    removed_tables = 0
    removed_p = 0
    
    def is_page_num_text(text):
        text = text.strip()
        if not text:
            return False
        # Just digits
        if re.match(r'^\d+$', text):
            return True
        # Page X, pg. X, X of Y, - X -
        if re.match(r'^(page|pg\.?)\s*\d+$', text, re.IGNORECASE):
            return True
        if re.match(r'^\d+\s*of\s*\d+$', text, re.IGNORECASE):
            return True
        if re.match(r'^-\s*\d+\s*-$', text):
            return True
        return False

    # 1. Iterate and delete tables that contain ONLY page numbers
    for tbl in list(root.iter(f'{W}tbl')):
        t_elems = tbl.findall(f'.//{W}t')
        tbl_text = ''.join([t.text or '' for t in t_elems]).strip()
        if is_page_num_text(tbl_text):
            parent = tbl.getparent()
            if parent is not None:
                parent.remove(tbl)
                removed_tables += 1

    # 2. Process all paragraphs across body & tables for text cleanup & run consolidation
    for p in list(root.iter(f'{W}p')):
        is_inside_tc = any(ancestor.tag == f'{W}tc' for ancestor in p.iterancestors())
        t_elems = p.findall(f'.//{W}t')
        p_text_full = ''.join([t.text or '' for t in t_elems]).strip()

        # If it is a standalone header/footer or page number outside a table, remove it
        if not is_inside_tc:
            if is_page_num_text(p_text_full) or p_text_full in headers_to_remove:
                parent = p.getparent()
                if parent is not None:
                    parent.remove(p)
                    removed_p += 1
                    continue

        if p_text_full:
            for t in t_elems:
                if t.text and ('\n' in t.text or '\\n' in t.text):
                    t.text = clean_text_wraps(t.text)

            if t_elems[0].text:
                t_elems[0].text = t_elems[0].text.lstrip()
            if t_elems[-1].text:
                t_elems[-1].text = t_elems[-1].text.rstrip()

            # Ensure xml:space="preserve" on any <w:t> with whitespace
            for t in t_elems:
                if t.text and (t.text.startswith(' ') or t.text.endswith(' ') or '  ' in t.text):
                    t.set(XML_SPACE, 'preserve')

        # Rule 3: Merge consecutive runs with identical formatting (rPr)
        runs = [child for child in p if child.tag == f'{W}r']
        if len(runs) > 1:
            curr_r = runs[0]
            for next_r in runs[1:]:
                if not has_special_children(curr_r) and not has_special_children(next_r):
                    if get_rpr_str(curr_r) == get_rpr_str(next_r):
                        t1 = curr_r.find(f'{W}t')
                        t2 = next_r.find(f'{W}t')
                        if t1 is not None and t2 is not None:
                            merged_text = (t1.text or '') + (t2.text or '')
                            t1.text = merged_text
                            if merged_text.startswith(' ') or merged_text.endswith(' ') or '  ' in merged_text:
                                t1.set(XML_SPACE, 'preserve')
                            p.remove(next_r)
                            merged_runs_count += 1
                            continue
                curr_r = next_r

    # 3. Collapse consecutive empty paragraphs & strip trailing empty paragraphs in root body
    body = root.find(f'.//{W}body')
    if body is not None:
        body_p = [child for child in body if child.tag == f'{W}p']
        empty_streak = 0
        to_remove_p = []
        for p in body_p:
            t_elems = p.findall(f'.//{W}t')
            p_text = ''.join([t.text or '' for t in t_elems])
            has_drawings = len(p.findall(f'.//{W}drawing')) > 0 or len(p.findall(f'.//{W}pict')) > 0
            is_empty = not has_drawings and p_text.strip() == ''
            if is_empty:
                empty_streak += 1
                if empty_streak > 1:
                    to_remove_p.append(p)
                    collapsed_p_count += 1
            else:
                empty_streak = 0
        for p in to_remove_p:
            body.remove(p)

        # Remove trailing empty paragraphs at the very end of body that cause extra blank pages
        body_children = list(body)
        while body_children and body_children[-1].tag == f'{W}p':
            last_p = body_children[-1]
            t_elems = last_p.findall(f'.//{W}t')
            p_text = ''.join([t.text or '' for t in t_elems]).strip()
            has_drawings = len(last_p.findall(f'.//{W}drawing')) > 0 or len(last_p.findall(f'.//{W}pict')) > 0
            if not p_text and not has_drawings:
                body.remove(last_p)
                body_children.pop()
                collapsed_p_count += 1
            else:
                break

    # 4. Mandatory OpenXML Rule: Every <w:tc> table cell MUST end with a <w:p>
    tc_repaired_count = 0
    for tc in root.iter(f'{W}tc'):
        children = [c for c in tc if c.tag != f'{W}tcPr']
        if not children or children[-1].tag != f'{W}p':
            new_p = LXML_ET.Element(f'{W}p')
            tc.append(new_p)
            tc_repaired_count += 1

    try:
        opt_xml = LXML_ET.tostring(root, encoding='utf-8', xml_declaration=True, standalone='yes')
        print(f"[DOCX XML OPT] Removed {removed_tables} page num tables, {removed_p} standalone page/header paragraphs.")
        print(f"[DOCX XML OPT] Consolidated {merged_runs_count} runs, collapsed {collapsed_p_count} empty paragraphs, repaired {tc_repaired_count} tc cells.")
        return opt_xml
    except Exception as e:
        print(f"[DOCX XML OPT] Serialization error: {e}")
        return xml_bytes


def _optimize_docx_bytes(docx_bytes: bytes) -> bytes:
    """
    Optimizes a .docx file by recompressing embedded images in word/media/,
    optimizing document.xml structure, and repacking with maximum ZIP compression.
    """
    from PIL import Image as PILImage

    in_buf = io.BytesIO(docx_bytes)
    out_buf = io.BytesIO()

    try:
        with zipfile.ZipFile(in_buf, 'r') as in_zip:
            with zipfile.ZipFile(out_buf, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out_zip:
                for item in in_zip.infolist():
                    data = in_zip.read(item.filename)
                    
                    # ONLY optimize word/document.xml to prevent metadata schema corruption
                    if item.filename == 'word/document.xml':
                        data = _optimize_document_xml(data)
                    elif item.filename.startswith('word/media/'):
                        try:
                            img = PILImage.open(io.BytesIO(data))
                            orig_w, orig_h = img.size
                            
                            max_dim = 1200
                            if max(orig_w, orig_h) > max_dim:
                                ratio = max_dim / float(max(orig_w, orig_h))
                                img = img.resize((max(1, int(orig_w * ratio)), max(1, int(orig_h * ratio))), PILImage.LANCZOS)
                            
                            pil_rgb = img
                            if pil_rgb.mode in ('P', 'PA'):
                                pil_rgb = pil_rgb.convert('RGBA')
                            if pil_rgb.mode == 'RGBA':
                                bg = PILImage.new('RGB', pil_rgb.size, (255, 255, 255))
                                bg.paste(pil_rgb, mask=pil_rgb.split()[3])
                                pil_rgb = bg
                            elif pil_rgb.mode != 'RGB':
                                pil_rgb = pil_rgb.convert('RGB')
                            
                            jpg_buf = io.BytesIO()
                            pil_rgb.save(jpg_buf, format='JPEG', quality=80, optimize=True)
                            jpg_bytes = jpg_buf.getvalue()
                            
                            png_buf = io.BytesIO()
                            img.save(png_buf, format='PNG', optimize=True)
                            png_bytes = png_buf.getvalue()
                            
                            best_data = data
                            if len(jpg_bytes) < len(best_data):
                                best_data = jpg_bytes
                            if len(png_bytes) < len(best_data):
                                best_data = png_bytes
                                
                            data = best_data
                        except Exception as e:
                            print(f"[DOCX OPT] Error optimizing media {item.filename}: {e}")
                            
                    out_zip.writestr(item.filename, data)
        return out_buf.getvalue()
    except Exception as e:
        print(f"[DOCX OPT] Zip optimization failed: {e}")
        return docx_bytes


@app.post("/api/tools/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    """
    Endpoint: PDF to Word Converter
    Description: Converts a PDF document into an editable Microsoft Word (.docx) file.
    Returns: An application/vnd.openxmlformats-officedocument.wordprocessingml.document file.
    """
    if not file.filename.lower().endswith(".pdf") and file.content_type not in ["application/pdf", "application/x-pdf", "application/octet-stream"]:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        raw_bytes = await file.read()
        pdf_bytes = sanitize_pdf_bytes(raw_bytes)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_pdf_path = temp_pdf.name
            
        temp_docx_path = temp_pdf_path.replace(".pdf", ".docx")
        
        try:
            # Convert PDF to DOCX with advanced table & shape layout optimizations
            cv = Converter(temp_pdf_path)
            cv.convert(
                temp_docx_path,
                start=0,
                end=None,
                # Table Parsing & Grid Optimization
                parse_lattice_table=True,
                parse_stream_table=True,
                min_border_clearance=2.0,
                connected_border_tolerance=0.5,
                # Shape Bloat Reduction: Filter small shapes/lines into standard Word gridlines
                shape_min_dimension=3.0,
                min_svg_w=5.0,
                min_svg_h=5.0,
                # Paragraph & Line Flow Optimization
                delete_end_line_hyphen=True,
                list_not_table=True,
                max_line_spacing_ratio=1.8,
                line_break_free_space_ratio=0.1,
                new_paragraph_free_space_ratio=0.85,
                page_margin_factor_top=0.5,
                page_margin_factor_bottom=0.5,
                clip_image_res_ratio=2.0
            )
            cv.close()
            
            with open(temp_docx_path, "rb") as f:
                raw_docx_bytes = f.read()
                
            orig_docx_len = len(raw_docx_bytes)
            
            # Post-process & optimize XML shapes, tables, and images in DOCX
            docx_bytes = _optimize_docx_bytes(raw_docx_bytes)
            opt_docx_len = len(docx_bytes)
            print(f"[PDF-TO-WORD] Converted '{file.filename}': DOCX size {orig_docx_len} -> {opt_docx_len} bytes ({round((1 - opt_docx_len/orig_docx_len)*100, 1)}% reduction)")
                
            clean_filename = file.filename.rsplit(".", 1)[0] + ".docx"
            headers = {
                "Content-Disposition": f'attachment; filename="{clean_filename}"',
            }

            return Response(
                content=docx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers=headers
            )
            
        finally:
            # Clean up server storage immediately after serving response
            if temp_pdf_path and os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)
            if temp_docx_path and os.path.exists(temp_docx_path):
                os.unlink(temp_docx_path)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error converting PDF to Word: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _process_pdf_merge(file_data: list[tuple[str, bytes]]) -> bytes:
    """
    Synchronous worker function that executes CPU-bound PDF merging operations
    in a thread pool to avoid blocking the FastAPI async event loop.
    """
    merged_doc = fitz.open()
    try:
        for filename, raw_bytes in file_data:
            doc = safe_fitz_open(raw_bytes)
            if doc.is_encrypted:
                doc.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{filename}' is password protected. Please unlock it before merging."
                )
            try:
                merged_doc.insert_pdf(doc)
            finally:
                doc.close()

        out_buffer = io.BytesIO()
        merged_doc.save(out_buffer, garbage=4, deflate=True)
        out_buffer.seek(0)
        return out_buffer.getvalue()
    finally:
        merged_doc.close()


@app.post("/api/tools/merge-pdf")
async def merge_pdf(files: list[UploadFile] = File(...)):
    """
    Endpoint: PDF Merger
    Description: Combines multiple PDF files sequentially into a single document.
    Returns: A merged application/pdf file.
    """
    if not files or len(files) < 2:
        raise HTTPException(status_code=400, detail="Please upload at least 2 PDF files to merge.")

    file_data = []
    try:
        for file in files:
            is_pdf = file.filename.lower().endswith(".pdf") or (
                file.content_type and file.content_type in [
                    "application/pdf",
                    "application/x-pdf",
                    "application/octet-stream"
                ]
            )
            if not is_pdf:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' is not a valid PDF.")
            
            raw_bytes = await file.read()
            await file.close()
            file_data.append((file.filename, raw_bytes))

        # Offload CPU-bound PDF merge to thread pool to prevent async loop hanging
        merged_bytes = await run_in_threadpool(_process_pdf_merge, file_data)

        headers = {
            "Content-Disposition": 'attachment; filename="merged_document.pdf"',
            "Content-Type": "application/pdf"
        }

        return Response(
            content=merged_bytes,
            media_type="application/pdf",
            headers=headers
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error merging PDFs: {e}")
        raise HTTPException(status_code=500, detail=f"PDF merging failed: {str(e)}")

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
    Optimized local OCR pipeline:
    1. Single pass pytesseract.image_to_data call to extract both text and confidence, saving CPU cycles.
    2. Fall back to TrOCR if confidence is low or text is empty.
    """
    text = ""
    avg_confidence = 0
    try:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        
        words = []
        confidences = []
        n_boxes = len(data['text'])
        last_line_num = -1
        
        for i in range(n_boxes):
            word = data['text'][i].strip()
            conf_str = str(data['conf'][i])
            conf = int(conf_str) if conf_str != '-1' and conf_str.isdigit() else -1
            
            if word:
                line_num = data['line_num'][i]
                if last_line_num != -1 and line_num != last_line_num:
                    words.append("\n")
                elif words and words[-1] != "\n":
                    words.append(" ")
                
                words.append(word)
                if conf >= 0:
                    confidences.append(conf)
                last_line_num = line_num

        text = "".join(words).strip()
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        # If Tesseract returned decent text with reasonable confidence, return it
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

    # ── Step 3: Return Tesseract text if available ──
    if text:
        return text

    return ""


def convert_pdf_to_images(pdf_bytes: bytes) -> list[Image.Image]:
    """
    Converts PDF pages into PIL Images using pdf2image with PyMuPDF (fitz) fallback.
    """
    try:
        import pdf2image
        images = pdf2image.convert_from_bytes(pdf_bytes)
        if images:
            return images
    except Exception as e:
        print(f"[OCR] pdf2image warning/fallback: {e}")

    # Fallback to PyMuPDF (fitz)
    doc = safe_fitz_open(pdf_bytes)
    images = []
    try:
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            images.append(img)
    finally:
        doc.close()
    return images


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

        text = await anyio.to_thread.run_sync(run_local_ocr, img)

        if not text:
            return {"text": "", "warning": "No text could be extracted from this image."}

        return {"text": text}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[OCR] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _process_pdf_ocr(pdf_bytes: bytes) -> str:
    """
    Hybrid PDF Text Extractor:
    1. First tries direct digital text extraction via PyMuPDF (instant & 100% accurate for digital PDFs).
    2. If no text is found on a page (scanned/image PDF), renders 200 DPI image and runs Tesseract + TrOCR local OCR.
    """
    doc = safe_fitz_open(pdf_bytes)
    try:
        page_texts = []
        for idx, page in enumerate(doc):
            # 1. Try extracting direct text (digital PDF)
            text = page.get_text("text").strip()
            
            # 2. If empty, fall back to high-resolution OCR (scanned PDF)
            if not text:
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                text = run_local_ocr(img)
            
            page_texts.append(f"--- Page {idx + 1} ---\n{text if text else '[No text detected on this page]'}")
            
        return "\n\n".join(page_texts)
    finally:
        doc.close()


@app.post("/api/tools/ocr-pdf")
@app.post("/api/tools/pdf-to-text-local")
async def ocr_pdf_endpoint(
    file: UploadFile = File(...),
    download: str = Form("false")
):
    """
    Endpoint: PDF OCR & Text Extractor (Digital + Scanned PDF to Text)
    Description: Extracts text from digital PDFs instantly or scanned image PDFs using Tesseract + TrOCR.
    Runs non-blocking in thread pool executor.
    Returns: JSON {"text": "..."} by default, or downloadable file if download="true".
    """
    is_pdf = file.filename.lower().endswith(".pdf") or (
        file.content_type and file.content_type in [
            "application/pdf",
            "application/x-pdf",
            "application/octet-stream"
        ]
    )
    if not is_pdf:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        raw_bytes = await file.read()
        await file.close()

        # Execute extraction non-blocking in thread pool
        final_text = await run_in_threadpool(_process_pdf_ocr, raw_bytes)

        should_download = download.lower() in ["true", "1", "yes"]
        if should_download:
            return Response(
                content=final_text.encode("utf-8"),
                media_type="text/plain",
                headers={"Content-Disposition": 'attachment; filename="digitized_text.txt"'}
            )
        
        return {"text": final_text}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[OCR-PDF] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF OCR failed: {str(e)}")

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

def _process_pdf_split(
    raw_bytes: bytes,
    tab: str,
    range_mode: str = None,
    range_from: int = None,
    range_to: int = None,
    fixed_pages: int = None,
    pages_mode: str = None,
    selected_pages: str = None,
    target_size_mb: float = None
) -> tuple[bytes, str, str]:
    # Requirement 3: Pass raw_bytes directly to safe_fitz_open
    doc = safe_fitz_open(raw_bytes)
    
    # Requirement 4: Ensure primary document cleanup in finally block
    try:
        total_pages = len(doc)
        if total_pages == 0:
            raise HTTPException(status_code=400, detail="The uploaded PDF file contains no pages.")

        # Requirement 2: Stream directly into in-memory ZipFile or single PDF buffer
        zip_buffer = io.BytesIO()
        single_pdf_bytes = None
        single_pdf_name = ""
        file_count = 0

        with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            
            def add_pdf_segment(filename: str, page_indices: list[int]):
                nonlocal file_count, single_pdf_bytes, single_pdf_name
                new_doc = fitz.open()
                try:
                    for idx in page_indices:
                        new_doc.insert_pdf(doc, from_page=idx, to_page=idx)
                    b = new_doc.tobytes()
                finally:
                    new_doc.close()

                file_count += 1
                if file_count == 1:
                    single_pdf_bytes = b
                    single_pdf_name = filename
                
                # Stream directly into ZIP archive to prevent RAM bloat
                zf.writestr(filename, b)

            if tab == 'range':
                if range_mode == 'custom' and range_from is not None and range_to is not None:
                    start = max(0, range_from - 1)
                    end = min(total_pages - 1, range_to - 1)
                    if start <= end:
                        add_pdf_segment(f"split_{start+1}_to_{end+1}.pdf", list(range(start, end + 1)))
                elif range_mode == 'fixed' and fixed_pages and fixed_pages > 0:
                    for i in range(0, total_pages, fixed_pages):
                        start = i
                        end = min(i + fixed_pages - 1, total_pages - 1)
                        add_pdf_segment(f"split_{start+1}_to_{end+1}.pdf", list(range(start, end + 1)))

            elif tab == 'pages':
                if pages_mode == 'all':
                    for i in range(total_pages):
                        add_pdf_segment(f"page_{i+1}.pdf", [i])
                elif pages_mode == 'select' and selected_pages:
                    ranges = parse_page_ranges(selected_pages, total_pages)
                    if ranges:
                        selected_indices = []
                        for (start, end) in ranges:
                            selected_indices.extend(range(start, end + 1))
                        if selected_indices:
                            add_pdf_segment("extracted_pages.pdf", selected_indices)

            elif tab == 'size' and target_size_mb and target_size_mb > 0:
                # Requirement 1: Fix size-based splitting infinite loop hang
                target_bytes = target_size_mb * 1024 * 1024
                current_start = 0

                while current_start < total_pages:
                    test_doc = fitz.open()
                    start_idx = current_start
                    end_idx = current_start

                    for i in range(current_start, total_pages):
                        test_doc.insert_pdf(doc, from_page=i, to_page=i)
                        curr_size = len(test_doc.tobytes())

                        if curr_size > target_bytes:
                            test_doc.close()
                            if i > current_start:
                                end_idx = i - 1
                                current_start = i
                            else:
                                # Single page exceeds target size: force split single page and advance
                                end_idx = i
                                current_start = i + 1
                            break
                        elif i == total_pages - 1:
                            test_doc.close()
                            end_idx = total_pages - 1
                            current_start = total_pages
                            break

                    fname = f"split_{start_idx+1}_to_{end_idx+1}.pdf" if start_idx != end_idx else f"split_page_{start_idx+1}.pdf"
                    add_pdf_segment(fname, list(range(start_idx, end_idx + 1)))

        if file_count == 0:
            raise HTTPException(status_code=400, detail="No pages matched the given criteria.")

        if file_count == 1:
            return single_pdf_bytes, "application/pdf", single_pdf_name
        else:
            return zip_buffer.getvalue(), "application/zip", "split_documents.zip"

    finally:
        doc.close()


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
        await file.close()

        # Non-blocking execution in thread pool to eliminate API hangs
        content_bytes, media_type, filename = await run_in_threadpool(
            _process_pdf_split,
            raw_bytes=raw_bytes,
            tab=tab,
            range_mode=range_mode,
            range_from=range_from,
            range_to=range_to,
            fixed_pages=fixed_pages,
            pages_mode=pages_mode,
            selected_pages=selected_pages,
            target_size_mb=target_size_mb
        )

        return Response(
            content=content_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except HTTPException:
        raise
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
    Includes GIF animation preservation, EXIF/metadata stripping, safe binary search, and structural downscaling.
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
            'BMP':  ('JPEG', 'image/jpeg', f'{base_name}.jpg'),
            'TIFF': ('JPEG', 'image/jpeg', f'{base_name}.jpg'),
        }
        img_format, mime, out_name = format_map.get(original_format, ('JPEG', 'image/jpeg', f'{base_name}.jpg'))

        target_bytes = int(target_kb * 1024)

        # Requirement 1: Check animated GIF status from the original loaded image
        is_animated_gif = (img_format == 'GIF') and getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1

        # Requirement 1 & 2: Save function with metadata stripping and Animated GIF preservation
        def save_at_quality(image_obj: Image.Image, q: int) -> bytes:
            buf = io.BytesIO()
            
            # Requirement 1: Preserve Animated GIFs
            if is_animated_gif:
                frames = [frame.copy() for frame in ImageSequence.Iterator(img)]
                if len(frames) > 1:
                    frames[0].save(
                        buf,
                        format='GIF',
                        save_all=True,
                        append_images=frames[1:],
                        optimize=True,
                        loop=img.info.get('loop', 0),
                        duration=img.info.get('duration', 100)
                    )
                    return buf.getvalue()
                
            if img_format == 'PNG':
                if q >= 95:
                    # Requirement 2: Omit EXIF/Metadata
                    image_obj.save(buf, format='PNG', optimize=True)
                else:
                    colors = max(2, min(256, int(q * 2.7)))
                    if image_obj.mode == 'RGBA':
                        quantized = image_obj.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
                    else:
                        quantized = image_obj.quantize(colors=colors)
                    quantized.save(buf, format='PNG', optimize=True)
            elif img_format == 'GIF':
                image_obj.save(buf, format='GIF', optimize=True)
            elif img_format == 'WEBP':
                converted = image_obj.convert('RGB') if image_obj.mode in ('RGBA', 'LA', 'P') else image_obj
                # Requirement 2: Exclude EXIF metadata
                converted.save(buf, format='WEBP', quality=q, optimize=True, exif=b"")
            else:
                converted = image_obj.convert('RGB') if image_obj.mode in ('RGBA', 'LA', 'P') else image_obj
                # Requirement 2: Exclude EXIF metadata
                converted.save(buf, format='JPEG', quality=q, optimize=True, exif=b"")
                
            return buf.getvalue()

        # Requirement 3: Safe Binary Search Logic
        curr_img = img.copy()
        
        def run_binary_search(image_target: Image.Image) -> tuple[bytes | None, bytes]:
            low, high = 1, 95
            best_under = None
            lowest_q_bytes = save_at_quality(image_target, 1)

            if is_animated_gif:
                res = save_at_quality(image_target, 50)
                if len(res) <= target_bytes:
                    return res, res
                return None, res

            for _ in range(8):
                mid = (low + high) // 2
                res = save_at_quality(image_target, mid)
                if len(res) <= target_bytes:
                    if best_under is None or len(res) > len(best_under):
                        best_under = res
                    low = mid + 1  # Try higher quality
                else:
                    high = mid - 1  # Need smaller size

            return best_under, lowest_q_bytes

        best_under_target, lowest_quality_result = run_binary_search(curr_img)
        
        if best_under_target is not None:
            best_result = best_under_target
        else:
            best_result = lowest_quality_result

        # Requirement 4: Downscale Fallback if quality=1 still exceeds target_bytes
        if len(best_result) > target_bytes and not (img_format == 'GIF' and getattr(curr_img, "is_animated", False)):
            scale = 0.85
            for _ in range(5):  # Apply structural downscaling up to 5 iterations
                new_w = int(curr_img.width * scale)
                new_h = int(curr_img.height * scale)
                if new_w < 50 or new_h < 50:
                    break
                curr_img = curr_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                best_downscaled, lowest_downscaled = run_binary_search(curr_img)
                if best_downscaled is not None:
                    best_result = best_downscaled
                    break
                else:
                    best_result = lowest_downscaled
                    if len(best_result) <= target_bytes:
                        break

        return Response(
            content=best_result,
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except Exception as e:
        print(f"Error compressing image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def _process_image_resizing(
    raw_bytes: bytes,
    original_filename: str,
    width: int = None,
    height: int = None,
    maintain_aspect_ratio: bool = True
) -> tuple[bytes, str, str]:
    img = Image.open(io.BytesIO(raw_bytes))
    try:
        orig_w, orig_h = img.size
        if orig_w == 0 or orig_h == 0:
            raise HTTPException(status_code=400, detail="Invalid image dimensions.")

        # Requirement 2 & 3: Dynamic aspect ratio calculation & validation
        has_w = width is not None and width > 0
        has_h = height is not None and height > 0

        if not has_w and not has_h:
            raise HTTPException(status_code=400, detail="Width or height must be specified and greater than 0.")

        if maintain_aspect_ratio:
            aspect_ratio = orig_w / orig_h
            if has_w and not has_h:
                target_w = width
                target_h = max(1, round(width / aspect_ratio))
            elif has_h and not has_w:
                target_h = height
                target_w = max(1, round(height * aspect_ratio))
            else:  # both provided
                target_w = width
                target_h = max(1, round(width / aspect_ratio))
        else:
            target_w = width if has_w else orig_w
            target_h = height if has_h else orig_h

        # Requirement 3: Strict Parameter Validation
        if target_w <= 0 or target_h <= 0:
            raise HTTPException(status_code=400, detail="Width and height must be strictly greater than 0.")

        # Detect original format
        original_format = (img.format or 'JPEG').upper()
        base_name = os.path.splitext(original_filename or "resized")[0]

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

        output = io.BytesIO()

        # Requirement 1: Handle Animated GIFs
        is_animated_gif = (img_format == 'GIF') and getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1

        if is_animated_gif:
            resized_frames = []
            for frame in ImageSequence.Iterator(img):
                resized_frame = frame.resize((target_w, target_h), Image.Resampling.LANCZOS)
                resized_frames.append(resized_frame)
            
            if resized_frames:
                resized_frames[0].save(
                    output,
                    format='GIF',
                    save_all=True,
                    append_images=resized_frames[1:],
                    optimize=True,
                    loop=img.info.get('loop', 0),
                    duration=img.info.get('duration', 100)
                )
        else:
            resized_img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
            try:
                if img_format == 'JPEG':
                    # Requirement 1: Optimize JPEG — quality=80, chroma subsampling 4:2:0, strip metadata
                    converted = resized_img.convert('RGB') if resized_img.mode in ('RGBA', 'LA', 'P') else resized_img
                    converted.save(
                        output, format='JPEG', quality=80, optimize=True,
                        subsampling='4:2:0', exif=b""
                    )
                elif img_format == 'PNG':
                    # Requirement 2: Optimize PNG — high compression level first
                    resized_img.save(output, format='PNG', optimize=True, compress_level=6)
                    
                    # Quantization fallback: if resized PNG is larger than original input
                    png_bytes = output.getvalue()
                    if len(png_bytes) > len(raw_bytes):
                        output = io.BytesIO()
                        if resized_img.mode in ('RGBA', 'LA'):
                            quantized = resized_img.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                        elif resized_img.mode == 'P':
                            quantized = resized_img
                        else:
                            quantized = resized_img.quantize(colors=256)
                        quantized.save(output, format='PNG', optimize=True, compress_level=6)
                elif img_format == 'WEBP':
                    converted = resized_img.convert('RGB') if resized_img.mode in ('RGBA', 'LA', 'P') else resized_img
                    converted.save(output, format='WEBP', quality=80, optimize=True, exif=b"")
                else:
                    resized_img.save(output, format=img_format, optimize=True)
            finally:
                resized_img.close()

        # Requirement 4: Clean Up Resource Memory
        return output.getvalue(), mime, out_name
    finally:
        img.close()


@app.post("/api/tools/image-resizer")
async def resize_image(
    file: UploadFile = File(...),
    width: int = Form(None),
    height: int = Form(None),
    maintain_aspect_ratio: bool = Form(True)
):
    """
    Endpoint: Image Resizer
    Description: Resizes an image to target pixel dimensions using LANCZOS filter.
    Supports animated GIFs, dynamic aspect ratio calculation, and strict parameter validation.
    Returns: The resized image.
    """
    try:
        raw_bytes = await file.read()
        await file.close()

        content_bytes, mime, out_name = await run_in_threadpool(
            _process_image_resizing,
            raw_bytes=raw_bytes,
            original_filename=file.filename,
            width=width,
            height=height,
            maintain_aspect_ratio=maintain_aspect_ratio
        )

        return Response(
            content=content_bytes,
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resizing image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def _run_rembg(img: Image.Image) -> Image.Image:
    """Requirement 2 & 3: Executes rembg with the global pre-loaded u2netp session."""
    if remove is None or REMBG_SESSION is None:
        raise HTTPException(status_code=503, detail="rembg library is not installed on this server.")
    return remove(img, session=REMBG_SESSION)


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
    Description: Uses the rembg u2netp (CPU-optimized) model to detect subjects and strip backgrounds.
    Also provides options for custom background colors, borders, drop shadows, and cropping.
    Returns: A PNG (with transparency) or JPEG (if solid background is applied).
    """
    img = None
    output_image = None
    try:
        img_bytes = await file.read()
        await file.close()
        img = Image.open(io.BytesIO(img_bytes))

        # Requirement 1 & 4: Offload CPU-heavy ML inference to thread pool so event loop is NOT blocked
        if skip_remove:
            output_image = img.convert('RGBA')
        else:
            output_image = await anyio.to_thread.run_sync(_run_rembg, img)

        # To exactly match the CSS preview (aspect-square object-contain), place the
        # subject in a square canvas. Calculate scaling factor relative to CSS container
        # (approx 384px) to ensure proportions match.
        scale = max(output_image.width, output_image.height) / 384.0
        
        scaled_outline_size = int(outline_size * scale)
        scaled_border_thick = int(border_thickness * scale)
        scaled_radius = 999999 if border_radius >= 999 else int(border_radius * scale)

        # ── 1. Subject Outline / Stroke (Shiny/Glow) ──────────────────────────
        if outline_color and scaled_outline_size > 0:
            mask = output_image.split()[3]
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
        canvas = Image.new('RGBA', (square_dim, square_dim), (0, 0, 0, 0))
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
            outer_mask = Image.new('L', (square_dim, square_dim), 0)
            ImageDraw.Draw(outer_mask).rounded_rectangle([0, 0, square_dim - 1, square_dim - 1], radius=r, fill=255)

            if border_color and scaled_border_thick > 0:
                inner_mask = Image.new('L', (square_dim, square_dim), 0)
                inner_r = max(0, r - scaled_border_thick)
                b = scaled_border_thick
                ImageDraw.Draw(inner_mask).rounded_rectangle([b, b, square_dim - 1 - b, square_dim - 1 - b], radius=inner_r, fill=255)
                border_alpha = np.clip(np.array(outer_mask, dtype=int) - np.array(inner_mask, dtype=int), 0, 255).astype('uint8')
                border_layer = Image.new('RGBA', (square_dim, square_dim), ImageColor.getrgb(border_color))
                border_layer.putalpha(Image.fromarray(border_alpha))
                output_image = Image.alpha_composite(output_image, border_layer)

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

        output_buf = io.BytesIO()
        output_image.save(output_buf, format=out_format, optimize=True)

        return Response(
            content=output_buf.getvalue(),
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Requirement 4: Thread-safe cleanup — discard all image objects from memory
        if img is not None:
            try:
                img.close()
            except Exception:
                pass
        if output_image is not None:
            try:
                output_image.close()
            except Exception:
                pass

def _process_image_conversion(raw_bytes: bytes, target_format: str, original_filename: str) -> tuple[bytes, str, str]:
    img = Image.open(io.BytesIO(raw_bytes))
    try:
        target = target_format.upper()

        # Requirement 3: Detect multi-frame animation
        is_animated = getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1

        output = io.BytesIO()

        format_meta = {
            'JPEG': ('JPEG', 'image/jpeg', 'jpg'),
            'JPG':  ('JPEG', 'image/jpeg', 'jpg'),
            'PNG':  ('PNG',  'image/png',  'png'),
            'WEBP': ('WEBP', 'image/webp', 'webp'),
            'GIF':  ('GIF',  'image/gif',  'gif'),
            'BMP':  ('BMP',  'image/bmp',  'bmp'),
            'TIFF': ('TIFF', 'image/tiff', 'tiff'),
        }

        if target not in format_meta:
            raise HTTPException(status_code=400, detail=f"Unsupported target format: {target}")

        out_format, mime, ext = format_meta[target]

        # Requirement 3: Preserve Multi-frame Animations for GIF & WEBP
        if is_animated and target in ['GIF', 'WEBP']:
            frames = [f.copy() for f in ImageSequence.Iterator(img)]
            if len(frames) > 1:
                if target == 'GIF':
                    frames[0].save(
                        output,
                        format='GIF',
                        save_all=True,
                        append_images=frames[1:],
                        loop=img.info.get('loop', 0),
                        duration=img.info.get('duration', 100),
                        optimize=True
                    )
                else:  # WEBP
                    frames[0].save(
                        output,
                        format='WEBP',
                        save_all=True,
                        append_images=frames[1:],
                        quality=85,
                        loop=img.info.get('loop', 0),
                        duration=img.info.get('duration', 100),
                        minimize_size=True
                    )
                base_name = os.path.splitext(original_filename or "image")[0]
                out_name = f"{base_name}_converted.{ext}"
                return output.getvalue(), mime, out_name

        # Requirement 2: Fix LA & RGBA Transparency Conversion for non-alpha formats
        if target in ['JPEG', 'JPG', 'BMP']:
            if img.mode in ('RGBA', 'LA'):
                alpha_mask = img.split()[-1]
                rgb_img = img.convert('RGB')
                bg = Image.new('RGB', img.size, (255, 255, 255))
                bg.paste(rgb_img, mask=alpha_mask)
                img = bg
            elif img.mode == 'P':
                rgba_img = img.convert('RGBA')
                alpha_mask = rgba_img.split()[-1]
                rgb_img = rgba_img.convert('RGB')
                bg = Image.new('RGB', img.size, (255, 255, 255))
                bg.paste(rgb_img, mask=alpha_mask)
                img = bg
            else:
                img = img.convert('RGB')
        else:
            if img.mode == 'P' and target != 'GIF':
                img = img.convert('RGBA')

        # Requirement 1: Fix File Size Bloat with quality=85 & optimizations
        if target in ['JPEG', 'JPG']:
            converted = img.convert('RGB') if img.mode in ('RGBA', 'LA', 'P') else img
            converted.save(output, format='JPEG', quality=85, optimize=True, subsampling='4:2:0', exif=b"")
        elif target == 'PNG':
            img.save(output, format='PNG', optimize=True, compress_level=6)
        elif target == 'WEBP':
            converted = img.convert('RGB') if img.mode in ('RGBA', 'LA', 'P') else img
            converted.save(output, format='WEBP', quality=85, optimize=True, exif=b"")
        elif target == 'GIF':
            img.save(output, format='GIF', optimize=True)
        elif target == 'BMP':
            img.save(output, format='BMP')
        elif target == 'TIFF':
            img.save(output, format='TIFF', compression='tiff_deflate')

        base_name = os.path.splitext(original_filename or "image")[0]
        out_name = f"{base_name}_converted.{ext}"
        return output.getvalue(), mime, out_name
    finally:
        img.close()


@app.post("/api/tools/image-converter")
async def convert_image(
    file: UploadFile = File(...),
    target_format: str = Form(...)
):
    """
    Endpoint: Image Format Converter
    Description: Converts an image to the requested format (JPEG, PNG, WEBP, GIF, BMP, TIFF).
    Handles transparency, LA modes, quality=85 optimization, and multi-frame animation preservation.
    Returns: The converted image file.
    """
    try:
        raw_bytes = await file.read()
        await file.close()

        content_bytes, mime, out_name = await run_in_threadpool(
            _process_image_conversion,
            raw_bytes=raw_bytes,
            target_format=target_format,
            original_filename=file.filename
        )

        return Response(
            content=content_bytes,
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
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
