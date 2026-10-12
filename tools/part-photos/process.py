# Real part photos (Wikimedia Commons, free licences -- see sources.json)
# -> clean cut-outs on a transparent square canvas.
#   python3 fetch.py                                   # originals -> src/
#   python3 process.py ../../frontend/public/images/parts
# Writes photos/{part}.webp (900px), photos/{part}-sm.webp (480px, cards)
# and og/{part}.jpg (1200x630 link-preview image).
import os, sys, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

OUT = sys.argv[1]
SIZE = 900

def bg_field(a, mask, sigma):
    m = mask.astype(np.float32)
    num = np.stack([ndimage.gaussian_filter(a[..., c] * m, sigma) for c in range(3)], -1)
    den = ndimage.gaussian_filter(m, sigma)[..., None]
    return num / np.maximum(den, 1e-4)

def cutout(img, t_low=7.0, t_high=34.0, hole_min=0.004, hole_d=14.0):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    b = max(4, int(min(h, w) * 0.015))
    border = np.zeros((h, w), bool); border[:b] = border[-b:] = True; border[:, :b] = border[:, -b:] = True
    bg0 = np.median(a[border], axis=0)
    d0 = np.sqrt(((a - bg0) ** 2).sum(-1))
    # first pass: obvious background connected to the border -> smooth background field (handles vignetting)
    lab, _ = ndimage.label(d0 < 30)
    keep = np.setdiff1d(np.unique(lab[border]), [0])
    obvious = np.isin(lab, keep)
    bgf = bg_field(a, obvious, sigma=max(h, w) / 12)
    d = np.sqrt(((a - bgf) ** 2).sum(-1))
    cand = d < t_high
    lab, n = ndimage.label(cand)
    keep = set(np.unique(lab[border]).tolist()) - {0}
    # enclosed holes (inside a tray, loops of flex cable) that are clearly background
    sizes = ndimage.sum(np.ones_like(d), lab, index=np.arange(1, n + 1))
    meds = ndimage.median(d, lab, index=np.arange(1, n + 1))
    for i, (s, m) in enumerate(zip(sizes, meds), start=1):
        if s > hole_min * h * w and m < hole_d:
            keep.add(i)
    region = np.isin(lab, list(keep))
    alpha = np.ones((h, w), np.float32)
    soft = np.clip((d - t_low) / (t_high - t_low), 0, 1)
    alpha[region] = soft[region]
    alpha = ndimage.gaussian_filter(alpha, 0.8)
    # remove the background colour from semi-transparent edge pixels (no white halo)
    al = np.clip(alpha, 1e-3, 1)[..., None]
    fg = np.clip((a - (1 - al) * bgf) / al, 0, 255)
    fg = np.where(alpha[..., None] > 0.02, fg, a)
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

def finish(rgba, name, shadow=False, rotate=0, fill=0.86):
    if rotate:
        rgba = rgba.rotate(rotate, resample=Image.BICUBIC, expand=True)
    al = np.asarray(rgba)[..., 3]
    ys, xs = np.where(al > 24)
    rgba = rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = rgba.size
    s = SIZE * fill / max(w, h)
    rgba = rgba.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    x, y = (SIZE - rgba.width) // 2, (SIZE - rgba.height) // 2
    if shadow:  # soft contact shadow for the studio renders that have none
        sh = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        a = rgba.split()[3].point(lambda v: int(v * 0.30))
        blob = Image.new('RGBA', rgba.size, (20, 20, 26, 255)); blob.putalpha(a)
        sh.alpha_composite(blob, (x + 10, y + 16))
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        canvas.alpha_composite(sh)
    canvas.alpha_composite(rgba, (x, y))
    import os
    os.makedirs(f'{OUT}/photos', exist_ok=True); os.makedirs(f'{OUT}/og', exist_ok=True)
    canvas.save(f'{OUT}/photos/{name}.webp', 'WEBP', quality=82, method=6)
    canvas.resize((480, 480), Image.LANCZOS).save(f'{OUT}/photos/{name}-sm.webp', 'WEBP', quality=80, method=6)
    # link-preview image (WhatsApp / Facebook): opaque JPEG, 1200x630
    og = Image.new('RGBA', (1200, 630), (244, 245, 247, 255))
    part = canvas.resize((600, 600), Image.LANCZOS)
    og.alpha_composite(part, (300, 15))
    og.convert('RGB').save(f'{OUT}/og/{name}.jpg', 'JPEG', quality=84, optimize=True, progressive=True)
    print(name, rgba.size)

src = lambda f: Image.open('src/' + f)

