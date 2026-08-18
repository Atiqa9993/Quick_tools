"""
app/api/image_tools.py
======================
Image processing endpoints — all CPU-bound work in thread pools.
"""
import io
import os

import anyio
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageColor, ImageFilter, ImageSequence
from starlette.concurrency import run_in_threadpool

from app.utils.ml_sessions import REMBG_SESSION, rembg_remove

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# IMAGE COMPRESSOR
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/tools/image-compressor")
async def compress_image(
    file:      UploadFile = File(...),
    target_kb: float      = Form(100),
):
    """Reduce image file size to target KB. Thread-pool offloaded."""
    try:
        raw = await file.read()
        img = Image.open(io.BytesIO(raw))

        orig_fmt  = (img.format or "JPEG").upper()
        base_name = os.path.splitext(file.filename or "compressed")[0]
        fmt_map   = {
            "JPEG": ("JPEG", "image/jpeg", f"{base_name}.jpg"),
            "JPG":  ("JPEG", "image/jpeg", f"{base_name}.jpg"),
            "PNG":  ("PNG",  "image/png",  f"{base_name}.png"),
            "WEBP": ("WEBP", "image/webp", f"{base_name}.webp"),
            "GIF":  ("GIF",  "image/gif",  f"{base_name}.gif"),
            "BMP":  ("JPEG", "image/jpeg", f"{base_name}.jpg"),
            "TIFF": ("JPEG", "image/jpeg", f"{base_name}.jpg"),
        }
        img_fmt, mime, out_name = fmt_map.get(orig_fmt, ("JPEG", "image/jpeg", f"{base_name}.jpg"))
        target_bytes = int(target_kb * 1024)

        is_anim_gif = (img_fmt == "GIF") and getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1

        def save_at_q(image_obj: Image.Image, q: int) -> bytes:
            buf = io.BytesIO()
            if is_anim_gif:
                frames = [f.copy() for f in ImageSequence.Iterator(img)]
                if len(frames) > 1:
                    frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:],
                                   optimize=True, loop=img.info.get("loop", 0), duration=img.info.get("duration", 100))
                    return buf.getvalue()
            if img_fmt == "PNG":
                if q >= 95:
                    image_obj.save(buf, format="PNG", optimize=True)
                else:
                    colors = max(2, min(256, int(q * 2.7)))
                    q_img  = (image_obj.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
                              if image_obj.mode == "RGBA" else image_obj.quantize(colors=colors))
                    q_img.save(buf, format="PNG", optimize=True)
            elif img_fmt == "GIF":
                image_obj.save(buf, format="GIF", optimize=True)
            elif img_fmt == "WEBP":
                c = image_obj.convert("RGB") if image_obj.mode in ("RGBA", "LA", "P") else image_obj
                c.save(buf, format="WEBP", quality=q, optimize=True, exif=b"")
            else:
                c = image_obj.convert("RGB") if image_obj.mode in ("RGBA", "LA", "P") else image_obj
                c.save(buf, format="JPEG", quality=q, optimize=True, exif=b"")
            return buf.getvalue()

        cur = img.copy()

        def binary_search(image_target: Image.Image):
            low, high, best = 1, 95, None
            lowest = save_at_q(image_target, 1)
            if is_anim_gif:
                r = save_at_q(image_target, 50)
                return (r, r) if len(r) <= target_bytes else (None, r)
            for _ in range(8):
                mid = (low + high) // 2
                r   = save_at_q(image_target, mid)
                if len(r) <= target_bytes:
                    if best is None or len(r) > len(best):
                        best = r
                    low = mid + 1
                else:
                    high = mid - 1
            return best, lowest

        best_under, lowest_q = binary_search(cur)
        result = best_under if best_under is not None else lowest_q

        # Downscale fallback
        if len(result) > target_bytes and not is_anim_gif:
            for _ in range(5):
                nw = int(cur.width * 0.85)
                nh = int(cur.height * 0.85)
                if nw < 50 or nh < 50:
                    break
                cur = cur.resize((nw, nh), Image.Resampling.LANCZOS)
                bu, lo = binary_search(cur)
                result = bu if bu else lo
                if len(result) <= target_bytes:
                    break

        return Response(content=result, media_type=mime,
                        headers={"Content-Disposition": f'attachment; filename="{out_name}"'})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# IMAGE RESIZER
# ─────────────────────────────────────────────────────────────────────────────

