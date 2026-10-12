# Downloads the original photos listed below from Wikimedia Commons into src/
# (large ones as a 1920px / 3840px copy). Needs only the standard library.
import json, os, urllib.parse, urllib.request

UA = 'NoyonTelecomPartPhotos/1.0 (https://noyontelecom.com)'
FILES = {
    'phone-screen-off.jpg': ('Smartphone (screen off).jpg', 1920),
    'xperia-z1-rear-full.jpg': ('Sony Xperia Z1 Black C6903 rear.JPG', 3840),
    'rn8-opened.jpg': ('Redmi Note 8 - case opened-4336.jpg', 1920),
    'rn8-camera.jpg': ('Redmi Note 8 - camera module-4929.jpg', 1920),
    'wiko-frontcam.jpg': ('Wiko Rainbow 4G - front camera-91639.jpg', 1920),
    'rn8-io.jpg': ('Redmi Note 8 - IO board-4926.jpg', 1920),
    'ip5s-speaker.jpg': ('IPhone 5s (model A1457) - loudspeaker-5111.jpg', 1920),
    'lg-ear.jpg': ('LG P710 Optimus L7 II - loudspeaker-7051.jpg', 1920),
    'j5-flex.jpg': ('Samsung Galaxy J5 (2017, SM-J530F-DS) - flexible board for display-1053.jpg', 1920),
    'lg-frame.jpg': ('LG P700 Optimus L7 - middle cover, rear view-1341.jpg', 1920),
    'sim-zenfone.png': ('ZenFone 6 sim tray.png', 1920),
    # home page hero photos
    'shift6mq-repair-4k.jpg': ('SHIFT6mq Repair.jpg', 3840),
    'ip6s-repair-4.jpg': ('IPhone 6s display repair 4.jpg', 1920),
    'ip6s-repair-2.jpg': ('IPhone 6s display repair 2.jpg', 1920),
    # phone model backs (model_backs.py)
    'm-8.jpg': ("IPhone 8 silver with white rear.jpg", 1920),
    'm-8plus-gray.jpg': ("IPhone 8 Plus (SpaceGray).jpg", 1920),
    'm-x.jpg': ("Apple iPhone X - back (8111).jpg", 1920),
    'm-xr.jpg': ("IPhone XR Product Red A1984 US version back.jpg", 1920),
    'm-xs.jpg': ("IPhone XS.jpg", 1920),
    'm-11-purple.jpeg': ("IPhone 11.jpeg", 1920),
    'm-11promax.jpg': ("Scan of back of iPhone 11 Pro Max Space Grey.jpg", 1920),
    'm-12mini.jpg': ("IPhone 12 mini.jpg", 1920),
    'm-12pro.jpg': ("IPhone 12 Pro backside.jpg", 1920),
    'm-12promax.jpg': ("IPhone-12-Pro-Max(Blue).jpg", 1920),
    'm-13mini.png': ("IPhone 13 Mini Grün Freigestellt.png", 1920),
    'm-13pro.jpg': ("Back of the iPhone 13 Pro.jpg", 1920),
    'm-14.jpg': ("IPhone 14 Product Red.jpg", 1920),
    'm-14plus.jpg': ("A blue iPhone 14 Plus.jpg", 1920),
    'm-14pro.jpg': ("Back of the iPhone 14 Pro.jpg", 1920),
    'm-14promax.jpg': ("IPhone 14 Pro Max Deep purple A2896 China, Hong Kong and Macao version rear.jpg", 1920),
    'm-15.jpg': ("Back of iPhone 15.jpg", 1920),
    'm-15plus.jpeg': ("IPhone 15 Plus.jpeg", 1920),
    'm-15pro.jpg': ("IPhone 15 Pro.JPG", 1920),
    'm-15promax.jpg': ("IPhone 15 Pro Max.JPG", 1920),
    'm-16.png': ("IPhone 16 Ultramarine Rear.png", 1920),
    'm-16pro.jpg': ("IPhone 16 Pro - black.jpg", 1920),
    'm-16promax.png': ("IPhone 16 Pro Max Desert Titanium Rear.png", 1920),
}

os.makedirs('src', exist_ok=True)
for name, (title, width) in FILES.items():
    if os.path.exists(f'src/{name}'):
        continue
    q = urllib.parse.urlencode({'action': 'query', 'titles': f'File:{title}', 'prop': 'imageinfo', 'iiprop': 'url|size',
                                'iiurlwidth': width, 'format': 'json', 'formatversion': '2'})
    req = urllib.request.Request(f'https://commons.wikimedia.org/w/api.php?{q}', headers={'User-Agent': UA})
    info = json.load(urllib.request.urlopen(req, timeout=60))['query']['pages'][0]['imageinfo'][0]
    url = info['thumburl'] if info['width'] > width else info['url']
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=300).read()
    open(f'src/{name}', 'wb').write(data)
    print(name, len(data))
