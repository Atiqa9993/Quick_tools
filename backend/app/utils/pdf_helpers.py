"""
app/utils/pdf_helpers.py
========================
Shared PDF utilities used across all PDF tool endpoints.
"""
import io
import re
import zipfile
import lxml.etree as LXML_ET

import fitz       # PyMuPDF
import pikepdf
from fastapi import HTTPException
from PIL import Image as PILImage

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_FILE_SIZE = 50 * 1024 * 1024   # 50 MB

W_NS      = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS    = "http://www.w3.org/XML/1998/namespace"
W         = f"{{{W_NS}}}"
XML_SPACE = f"{{{XML_NS}}}space"


# ── Core PDF helpers ──────────────────────────────────────────────────────────

def sanitize_pdf_bytes(pdf_bytes: bytes) -> bytes:
    """Strip linearization via pikepdf so PyMuPDF won't reject the file."""
    try:
        with pikepdf.Pdf.open(io.BytesIO(pdf_bytes)) as pdf:
            buf = io.BytesIO()
            pdf.save(buf, linearize=False)
            return buf.getvalue()
    except (pikepdf.PdfError, pikepdf.DataDecodingError) as e:
        raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file")


def safe_fitz_open(pdf_bytes: bytes) -> fitz.Document:
    """Open PDF through sanitization with a retry fallback."""
    sanitized = pdf_bytes
    try:
        sanitized = sanitize_pdf_bytes(pdf_bytes)
    except Exception:
        pass
    try:
        return fitz.open(stream=sanitized, filetype="pdf")
    except Exception:
        try:
            retry = sanitize_pdf_bytes(pdf_bytes)
            return fitz.open(stream=retry, filetype="pdf")
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file")


def _has_text_content(doc: fitz.Document) -> bool:
    total = 0
    for page in doc:
        total += len(page.get_text().strip())
        if total > 20:
            return True
    return total > 0


def _get_total_font_bytes(doc: fitz.Document) -> tuple[int, int]:
    total, seen = 0, set()
    for page in doc:
        try:
            for f in page.get_fonts():
                xref = f[0]
                if xref > 0 and xref not in seen:
                    seen.add(xref)
                    try:
                        _, _, _, data = doc.extract_font(xref)
                        if data:
                            total += len(data)
                    except Exception:
                        pass
        except Exception:
            pass
    return total, len(seen)