def inpaint_logo(im, region, is_logo, is_source, sigma=5.0):
    """Paint over a logo: only the logo's own pixels (plus a 2px rim) are
    replaced, each by a blend of the nearby plain surface around it."""
    a = np.asarray(im.convert('RGBA')).astype(np.float32).copy()
    x0, y0, x1, y1 = region
    sub = a[y0:y1, x0:x1]
    logo = ndimage.binary_dilation(is_logo(sub), iterations=2)
    src = is_source(sub) & ~logo
    m = src.astype(np.float32)
    for c in range(3):
        num = ndimage.gaussian_filter(sub[..., c] * m, sigma)
        den = ndimage.gaussian_filter(m, sigma)
        fill = num / np.maximum(den, 1e-4)
        sub[..., c] = np.where(logo, fill, sub[..., c])
    a[y0:y1, x0:x1] = sub
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def dark_part(rgba, max_lum=110):
    """A dark part (a black glass panel) on a light background: everything
    darker than max_lum, holes filled — no grey shadow around it."""
    a = np.asarray(rgba.convert('RGBA')).astype(np.float32)
    m = ndimage.binary_fill_holes(a[..., :3].mean(-1) < max_lum)
    a[..., 3] = ndimage.gaussian_filter(m.astype(np.float32), 0.8) * 255
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def drop_thin(rgba, r):
    """Removes thin things sticking out of the part (a cable, a wire): a
    morphological opening of the alpha mask, keeping the largest piece."""
    a = np.asarray(rgba).astype(np.float32)
    m = a[..., 3] > 127
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    disk = xx * xx + yy * yy <= r * r
    opened = ndimage.binary_opening(m, structure=disk)
    lab, n = ndimage.label(opened)
    if n > 1:
        sizes = ndimage.sum(opened, lab, range(1, n + 1))
        opened = lab == (np.argmax(sizes) + 1)
    keep = ndimage.gaussian_filter(opened.astype(np.float32), 1.0)
    a[..., 3] = a[..., 3] * np.clip(keep * 1.5, 0, 1)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


lum = lambda s: s[..., :3].mean(-1)
opaque = lambda s: s[..., 3] > 250

# Display: a real phone front with the screen off (Samsung Galaxy S8, the left one of three)
trio = src('phone-screen-off.jpg').convert('RGB'); W, H = trio.size
finish(cutout(trio.crop((0, int(H * 0.10), int(W * 0.285), int(H * 0.98)))), 'display')

# Back glass: a real glass back (Sony Xperia Z1), turned upright; "SONY" and "XPERIA" painted out
back = src('xperia-z1-rear-full.jpg').convert('RGBA').rotate(180)
back = inpaint_logo(back, (515, 1235, 870, 1345), lambda s: (lum(s) > 60) & opaque(s), lambda s: (lum(s) < 45) & opaque(s))
back = inpaint_logo(back, (520, 2250, 820, 2360), lambda s: (lum(s) > 44) & opaque(s), lambda s: (lum(s) < 40) & opaque(s))
back = inpaint_logo(back, (650, 700, 740, 780), lambda s: (lum(s) > 30) & opaque(s), lambda s: (lum(s) < 28) & opaque(s))  # NFC mark
finish(drop_thin(dark_part(back, 72), 12), 'back-glass')  # just the glass panel; a charging cable hangs off one corner

# Default (any other part): a real opened phone, back cover beside it
finish(cutout(src('rn8-opened.jpg')), 'default')

finish(cutout(src('rn8-camera.jpg')), 'camera')
finish(cutout(src('wiko-frontcam.jpg')), 'front-camera')
finish(cutout(src('rn8-io.jpg')), 'charging-port')
# "Logic Board" in this catalog = the charging sub-board (the owner's own photos show those), not the mainboard
finish(cutout(src('rn8-io.jpg')), 'logic-board')
finish(cutout(src('ip5s-speaker.jpg')), 'speaker')
finish(cutout(src('lg-ear.jpg')), 'ear-speaker')
finish(cutout(src('j5-flex.jpg')), 'flex')
finish(cutout(src('lg-frame.jpg')), 'frame')
zen = src('sim-zenfone.png').convert('RGB'); W, H = zen.size
finish(cutout(zen.crop((int(W * 0.40), int(H * 0.28), int(W * 0.98), int(H * 0.88)))), 'sim-tray')


# ---------- Home page hero photos (scene photos, not cut out) ----------
HERO_OUT = os.path.join(OUT, '..', 'hero')


def hero(img, name, rotate=0, focus_y=0.5, size=(1400, 736), quality=76):
    os.makedirs(HERO_OUT, exist_ok=True)
    img = img.convert('RGB')
    if rotate:
        img = img.rotate(rotate, expand=True)
    w, h = img.size
    tw, th = size
    scale = tw / w
    img = img.resize((tw, round(h * scale)), Image.LANCZOS)
    top = max(0, min(img.height - th, round(img.height * focus_y - th / 2)))
    img.crop((0, top, tw, top + th)).save(f'{HERO_OUT}/{name}.webp', 'WEBP', quality=quality, method=6)
    print('hero', name)


hero(src('shift6mq-repair-4k.jpg'), 'hero-parts', focus_y=0.47)
hero(src('ip6s-repair-4.jpg'), 'hero-wholesale', rotate=90, focus_y=0.5, quality=68)
hero(src('ip6s-repair-2.jpg'), 'hero-repair', rotate=90, focus_y=0.5, quality=68)
