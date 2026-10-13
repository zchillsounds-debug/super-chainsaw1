# python3 tools/sheet.py out.png a.png b.png ... -> 2-column grid at half size
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
s = 0.5
tw, th = int(w * s), int(h * s)
cols = 2 if len(ims) > 1 else 1
rows = (len(ims) + cols - 1) // cols
o = Image.new('RGB', (tw * cols + 4 * (cols - 1), th * rows + 4 * (rows - 1)), (255, 0, 255))
for i, im in enumerate(ims):
    o.paste(im.resize((tw, th), Image.LANCZOS), ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
o.save(out)
