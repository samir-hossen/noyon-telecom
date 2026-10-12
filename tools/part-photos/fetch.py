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