def _recompress_images_in_pdf(pdf_bytes: bytes, jpeg_quality: int, max_dim: int = 0) -> bytes:
    """In-place image recompression — text/vectors untouched."""
    doc = safe_fitz_open(pdf_bytes)
    processed, replaced, skipped = set(), 0, 0

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            if xref in processed:
                continue
            processed.add(xref)
            try:
                base = doc.extract_image(xref)
            except Exception:
                continue
            if not base or not base.get("image"):
                continue

            orig_bytes = base["image"]
            orig_sz    = len(orig_bytes)
            orig_ext   = base.get("ext", "?")
            try:
                pil = PILImage.open(io.BytesIO(orig_bytes))
            except Exception:
                continue

            orig_w, orig_h = pil.size

            # Convert to RGB for JPEG
            rgb = pil
            if rgb.mode in ("P", "PA"):
                rgb = rgb.convert("RGBA")
            if rgb.mode == "RGBA":
                bg = PILImage.new("RGB", rgb.size, (255, 255, 255))
                bg.paste(rgb, mask=rgb.split()[3])
                rgb = bg
            elif rgb.mode != "RGB":
                rgb = rgb.convert("RGB")

            # Optional downscale
            was_scaled = False
            if max_dim > 0 and max(rgb.size) > max_dim:
                ratio = max_dim / float(max(rgb.size))
                rgb = rgb.resize((max(1, int(rgb.width * ratio)), max(1, int(rgb.height * ratio))), PILImage.LANCZOS)
                was_scaled = True

            # Candidate JPEG
            jbuf = io.BytesIO()
            rgb.save(jbuf, format="JPEG", quality=jpeg_quality, optimize=True)
            jpeg_bytes = jbuf.getvalue()

            # Candidate PNG
            pbuf = io.BytesIO()
            rgb.save(pbuf, format="PNG", optimize=True)
            png_bytes = pbuf.getvalue()

            best_b, best_sz, best_fmt = None, orig_sz, "none"
            if len(jpeg_bytes) < best_sz:
                best_b, best_sz, best_fmt = jpeg_bytes, len(jpeg_bytes), f"JPEG(q={jpeg_quality})"
            if len(png_bytes) < best_sz:
                best_b, best_sz, best_fmt = png_bytes, len(png_bytes), "PNG"

            if best_b:
                try:
                    page.replace_image(xref, stream=best_b)
                    replaced += 1
                except Exception:
                    try:
                        page.replace_image(xref, pixmap=fitz.Pixmap(best_b))
                        replaced += 1
                    except Exception:
                        skipped += 1
            else:
                skipped += 1

    for page in doc:
        try:
            page.clean_contents()
        except Exception:
            pass
    if hasattr(doc, "subset_fonts"):
        try:
            doc.subset_fonts()
        except Exception:
            pass

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True, clean=True, deflate_fonts=True, use_objstms=1)
    doc.close()
    out = buf.getvalue()

    try:
        p = pikepdf.Pdf.open(io.BytesIO(out))
        pb = io.BytesIO()
        p.save(pb, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
        p.close()
        if len(pb.getvalue()) < len(out):
            out = pb.getvalue()
    except Exception:
        pass

    print(f"  -> Recompressed {replaced} imgs, skipped {skipped} -> {len(out)} bytes")
    return out


# ── DOCX helpers ──────────────────────────────────────────────────────────────

def _optimize_document_xml(xml_bytes: bytes) -> bytes:
    """Clean up Word document.xml: merge runs, collapse blanks, strip page-num paragraphs."""
    try:
        parser = LXML_ET.XMLParser(strip_cdata=False, resolve_entities=False)
        root   = LXML_ET.fromstring(xml_bytes, parser)
    except Exception as e:
        print(f"[DOCX XML] Parse error: {e}")
        return xml_bytes

    def get_rpr(r):
        rpr = r.find(f"{W}rPr")
        return b"" if rpr is None else LXML_ET.tostring(rpr)

    def has_special(r):
        special = {f"{W}drawing", f"{W}pict", f"{W}object", f"{W}fldChar", f"{W}footnoteReference", f"{W}tab"}
        return any(c.tag in special for c in r)

    def clean_text(t):
        if not t:
            return t
        t = t.replace("\\\\n", "\n").replace("\\n", "\n")
        def repl(m):
            p, n = m.group(1), m.group(2)
            if p in ".!?:;\n\r" or n.isupper() or n.isdigit():
                return f"{p}\n{n}"
            return f"{p} {n}"
        t = re.sub(r"([^\n\r])[\r\n]+([^\n\r])", repl, t)
        return re.sub(r"[ \t]+", " ", t)

    def is_page_num(text):
        t = text.strip()
        if not t:
            return False
        return bool(
            re.match(r"^\d+$", t) or
            re.match(r"^(page|pg\.?)\s*\d+$", t, re.I) or
            re.match(r"^\d+\s*of\s*\d+$", t, re.I) or
            re.match(r"^-\s*\d+\s*-$", t)
        )

    # Find repeated non-table paragraphs (likely headers/footers)
    freq: dict[str, int] = {}
    for p in root.iter(f"{W}p"):
        if not any(a.tag == f"{W}tc" for a in p.iterancestors()):
            txt = "".join(t.text or "" for t in p.findall(f".//{W}t")).strip()
            if len(txt) > 15:
                freq[txt] = freq.get(txt, 0) + 1
    repeats = {k for k, v in freq.items() if v >= 2}

    merged = collapsed = 0

    for p in list(root.iter(f"{W}p")):
        in_tc = any(a.tag == f"{W}tc" for a in p.iterancestors())
        ts    = p.findall(f".//{W}t")
        full  = "".join(t.text or "" for t in ts).strip()

        if not in_tc and (is_page_num(full) or full in repeats):
            par = p.getparent()
            if par is not None:
                par.remove(p)
            continue

        if full:
            for t in ts:
                if t.text and ("\n" in t.text or "\\n" in t.text):
                    t.text = clean_text(t.text)
            if ts:
                if ts[0].text:
                    ts[0].text = ts[0].text.lstrip()
                if ts[-1].text:
                    ts[-1].text = ts[-1].text.rstrip()
            for t in ts:
                if t.text and (t.text.startswith(" ") or t.text.endswith(" ") or "  " in t.text):
                    t.set(XML_SPACE, "preserve")

        runs = [c for c in p if c.tag == f"{W}r"]
        if len(runs) > 1:
            cur = runs[0]
            for nxt in runs[1:]:
                if not has_special(cur) and not has_special(nxt) and get_rpr(cur) == get_rpr(nxt):
                    t1, t2 = cur.find(f"{W}t"), nxt.find(f"{W}t")
                    if t1 is not None and t2 is not None:
                        merged_txt = (t1.text or "") + (t2.text or "")
                        t1.text = merged_txt
                        if merged_txt.startswith(" ") or merged_txt.endswith(" ") or "  " in merged_txt:
                            t1.set(XML_SPACE, "preserve")
                        p.remove(nxt)
                        merged += 1
                        continue
                cur = nxt

    body = root.find(f".//{W}body")
    if body is not None:
        streak, remove_list = 0, []
        for p in [c for c in body if c.tag == f"{W}p"]:
            ts  = p.findall(f".//{W}t")
            txt = "".join(t.text or "" for t in ts)
            has_draw = p.findall(f".//{W}drawing") or p.findall(f".//{W}pict")
            empty = not has_draw and not txt.strip()
            if empty:
                streak += 1
                if streak > 1:
                    remove_list.append(p)
                    collapsed += 1
            else:
                streak = 0
        for p in remove_list:
            body.remove(p)

    for tc in root.iter(f"{W}tc"):
        kids = [c for c in tc if c.tag != f"{W}tcPr"]
        if not kids or kids[-1].tag != f"{W}p":
            tc.append(LXML_ET.Element(f"{W}p"))

    try:
        return LXML_ET.tostring(root, encoding="utf-8", xml_declaration=True, standalone="yes")
    except Exception as e:
        print(f"[DOCX XML] Serialisation error: {e}")
        return xml_bytes


def _optimize_docx_bytes(docx_bytes: bytes) -> bytes:
    """Recompress images in word/media/ and optimise document.xml."""
    in_buf  = io.BytesIO(docx_bytes)
    out_buf = io.BytesIO()
    try:
        with zipfile.ZipFile(in_buf, "r") as iz:
            with zipfile.ZipFile(out_buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as oz:
                for item in iz.infolist():
                    data = iz.read(item.filename)
                    if item.filename == "word/document.xml":
                        data = _optimize_document_xml(data)
                    elif item.filename.startswith("word/media/"):
                        try:
                            img = PILImage.open(io.BytesIO(data))
                            w, h = img.size
                            if max(w, h) > 1200:
                                r   = 1200 / float(max(w, h))
                                img = img.resize((max(1, int(w * r)), max(1, int(h * r))), PILImage.LANCZOS)
                            rgb = img
                            if rgb.mode in ("P", "PA"):
                                rgb = rgb.convert("RGBA")
                            if rgb.mode == "RGBA":
                                bg = PILImage.new("RGB", rgb.size, (255, 255, 255))
                                bg.paste(rgb, mask=rgb.split()[3])
                                rgb = bg
                            elif rgb.mode != "RGB":
                                rgb = rgb.convert("RGB")
                            jb = io.BytesIO()
                            rgb.save(jb, format="JPEG", quality=80, optimize=True)
                            pb = io.BytesIO()
                            img.save(pb, format="PNG", optimize=True)
                            best = data
                            if len(jb.getvalue()) < len(best):
                                best = jb.getvalue()
                            if len(pb.getvalue()) < len(best):
                                best = pb.getvalue()
                            data = best
                        except Exception:
                            pass
                    oz.writestr(item.filename, data)
        return out_buf.getvalue()
    except Exception as e:
        print(f"[DOCX OPT] ZIP optimisation failed: {e}")
        return docx_bytes


def parse_page_ranges(range_str: str, total_pages: int) -> list[tuple[int, int]]:
    ranges = []
    for part in range_str.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            s, e = part.split("-", 1)
            try:
                start = max(0, int(s) - 1)
                end   = min(total_pages - 1, int(e) - 1)
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
