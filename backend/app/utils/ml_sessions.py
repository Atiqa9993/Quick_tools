"""
app/utils/ml_sessions.py
========================
Global singleton sessions for all ML models.
Loaded ONCE at process start to prevent per-request memory leaks.
"""
import sys

# ── UTF-8 console on Windows ──────────────────────────────────────────────────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ── HEIF support (optional) ───────────────────────────────────────────────────
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

# ── rembg: global u2netp session (CPU-optimised) ─────────────────────────────
try:
    from rembg import remove as _rembg_remove, new_session as _new_session
    REMBG_SESSION = _new_session("u2netp")
    rembg_remove   = _rembg_remove
    print("[STARTUP] rembg u2netp session loaded.")
except Exception as _e:
    REMBG_SESSION  = None
    rembg_remove   = None
    print(f"[STARTUP] rembg unavailable ({_e}). Background remover disabled.")

# ── Tesseract ─────────────────────────────────────────────────────────────────
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ── TrOCR: lazy-loaded on first handwriting request ──────────────────────────
_trocr_processor      = None
_trocr_model          = None
_trocr_load_attempted = False


def load_trocr() -> None:
    """Load TrOCR model once. Thread-safe via global flag."""
    global _trocr_processor, _trocr_model, _trocr_load_attempted
    if _trocr_load_attempted:
        return
    _trocr_load_attempted = True
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        print("[OCR] Loading TrOCR handwriting model…")
        _trocr_processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
        _trocr_model     = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")
        print("[OCR] TrOCR loaded.")
    except Exception as e:
        print(f"[OCR] TrOCR unavailable ({e}). Tesseract-only mode active.")


def _trocr_on_lines(img) -> str:
    """Segment image into text lines and run TrOCR on each crop."""
    if _trocr_processor is None or _trocr_model is None:
        return ""
    import torch, numpy as np
    from PIL import Image

    gray  = img.convert("L")
    w, h  = gray.size
    arr   = np.array(gray)
    ink   = (arr < 200).astype(np.uint8)
    row_s = ink.sum(axis=1)
    thr   = w * 0.01

    in_text, lines, start = False, [], 0
    for y in range(h):
        if row_s[y] > thr and not in_text:
            start, in_text = y, True
        elif row_s[y] <= thr and in_text:
            if y - start > 5:
                lines.append((max(0, start - 4), min(h, y + 4)))
            in_text = False
    if in_text and h - start > 5:
        lines.append((max(0, start - 4), h))
    if not lines:
        lines = [(0, h)]

    results = []
    for top, bot in lines:
        crop = img.crop((0, top, w, bot)).convert("RGB")
        pv   = _trocr_processor(images=crop, return_tensors="pt").pixel_values
        with torch.no_grad():
            ids = _trocr_model.generate(pv, max_new_tokens=256)
        text = _trocr_processor.batch_decode(ids, skip_special_tokens=True)[0]
        if text.strip():
            results.append(text.strip())
    return "\n".join(results)


def run_local_ocr(img) -> str:
    """
    Hybrid OCR pipeline:
    1. Tesseract (printed text, fast, high-confidence path).
    2. TrOCR fallback (handwriting).
    """
    text, avg_conf = "", 0
    try:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        words, confs, last_line = [], [], -1
        for i in range(len(data["text"])):
            word = data["text"][i].strip()
            cs   = str(data["conf"][i])
            conf = int(cs) if cs not in ("-1", "") and cs.isdigit() else -1
            if word:
                ln = data["line_num"][i]
                if last_line != -1 and ln != last_line:
                    words.append("\n")
                elif words and words[-1] != "\n":
                    words.append(" ")
                words.append(word)
                if conf >= 0:
                    confs.append(conf)
                last_line = ln
        text     = "".join(words).strip()
        avg_conf = sum(confs) / len(confs) if confs else 0
        if text and avg_conf > 40:
            return text
    except Exception as e:
        print(f"[OCR] Tesseract error: {e}")

    load_trocr()
    try:
        t = _trocr_on_lines(img)
        if t.strip():
            return t.strip()
    except Exception as e:
        print(f"[OCR] TrOCR error: {e}")

    return text or ""