def _do_resize(raw: bytes, fname: str, width: int, height: int, maintain_ar: bool) -> tuple[bytes, str, str]:
    img = Image.open(io.BytesIO(raw))
    try:
        ow, oh = img.size
        has_w, has_h = width and width > 0, height and height > 0
        if not has_w and not has_h:
            raise HTTPException(status_code=400, detail="Specify width or height > 0.")

        if maintain_ar:
            ar = ow / oh
            if has_w and not has_h:
                tw, th = width,  max(1, round(width / ar))
            elif has_h and not has_w:
                tw, th = max(1, round(height * ar)), height
            else:
                tw, th = width, max(1, round(width / ar))
        else:
            tw = width  if has_w else ow
            th = height if has_h else oh

        orig_fmt = (img.format or "JPEG").upper()
        base     = os.path.splitext(fname or "resized")[0]
        fmt_map  = {
            "JPEG": ("JPEG", "image/jpeg", f"{base}.jpg"),
            "JPG":  ("JPEG", "image/jpeg", f"{base}.jpg"),
            "PNG":  ("PNG",  "image/png",  f"{base}.png"),
            "WEBP": ("WEBP", "image/webp", f"{base}.webp"),
            "GIF":  ("GIF",  "image/gif",  f"{base}.gif"),
            "BMP":  ("BMP",  "image/bmp",  f"{base}.bmp"),
            "TIFF": ("TIFF", "image/tiff", f"{base}.tiff"),
        }
        ifmt, mime, out = fmt_map.get(orig_fmt, ("JPEG", "image/jpeg", f"{base}.jpg"))
        buf = io.BytesIO()

        is_anim = ifmt == "GIF" and getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1
        if is_anim:
            frames = [f.resize((tw, th), Image.Resampling.LANCZOS) for f in ImageSequence.Iterator(img)]
            frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:],
                           optimize=True, loop=img.info.get("loop", 0), duration=img.info.get("duration", 100))
        else:
            r = img.resize((tw, th), Image.Resampling.LANCZOS)
            try:
                if ifmt == "JPEG":
                    c = r.convert("RGB") if r.mode in ("RGBA", "LA", "P") else r
                    c.save(buf, format="JPEG", quality=80, optimize=True, subsampling="4:2:0", exif=b"")
                elif ifmt == "PNG":
                    r.save(buf, format="PNG", optimize=True, compress_level=6)
                    if len(buf.getvalue()) > len(raw):
                        buf = io.BytesIO()
                        q   = r.quantize(colors=256, method=Image.Quantize.FASTOCTREE) if r.mode in ("RGBA", "LA") else r.quantize(colors=256)
                        q.save(buf, format="PNG", optimize=True)
                elif ifmt == "WEBP":
                    c = r.convert("RGB") if r.mode in ("RGBA", "LA", "P") else r
                    c.save(buf, format="WEBP", quality=80, optimize=True, exif=b"")
                else:
                    r.save(buf, format=ifmt, optimize=True)
            finally:
                r.close()

        return buf.getvalue(), mime, out
    finally:
        img.close()


@router.post("/api/tools/image-resizer")
async def resize_image(
    file:                UploadFile = File(...),
    width:               int        = Form(None),
    height:              int        = Form(None),
    maintain_aspect_ratio: bool     = Form(True),
):
    try:
        raw = await file.read()
        await file.close()
        content, mime, name = await run_in_threadpool(
            _do_resize, raw, file.filename, width, height, maintain_aspect_ratio)
        return Response(content=content, media_type=mime,
                        headers={"Content-Disposition": f'attachment; filename="{name}"'})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# BACKGROUND REMOVER
# ─────────────────────────────────────────────────────────────────────────────

def _run_rembg(img: Image.Image) -> Image.Image:
    if rembg_remove is None or REMBG_SESSION is None:
        raise HTTPException(status_code=503, detail="rembg is not available on this server.")
    return rembg_remove(img, session=REMBG_SESSION)


