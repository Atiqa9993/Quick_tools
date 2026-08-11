import fitz, io, sys
sys.path.insert(0, '.')
from PIL import Image as PILImage

doc = fitz.open('C:/Users/Atiqa/Downloads/agricare.pdf')
print(f'Pages: {doc.page_count}')
print(f'Total images: {sum(len(p.get_images(full=True)) for p in doc)}')
print(f'Has text: {any(len(p.get_text().strip()) > 20 for p in doc)}')
print()

processed_xrefs = set()
for page_num in range(len(doc)):
    page = doc.load_page(page_num)
    imgs = page.get_images(full=True)
    for img_info in imgs:
        xref = img_info[0]
        if xref in processed_xrefs:
            continue
        processed_xrefs.add(xref)
        try:
            base = doc.extract_image(xref)
            img_bytes = base.get('image', b'')
            ext = base.get('ext', '?')
            w, h = base.get('width', 0), base.get('height', 0)
            
            pil_img = PILImage.open(io.BytesIO(img_bytes))
            orig_sz = len(img_bytes)
            
            print(f'xref={xref}: page={page_num} ext={ext} mode={pil_img.mode} size={w}x{h} orig={orig_sz} bytes')
            
            # Test JPEG recompression at different qualities
            for q in [80, 60, 35]:
                test_img = pil_img.copy()
                if test_img.mode in ('P', 'PA'):
                    test_img = test_img.convert('RGBA')
                if test_img.mode == 'RGBA':
                    bg = PILImage.new('RGB', test_img.size, (255, 255, 255))
                    bg.paste(test_img, mask=test_img.split()[3])
                    test_img = bg
                elif test_img.mode != 'RGB':
                    test_img = test_img.convert('RGB')
                buf = io.BytesIO()
                test_img.save(buf, format='JPEG', quality=q, optimize=True)
                jpeg_sz = len(buf.getvalue())
                verdict = "SMALLER" if jpeg_sz < orig_sz else "BIGGER"
                print(f'  JPEG q={q}: {jpeg_sz} bytes ({verdict}, diff={orig_sz - jpeg_sz})')
            
            # Test downscaling + quality combos
            for max_d, label, q_val in [(2400, 'low', 80), (1800, 'medium', 60), (1200, 'extreme', 35)]:
                test_img2 = pil_img.copy()
                if test_img2.mode in ('P', 'PA'):
                    test_img2 = test_img2.convert('RGBA')
                if test_img2.mode == 'RGBA':
                    bg = PILImage.new('RGB', test_img2.size, (255, 255, 255))
                    bg.paste(test_img2, mask=test_img2.split()[3])
                    test_img2 = bg
                elif test_img2.mode != 'RGB':
                    test_img2 = test_img2.convert('RGB')
                    
                cw, ch = test_img2.size
                if max(cw, ch) > max_d:
                    ratio = max_d / float(max(cw, ch))
                    nw, nh = max(1, int(cw * ratio)), max(1, int(ch * ratio))
                    test_img2 = test_img2.resize((nw, nh), PILImage.LANCZOS)
                    was_scaled = f'{cw}x{ch} -> {nw}x{nh}'
                else:
                    was_scaled = f'NOT SCALED ({cw}x{ch} <= {max_d})'
                buf2 = io.BytesIO()
                test_img2.save(buf2, format='JPEG', quality=q_val, optimize=True)
                final_sz = len(buf2.getvalue())
                verdict2 = "SMALLER" if final_sz < orig_sz else "BIGGER"
                print(f'  {label} (max={max_d}, q={q_val}): {was_scaled} -> {final_sz} bytes ({verdict2})')
            print()
        except Exception as e:
            print(f'xref={xref}: ERROR {e}')

doc.close()
