# Real photos of each iPhone's back -> straightened, cut-out "back glass"
# product photos (frontend/public/images/models/), one per phone model.
# For each photo (model-backs.json): the phone's 4 corners (picked by hand,
# or found with GrabCut inside a box), each side snapped onto the strongest
# edge, a perspective warp to a flat upright back, rounded corners, and
# glare spots / fingers / foam painted out. Needs: pip install opencv-python-headless
#   python3 model_backs.py ../../frontend/public/images
# Also writes the product -> photo map for the storefront and the server pages.
import os, sys, json, glob
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

CONFIG = json.load(open(os.path.join(os.path.dirname(__file__), 'model-backs.json')))
SPECS = CONFIG['photos']
OUT_IMAGES = sys.argv[1]
OUT = os.path.join(OUT_IMAGES, 'models')
ONLY = set(sys.argv[2:])
DEBUG = os.environ.get('DEBUG_DIR')

def load(key):
    p = glob.glob(f'src/{key}.*')[0]
    im = Image.open(p)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg
    return np.asarray(im.convert('RGB'))[:, :, ::-1].copy()  # BGR

def order(pts):
    pts = np.array(pts, dtype=np.float32)
    s = pts.sum(1); d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], dtype=np.float32)  # tl tr br bl

def intersect(l1, l2):
    (vx1, vy1, x1, y1), (vx2, vy2, x2, y2) = l1, l2
    A = np.array([[vx1, -vx2], [vy1, -vy2]], dtype=np.float64)
    b = np.array([x2 - x1, y2 - y1], dtype=np.float64)
    t = np.linalg.solve(A, b)[0]
    return np.array([x1 + t * vx1, y1 + t * vy1], dtype=np.float32)