@router.post("/api/tools/remove-background")
async def remove_background(
    file:             UploadFile = File(...),
    bg_color:         str        = Form(None),
    outline_color:    str        = Form(None),
    outline_size:     int        = Form(0),
    border_radius:    int        = Form(0),
    border_color:     str        = Form(None),
    border_thickness: int        = Form(0),
    skip_remove:      bool       = Form(False),
):
    """AI background removal with optional effects. ML runs in thread pool."""
    img = output_image = None
    try:
        raw = await file.read()
        await file.close()
        img = Image.open(io.BytesIO(raw))

        if skip_remove:
            output_image = img.convert("RGBA")
        else:
            output_image = await anyio.to_thread.run_sync(_run_rembg, img)

        scale = max(output_image.width, output_image.height) / 384.0
        s_outline  = int(outline_size * scale)
        s_border   = int(border_thickness * scale)
        s_radius   = 999999 if border_radius >= 999 else int(border_radius * scale)

        # Outline / stroke
        if outline_color and s_outline > 0:
            mask   = output_image.split()[3]
            fsz    = max(3, s_outline) | 1
            base_m = mask.filter(ImageFilter.MaxFilter(fsz))
            blur_m = base_m.filter(ImageFilter.GaussianBlur(s_outline * 0.7))
            blur_m = blur_m.point(lambda p: min(255, int(p * 1.5)))
            stroke = Image.new("RGBA", output_image.size, ImageColor.getrgb(outline_color))
            stroke.putalpha(blur_m)
            output_image = Image.alpha_composite(stroke, output_image)

        pad     = s_outline if outline_color else 0
        max_dim = max(output_image.width, output_image.height)
        sq      = max_dim + pad * 2
        canvas  = Image.new("RGBA", (sq, sq), (0, 0, 0, 0))
        canvas.alpha_composite(output_image, ((sq - output_image.width) // 2, (sq - output_image.height) // 2))
        output_image = canvas

        if bg_color:
            bg = Image.new("RGBA", (sq, sq), ImageColor.getrgb(bg_color))
            output_image = Image.alpha_composite(bg, output_image)

        has_transp = False
        if s_radius > 0 or (border_color and s_border > 0):
            import numpy as np
            from PIL import ImageDraw
            r = min(s_radius, sq // 2)
            outer = Image.new("L", (sq, sq), 0)
            ImageDraw.Draw(outer).rounded_rectangle([0, 0, sq - 1, sq - 1], radius=r, fill=255)
            if border_color and s_border > 0:
                inner   = Image.new("L", (sq, sq), 0)
                inner_r = max(0, r - s_border)
                b       = s_border
                ImageDraw.Draw(inner).rounded_rectangle([b, b, sq - 1 - b, sq - 1 - b], radius=inner_r, fill=255)
                b_alpha = np.clip(np.array(outer, int) - np.array(inner, int), 0, 255).astype("uint8")
                blay    = Image.new("RGBA", (sq, sq), ImageColor.getrgb(border_color))
                blay.putalpha(Image.fromarray(b_alpha))
                output_image = Image.alpha_composite(output_image, blay)
            if s_radius > 0:
                has_transp = True
                rc, gc, bc, ac = output_image.split()
                new_a = np.minimum(np.array(ac), np.array(outer)).astype("uint8")
                output_image = Image.merge("RGBA", (rc, gc, bc, Image.fromarray(new_a)))

        if bg_color and not has_transp:
            output_image = output_image.convert("RGB")
            out_fmt, mime, ext = "JPEG", "image/jpeg", "jpg"
        else:
            out_fmt, mime, ext = "PNG", "image/png", "png"

        base     = os.path.splitext(file.filename or "image")[0]
        out_name = f"{base}_nobg.{ext}"
        buf      = io.BytesIO()
        output_image.save(buf, format=out_fmt, optimize=True)

        return Response(content=buf.getvalue(), media_type=mime,
                        headers={"Content-Disposition": f'attachment; filename="{out_name}"'})
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for obj in (img, output_image):
            if obj is not None:
                try: obj.close()
                except Exception: pass


# ─────────────────────────────────────────────────────────────────────────────
# IMAGE CONVERTER
# ─────────────────────────────────────────────────────────────────────────────

def _do_convert(raw: bytes, target_format: str, original_filename: str) -> tuple[bytes, str, str]:
    img = Image.open(io.BytesIO(raw))
    try:
        target = target_format.upper()
        is_animated = getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1
        buf = io.BytesIO()

        fmt_map = {
            "JPEG": ("JPEG", "image/jpeg", "jpg"),
            "JPG":  ("JPEG", "image/jpeg", "jpg"),
            "PNG":  ("PNG",  "image/png",  "png"),
            "WEBP": ("WEBP", "image/webp", "webp"),
            "GIF":  ("GIF",  "image/gif",  "gif"),
            "BMP":  ("BMP",  "image/bmp",  "bmp"),
            "TIFF": ("TIFF", "image/tiff", "tiff"),
        }
        if target not in fmt_map:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {target}")

        out_fmt, mime, ext = fmt_map[target]
        base = os.path.splitext(original_filename or "image")[0]

        if is_animated and target in ("GIF", "WEBP"):
            frames = [f.copy() for f in ImageSequence.Iterator(img)]
            if len(frames) > 1:
                if target == "GIF":
                    frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:],
                                   loop=img.info.get("loop", 0), duration=img.info.get("duration", 100), optimize=True)
                else:
                    frames[0].save(buf, format="WEBP", save_all=True, append_images=frames[1:],
                                   quality=85, loop=img.info.get("loop", 0), duration=img.info.get("duration", 100), minimize_size=True)
                return buf.getvalue(), mime, f"{base}_converted.{ext}"

        if target in ("JPEG", "JPG", "BMP"):
            if img.mode in ("RGBA", "LA"):
                alpha = img.split()[-1]
                bg    = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img.convert("RGB"), mask=alpha)
                img = bg
            elif img.mode == "P":
                rgba  = img.convert("RGBA")
                alpha = rgba.split()[-1]
                bg    = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(rgba.convert("RGB"), mask=alpha)
                img = bg
            else:
                img = img.convert("RGB")
        elif img.mode == "P" and target != "GIF":
            img = img.convert("RGBA")

        if target in ("JPEG", "JPG"):
            c = img.convert("RGB") if img.mode in ("RGBA", "LA", "P") else img
            c.save(buf, format="JPEG", quality=85, optimize=True, subsampling="4:2:0", exif=b"")
        elif target == "PNG":
            img.save(buf, format="PNG", optimize=True, compress_level=6)
        elif target == "WEBP":
            c = img.convert("RGB") if img.mode in ("RGBA", "LA", "P") else img
            c.save(buf, format="WEBP", quality=85, optimize=True, exif=b"")
        elif target == "GIF":
            img.save(buf, format="GIF", optimize=True)
        elif target == "BMP":
            img.save(buf, format="BMP")
        elif target == "TIFF":
            img.save(buf, format="TIFF", compression="tiff_deflate")

        return buf.getvalue(), mime, f"{base}_converted.{ext}"
    finally:
        img.close()


