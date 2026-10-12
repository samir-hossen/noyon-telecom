# Part photos

Products without their own photo show a **representative photo of the part type**
(`frontend/public/images/parts/photos/`) with the brand and model written under it,
and the product page says it is a representative photo. As soon as the owner uploads
a real photo (Admin → Import/Export → bulk photo upload), that photo is shown instead.

The photos are real photos from Wikimedia Commons under free licences that allow
commercial use (CC BY / CC BY-SA). `sources.json` lists each one with its author,
licence and link; the site shows the same list at `/photo-credits` (linked from the
footer and the product page), which is what the licences ask for. Our edited versions
(background removed, logos painted out) are shared under the same licence.

Never use photos from other shops, Google Images or suppliers without written permission.

```bash
python3 -m venv .venv && .venv/bin/pip install pillow numpy scipy
.venv/bin/python fetch.py                                   # originals -> src/ (git-ignored)
.venv/bin/python process.py ../../frontend/public/images/parts
```