def quad_from_mask(mask):
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    peri = cv2.arcLength(hull, True)
    approx = None
    for eps in np.linspace(0.005, 0.12, 60):
        ap = cv2.approxPolyDP(hull, eps * peri, True)
        if len(ap) == 4:
            approx = order(ap.reshape(4, 2)); break
    if approx is None:
        approx = order(cv2.boxPoints(cv2.minAreaRect(c)))
    # Rounded corners: fit a straight line to the middle part of each side and
    # intersect neighbouring sides, so the corners are the sharp virtual ones.
    pts = c.reshape(-1, 2).astype(np.float32)
    lines = []
    for i in range(4):
        a, b = approx[i], approx[(i + 1) % 4]
        ab = b - a; L = np.linalg.norm(ab); u = ab / L; n = np.array([-u[1], u[0]])
        rel = pts - a
        t = rel @ u; dist = np.abs(rel @ n)
        sel = pts[(t > 0.2 * L) & (t < 0.8 * L) & (dist < 0.06 * L)]
        if len(sel) < 10:
            lines.append((u[0], u[1], a[0], a[1])); continue
        vx, vy, x0, y0 = cv2.fitLine(sel, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
        lines.append((vx, vy, x0, y0))
    corners = [intersect(lines[(i - 1) % 4], lines[i]) for i in range(4)]
    return np.array(corners, dtype=np.float32), c

def snap(gray_blur, gx, gy, quad, band):
    """Moves each side onto the strongest edge running along it (within
    +-band px), then intersects the refitted sides: sharp, accurate corners."""
    H, W = gray_blur.shape
    lines = []
    for i in range(4):
        a, b = quad[i], quad[(i + 1) % 4]
        ab = b - a; L = np.linalg.norm(ab); u = ab / L; n = np.array([-u[1], u[0]], dtype=np.float32)
        pts = []
        for t in np.linspace(0.15, 0.85, 48):
            p = a + ab * t
            ds = np.arange(-band, band + 1, 1.0)
            q = p[None, :] + ds[:, None] * n[None, :]
            xs = np.clip(q[:, 0], 0, W - 1).astype(np.float32); ys = np.clip(q[:, 1], 0, H - 1).astype(np.float32)
            vx = cv2.remap(gx, xs.reshape(1, -1), ys.reshape(1, -1), cv2.INTER_LINEAR).ravel()
            vy = cv2.remap(gy, xs.reshape(1, -1), ys.reshape(1, -1), cv2.INTER_LINEAR).ravel()
            strength = np.abs(vx * n[0] + vy * n[1])
            k = int(np.argmax(strength))
            if strength[k] > 4:
                pts.append(q[k])
        if len(pts) >= 8:
            vx_, vy_, x0_, y0_ = cv2.fitLine(np.array(pts, dtype=np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
            lines.append((vx_, vy_, x0_, y0_))
        else:
            lines.append((u[0], u[1], a[0], a[1]))
    return np.array([intersect(lines[(i - 1) % 4], lines[i]) for i in range(4)], dtype=np.float32)


def rounded_mask(w, h, r, scale=4):
    m = Image.new('L', (w * scale, h * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * scale - 1, h * scale - 1], radius=r * scale, fill=255)
    return m.resize((w, h), Image.LANCZOS)

def run(key, spec):
    img = load(spec['src'])
    H, W = img.shape[:2]
    x0, y0, x1, y1 = [int(round(v * (W if i % 2 == 0 else H))) for i, v in enumerate(spec['box'])]
    crop = img[y0:y1, x0:x1].copy()
    h, w = crop.shape[:2]
    if 'corners' in spec:  # corners picked by hand, full-image fractions, tl = camera corner
        quad = np.array([[cx * W - x0, cy * H - y0] for cx, cy in spec['corners']], dtype=np.float32)
        if spec.get('snap', True):
            g = cv2.GaussianBlur(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.6)
            gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
            quad = snap(g, gx, gy, quad, int(spec.get('band', 0.02) * max(h, w)))
        return finish_back(key, spec, crop, quad, quad.reshape(-1, 1, 2).astype(np.int32), w, h)
    if spec.get('mode') == 'alpha':  # already cut out (transparent PNG)
        src = Image.open(glob.glob(f"src/{spec['src']}.*")[0]).convert('RGBA')
        a = np.asarray(src)[y0:y1, x0:x1, 3]
        mask = a > 128
    else:
        m = spec.get('margin', 0.03)
        rect = (int(w * m), int(h * m), int(w * (1 - 2 * m)), int(h * (1 - 2 * m)))
        gc = np.zeros((h, w), np.uint8)
        bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
        cv2.grabCut(crop, gc, rect, bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
        mask = (gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD)
        mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)) > 0
    quad, contour = quad_from_mask(mask)
    tl, tr, br, bl = quad
    wq = (np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2
    hq = (np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2
    if wq > hq:  # landscape: rotate the corner order so the long side is the height
        quad = np.array([bl, tl, tr, br], dtype=np.float32)
    if spec.get('snap', True):
        g = cv2.GaussianBlur(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.6)
        gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
        quad = snap(g, gx, gy, quad, int(spec.get('band', 0.012) * max(h, w)))
    return finish_back(key, spec, crop, quad, contour, w, h)


def finish_back(key, spec, crop, quad, contour, w, h):
    rot = spec.get('rot', 0)
    for _ in range(rot // 90):
        quad = np.array([quad[3], quad[0], quad[1], quad[2]], dtype=np.float32)
    shrink = spec.get('shrink', 0.0)  # pull the corners in a little (cuts off a grey rim)
    if shrink:
        c = quad.mean(0); quad = c + (quad - c) * (1 - shrink)
    ar = spec.get('aspect', 2.05)
    OH = 1400; OW = int(round(OH / ar))
    M = cv2.getPerspectiveTransform(quad, np.array([[0, 0], [OW - 1, 0], [OW - 1, OH - 1], [0, OH - 1]], dtype=np.float32))
    flat = cv2.warpPerspective(crop, M, (OW, OH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    for spot in spec.get('inpaint', []):  # a glare spot, finger or sticker, fractions of the flat back
        m = np.zeros(flat.shape[:2], np.uint8)
        if len(spot) == 3:
            cx, cy, r = spot; cv2.circle(m, (int(cx * OW), int(cy * OH)), int(r * OW), 255, -1)
        else:
            a, b, c, d = spot; cv2.rectangle(m, (int(a * OW), int(b * OH)), (int(c * OW), int(d * OH)), 255, -1)
        # fill each column of the spot by blending the glass just above and
        # just below it (the back's shading runs top to bottom), then feather
        f = flat.astype(np.float32)
        fill = f.copy()
        for x in np.where(m.any(axis=0))[0]:
            ys = np.where(m[:, x] > 0)[0]
            y0, y1 = max(ys.min() - 1, 0), min(ys.max() + 1, f.shape[0] - 1)
            top = f[max(y0 - 6, 0):y0 + 1, x].mean(0); bot = f[y1:min(y1 + 7, f.shape[0]), x].mean(0)
            if ys.max() >= f.shape[0] - 2: bot = top  # spot on the bottom edge: carry the glass above down
            if ys.min() <= 1: top = bot
            t = np.linspace(0, 1, y1 - y0 + 1)[:, None]
            fill[y0:y1 + 1, x] = top * (1 - t) + bot * t
        fill = cv2.GaussianBlur(fill, (0, 0), 3)
        a = cv2.GaussianBlur((m > 0).astype(np.float32), (0, 0), 6)[..., None]
        a = np.clip(a * 1.6, 0, 1)
        flat = np.clip(f * (1 - a) + fill * a, 0, 255).astype(np.uint8)
    flat = Image.fromarray(flat[:, :, ::-1]).convert('RGBA')
    flat.putalpha(rounded_mask(OW, OH, int(OW * spec.get('radius', 0.135))))
    # debug overlay
    dbg = crop.copy()
    cv2.drawContours(dbg, [contour], -1, (0, 255, 0), 3)
    cv2.polylines(dbg, [quad.astype(np.int32)], True, (0, 0, 255), 4)
    cv2.circle(dbg, tuple(quad[0].astype(int)), 18, (255, 0, 0), -1)
    if DEBUG:
        Image.fromarray(dbg[:, :, ::-1]).resize((max(1, w // 4), max(1, h // 4))).save(f'{DEBUG}/dbg-{key}.jpg', quality=80)
    # canvas with a soft shadow
    S = 900
    ph = int(S * 0.88); pw = int(ph / ar)
    phone = flat.resize((pw, ph), Image.LANCZOS)
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    x, y = (S - pw) // 2, (S - ph) // 2
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    blob = Image.new('RGBA', phone.size, (20, 20, 26, 255)); blob.putalpha(phone.split()[3].point(lambda v: int(v * 0.28)))
    sh.alpha_composite(blob, (x + 8, y + 14)); sh = sh.filter(ImageFilter.GaussianBlur(14))
    canvas.alpha_composite(sh); canvas.alpha_composite(phone, (x, y))
    os.makedirs(f'{OUT}/og', exist_ok=True)
    canvas.save(f'{OUT}/{key}-back.webp', 'WEBP', quality=82, method=6)
    canvas.resize((480, 480), Image.LANCZOS).save(f'{OUT}/{key}-back-sm.webp', 'WEBP', quality=80, method=6)
    og = Image.new('RGBA', (1200, 630), (244, 245, 247, 255))
    og.alpha_composite(canvas.resize((600, 600), Image.LANCZOS), (300, 15))
    og.convert('RGB').save(f'{OUT}/og/{key}-back.jpg', 'JPEG', quality=84, optimize=True, progressive=True)
    print(key, 'quad', quad.round(0).tolist())

os.makedirs(OUT, exist_ok=True)
for key, spec in SPECS.items():
    if ONLY and key not in ONLY: continue
    run(key, spec)

# product slug -> photo, for PartTile.jsx (storefront) and seo/partPhotos.js (server pages)
products = CONFIG['products']
missing = sorted(set(products.values()) - set(SPECS))
assert not missing, f'no photo spec for {missing}'
here = os.path.dirname(os.path.abspath(__file__))
site = os.path.join(here, '..', '..')
body = json.dumps(dict(sorted(products.items())), indent=2)
banner = ("// Made by tools/part-photos/model_backs.py: product link -> real photo of that\n"
          "// phone model (public/images/models/{photo}-back.webp). Do not edit by hand.\n")
open(os.path.join(site, 'frontend', 'src', 'content', 'modelPhotos.js'), 'w').write(banner + f'export const MODEL_PHOTOS = {body};\n')
open(os.path.join(site, 'backend', 'src', 'seo', 'modelPhotos.js'), 'w').write(banner + f'export const MODEL_PHOTOS = {body};\n')
print(len(products), 'products mapped')
