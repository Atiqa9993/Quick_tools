"""
app/api/pdf_tools.py
====================
PDF processing endpoints — all CPU-bound work runs in thread pools.
"""
import io
import os
import tempfile
import zipfile
from typing import Optional

import fitz
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
import pikepdf

from app.utils.pdf_helpers import (
    MAX_FILE_SIZE,
    _get_total_font_bytes,
    _has_text_content,
    _optimize_docx_bytes,
    _recompress_images_in_pdf,
    parse_page_ranges,
    safe_fitz_open,
    sanitize_pdf_bytes,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# COMPRESS PDF
# ─────────────────────────────────────────────────────────────────────────────

def _do_compress_pdf(raw_bytes: bytes, level: str, target_size_kb: Optional[int]) -> bytes:
    """Synchronous PDF compression — runs in thread pool."""
    original_size = len(raw_bytes)
    pdf_bytes = sanitize_pdf_bytes(raw_bytes)
    doc = safe_fitz_open(pdf_bytes)

    if doc.page_count == 0:
        doc.close()
        raise HTTPException(status_code=400, detail="The PDF has no pages.")

    total_images = sum(len(page.get_images(full=True)) for page in doc)
    has_text     = _has_text_content(doc)

    # ── Text-only path ───────────────────────────────────────────────────────
    if total_images == 0:
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
        struct_buf = io.BytesIO()
        doc.save(struct_buf, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
        struct_bytes = struct_buf.getvalue()
        try:
            pp = pikepdf.Pdf.open(io.BytesIO(struct_bytes))
            pb = io.BytesIO()
            pp.save(pb, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
            pp.close()
            if len(pb.getvalue()) < len(struct_bytes):
                struct_bytes = pb.getvalue()
        except Exception:
            pass
        doc.close()

        if len(struct_bytes) < original_size:
            return struct_bytes
        return raw_bytes

    # ── Image-based path ─────────────────────────────────────────────────────
    presets = {
        "low":     (80,  150, 80,  1200),
        "extreme": (35,  72,  35,  600),
        "medium":  (60,  100, 60,  900),
    }
    img_q, r_dpi, r_q, max_dim = presets.get(level, presets["medium"])

    candidates = []

    # Strategy 1: lossless
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
    lb = io.BytesIO()
    doc.save(lb, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
    lossless = lb.getvalue()
    try:
        pp = pikepdf.Pdf.open(io.BytesIO(lossless))
        pb = io.BytesIO()
        pp.save(pb, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
        pp.close()
        if len(pb.getvalue()) < len(lossless):
            lossless = pb.getvalue()
    except Exception:
        pass
    candidates.append((io.BytesIO(lossless), len(lossless), "lossless"))

    # Strategy 2: image recompression
    try:
        rc = _recompress_images_in_pdf(pdf_bytes, img_q, max_dim)
        candidates.append((io.BytesIO(rc), len(rc), "image-recompress"))
    except Exception as e:
        print(f"[COMPRESS] Recompress failed: {e}")

    # Strategy 3: rasterise (for scanned or extreme)
    rc_reduction = 0
    if len(candidates) > 1:
        rc_sz = candidates[1][1]
        rc_reduction = (original_size - rc_sz) / original_size if rc_sz < original_size else 0

    if not has_text or rc_reduction < 0.20 or level == "extreme" or target_size_kb:
        try:
            rd = fitz.open()
            for pn in range(len(doc)):
                pg  = doc.load_page(pn)
                pix = pg.get_pixmap(dpi=r_dpi)
                ib  = pix.tobytes("jpeg", jpg_quality=r_q)
                np2 = rd.new_page(width=pg.rect.width, height=pg.rect.height)
                np2.insert_image(np2.rect, stream=ib)
            rb = io.BytesIO()
            rd.save(rb, garbage=4, deflate=True, clean=True, use_objstms=1)
            rd.close()
            rr = rb.getvalue()
            try:
                pp = pikepdf.Pdf.open(io.BytesIO(rr))
                pb = io.BytesIO()
                pp.save(pb, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
                pp.close()
                if len(pb.getvalue()) < len(rr):
                    rr = pb.getvalue()
            except Exception:
                pass
            candidates.append((io.BytesIO(rr), len(rr), "rasterize"))
        except Exception as e:
            print(f"[COMPRESS] Rasterize failed: {e}")

    doc.close()

    if target_size_kb:
        tb   = target_size_kb * 1024
        fits = [(b, s, m) for b, s, m in candidates if s <= tb]
        if fits:
            fits.sort(key=lambda c: c[1], reverse=True)
            best_buf, best_sz, _ = fits[0]
        else:
            candidates.sort(key=lambda c: c[1])
            best_buf, best_sz, _ = candidates[0]
    elif level == "extreme":
        candidates.sort(key=lambda c: c[1])
        best_buf, best_sz, _ = candidates[0]
    else:
        safe = [c for c in candidates if c[2] in ("lossless", "image-recompress")]
        safe.sort(key=lambda c: c[1])
        best_buf, best_sz, _ = safe[0] if safe else sorted(candidates, key=lambda c: c[1])[0]

    if best_sz >= original_size:
        return raw_bytes
    best_buf.seek(0)
    return best_buf.getvalue()


@router.post("/api/tools/compress-pdf")
async def compress_pdf(
    file:          UploadFile      = File(...),
    level:         str             = Form("medium"),
    target_size_kb: Optional[int] = Form(None),
):
    """Compress a PDF. Runs entirely in a thread pool — non-blocking."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 50 MB.")
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = await run_in_threadpool(_do_compress_pdf, raw, level, target_size_kb)
        return Response(
            content=result,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="compressed-{file.filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# PDF TO WORD
# ─────────────────────────────────────────────────────────────────────────────

def _do_pdf_to_word(pdf_bytes: bytes, original_filename: str) -> bytes:
    """Synchronous PDF → DOCX conversion — runs in thread pool."""
    from pdf2docx import Converter

    tmp_pdf = tmp_docx = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f:
            f.write(pdf_bytes)
            tmp_pdf = f.name
        tmp_docx = tmp_pdf.replace(".pdf", ".docx")

        cv = Converter(tmp_pdf)
        cv.convert(
            tmp_docx, start=0, end=None,
            parse_lattice_table=True, parse_stream_table=True,
            min_border_clearance=2.0, connected_border_tolerance=0.5,
            shape_min_dimension=3.0, min_svg_w=5.0, min_svg_h=5.0,
            delete_end_line_hyphen=True, list_not_table=True,
            max_line_spacing_ratio=1.8, line_break_free_space_ratio=0.1,
            new_paragraph_free_space_ratio=0.85,
            page_margin_factor_top=0.5, page_margin_factor_bottom=0.5,
            clip_image_res_ratio=2.0,
        )
        cv.close()

        with open(tmp_docx, "rb") as f:
            raw_docx = f.read()

        return _optimize_docx_bytes(raw_docx)
    finally:
        for path in (tmp_pdf, tmp_docx):
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass


@router.post("/api/tools/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    """Convert PDF → editable Word .docx. Runs in thread pool."""
    is_pdf = file.filename.lower().endswith(".pdf") or (
        file.content_type in ("application/pdf", "application/x-pdf", "application/octet-stream")
    )
    if not is_pdf:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        raw      = await file.read()
        pdf_bytes = sanitize_pdf_bytes(raw)
        docx_bytes = await run_in_threadpool(_do_pdf_to_word, pdf_bytes, file.filename)

        out_name = file.filename.rsplit(".", 1)[0] + ".docx"
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# MERGE PDF
# ─────────────────────────────────────────────────────────────────────────────

def _do_merge_pdf(file_data: list[tuple[str, bytes]]) -> bytes:
    merged = fitz.open()
    try:
        for fname, raw in file_data:
            doc = safe_fitz_open(raw)
            if doc.is_encrypted:
                doc.close()
                raise HTTPException(status_code=400, detail=f"'{fname}' is password-protected.")
            try:
                merged.insert_pdf(doc)
            finally:
                doc.close()
        buf = io.BytesIO()
        merged.save(buf, garbage=4, deflate=True)
        return buf.getvalue()
    finally:
        merged.close()


@router.post("/api/tools/merge-pdf")
async def merge_pdf(files: list[UploadFile] = File(...)):
    """Merge 2+ PDFs into one. Runs in thread pool."""
    if not files or len(files) < 2:
        raise HTTPException(status_code=400, detail="Upload at least 2 PDF files.")

    file_data = []
    for f in files:
        is_pdf = f.filename.lower().endswith(".pdf") or (
            f.content_type in ("application/pdf", "application/x-pdf", "application/octet-stream")
        )
        if not is_pdf:
            raise HTTPException(status_code=400, detail=f"'{f.filename}' is not a valid PDF.")
        raw = await f.read()
        await f.close()
        file_data.append((f.filename, raw))

    try:
        merged = await run_in_threadpool(_do_merge_pdf, file_data)
        return Response(
            content=merged,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="merged_document.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# SPLIT PDF
# ─────────────────────────────────────────────────────────────────────────────

def _do_split_pdf(
    raw_bytes: bytes, tab: str,
    range_mode: str = None, range_from: int = None, range_to: int = None,
    fixed_pages: int = None, pages_mode: str = None,
    selected_pages: str = None, target_size_mb: float = None,
) -> tuple[bytes, str, str]:
    doc = safe_fitz_open(raw_bytes)
    try:
        total       = len(doc)
        zip_buf     = io.BytesIO()
        single_b    = None
        single_name = ""
        count       = 0

        with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:

            def add_segment(fname: str, indices: list[int]):
                nonlocal count, single_b, single_name
                nd = fitz.open()
                try:
                    for i in indices:
                        nd.insert_pdf(doc, from_page=i, to_page=i)
                    b = nd.tobytes()
                finally:
                    nd.close()
                count += 1
                if count == 1:
                    single_b, single_name = b, fname
                zf.writestr(fname, b)

            if tab == "range":
                if range_mode == "custom" and range_from and range_to:
                    s, e = max(0, range_from - 1), min(total - 1, range_to - 1)
                    if s <= e:
                        add_segment(f"split_{s+1}_to_{e+1}.pdf", list(range(s, e + 1)))
                elif range_mode == "fixed" and fixed_pages and fixed_pages > 0:
                    for i in range(0, total, fixed_pages):
                        e = min(i + fixed_pages - 1, total - 1)
                        add_segment(f"split_{i+1}_to_{e+1}.pdf", list(range(i, e + 1)))

            elif tab == "pages":
                if pages_mode == "all":
                    for i in range(total):
                        add_segment(f"page_{i+1}.pdf", [i])
                elif pages_mode == "select" and selected_pages:
                    ranges = parse_page_ranges(selected_pages, total)
                    idx = []
                    for s, e in ranges:
                        idx.extend(range(s, e + 1))
                    if idx:
                        add_segment("extracted_pages.pdf", idx)

            elif tab == "size" and target_size_mb and target_size_mb > 0:
                tb, cur = target_size_mb * 1024 * 1024, 0
                while cur < total:
                    start = cur
                    end   = cur
                    td    = fitz.open()
                    for i in range(cur, total):
                        td.insert_pdf(doc, from_page=i, to_page=i)
                        sz = len(td.tobytes())
                        if sz > tb:
                            td.close()
                            end = i - 1 if i > cur else i
                            cur = i if i > cur else i + 1
                            break
                        elif i == total - 1:
                            td.close()
                            end = total - 1
                            cur = total
                            break
                    fname = (f"split_{start+1}_to_{end+1}.pdf" if start != end else f"split_page_{start+1}.pdf")
                    add_segment(fname, list(range(start, end + 1)))

        if count == 0:
            raise HTTPException(status_code=400, detail="No pages matched the given criteria.")
        if count == 1:
            return single_b, "application/pdf", single_name
        return zip_buf.getvalue(), "application/zip", "split_documents.zip"
    finally:
        doc.close()


@router.post("/api/tools/split-pdf")
async def split_pdf(
    file:          UploadFile = File(...),
    tab:           str        = Form(...),
    range_mode:    str        = Form(None),
    range_from:    int        = Form(None),
    range_to:      int        = Form(None),
    fixed_pages:   int        = Form(None),
    pages_mode:    str        = Form(None),
    selected_pages: str       = Form(None),
    target_size_mb: float     = Form(None),
):
    """Split PDF by range, pages, or size. Runs in thread pool."""
    try:
        raw = await file.read()
        await file.close()
        content, media_type, fname = await run_in_threadpool(
            _do_split_pdf, raw, tab, range_mode, range_from, range_to,
            fixed_pages, pages_mode, selected_pages, target_size_mb,
        )
        return Response(
            content=content, media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{fname}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# OCR PDF
# ─────────────────────────────────────────────────────────────────────────────

def _do_pdf_ocr(pdf_bytes: bytes) -> str:
    from PIL import Image
    from app.utils.ml_sessions import run_local_ocr

    doc = safe_fitz_open(pdf_bytes)
    try:
        pages = []
        for idx, page in enumerate(doc):
            text = page.get_text("text").strip()
            if not text:
                pix  = page.get_pixmap(dpi=200)
                img  = Image.open(io.BytesIO(pix.tobytes("png")))
                text = run_local_ocr(img)
            pages.append(f"--- Page {idx + 1} ---\n{text or '[No text detected]'}")
        return "\n\n".join(pages)
    finally:
        doc.close()


@router.post("/api/tools/ocr-pdf")
@router.post("/api/tools/pdf-to-text-local")
async def ocr_pdf_endpoint(
    file:     UploadFile = File(...),
    download: str        = Form("false"),
):
    """Extract text from digital or scanned PDFs. Runs in thread pool."""
    is_pdf = file.filename.lower().endswith(".pdf") or (
        file.content_type in ("application/pdf", "application/x-pdf", "application/octet-stream")
    )
    if not is_pdf:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        raw  = await file.read()
        await file.close()
        text = await run_in_threadpool(_do_pdf_ocr, raw)

        if download.lower() in ("true", "1", "yes"):
            return Response(
                content=text.encode("utf-8"), media_type="text/plain",
                headers={"Content-Disposition": 'attachment; filename="digitized_text.txt"'},
            )
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