@router.post("/api/tools/image-converter")
async def convert_image(
    file:          UploadFile = File(...),
    target_format: str        = Form(...),
):
    try:
        raw = await file.read()
        await file.close()
        content, mime, name = await run_in_threadpool(_do_convert, raw, target_format, file.filename)
        return Response(content=content, media_type=mime,
                        headers={"Content-Disposition": f'attachment; filename="{name}"'})
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# MERGE IMAGES
# ─────────────────────────────────────────────────────────────────────────────

def _do_merge(image_bytes_list: list[bytes], mode: str) -> tuple[bytes, str, str]:
    pil_images = resized = []
    canvas = None
    try:
        pil_images = [Image.open(io.BytesIO(b)) for b in image_bytes_list]
        layout = mode.lower() if mode.lower() in ("vertical", "horizontal") else "vertical"
        has_alpha = any(img.mode in ("RGBA", "LA") or "transparency" in img.info for img in pil_images)
        buf = io.BytesIO()

        if layout == "vertical":
            max_w = max(img.width for img in pil_images)
            resized = []
            for img in pil_images:
                if img.width == max_w:
                    resized.append(img.convert("RGBA"))
                else:
                    sc  = max_w / img.width
                    nh  = max(1, int(img.height * sc))
                    resized.append(img.resize((max_w, nh), Image.Resampling.LANCZOS).convert("RGBA"))
            canvas = Image.new("RGBA", (max_w, sum(i.height for i in resized)), (0, 0, 0, 0))
            y = 0
            for img in resized:
                canvas.paste(img, (0, y), mask=img.split()[3])
                y += img.height
        else:
            max_h = max(img.height for img in pil_images)
            resized = []
            for img in pil_images:
                if img.height == max_h:
                    resized.append(img.convert("RGBA"))
                else:
                    sc = max_h / img.height
                    nw = max(1, int(img.width * sc))
                    resized.append(img.resize((nw, max_h), Image.Resampling.LANCZOS).convert("RGBA"))
            canvas = Image.new("RGBA", (sum(i.width for i in resized), max_h), (0, 0, 0, 0))
            x = 0
            for img in resized:
                canvas.paste(img, (x, 0), mask=img.split()[3])
                x += img.width

        if has_alpha:
            canvas.save(buf, format="PNG", optimize=True)
            return buf.getvalue(), "image/png", f"merged_image_{layout}.png"
        else:
            rgb = canvas.convert("RGB")
            rgb.save(buf, format="JPEG", quality=85, optimize=True, subsampling="4:2:0", exif=b"")
            rgb.close()
            return buf.getvalue(), "image/jpeg", f"merged_image_{layout}.jpg"
    finally:
        for lst in (pil_images, resized):
            for img in lst:
                try: img.close()
                except Exception: pass
        if canvas:
            try: canvas.close()
            except Exception: pass


@router.post("/api/tools/merge-images")
async def merge_images(
    files: list[UploadFile] = File(...),
    mode:  str              = Form("vertical"),
):
    if not files or len(files) < 2:
        raise HTTPException(status_code=400, detail="Upload at least 2 images to merge.")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed at once.")

    try:
        raw_list = []
        for f in files:
            raw_list.append(await f.read())
            await f.close()

        content, mime, name = await run_in_threadpool(_do_merge, raw_list, mode)
        return Response(content=content, media_type=mime,
                        headers={"Content-Disposition": f'attachment; filename="{name}"'})
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
