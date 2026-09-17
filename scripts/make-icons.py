"""
Regenerates the PWA icon set from the flywheel mark.

    python3 scripts/make-icons.py

Writes icon-192.png, icon-512.png, icon-maskable-512.png and apple-touch-icon.png
into public/. Requires Pillow.
"""

import math
import pathlib

from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parent.parent / "public"
INK = (11, 12, 14, 255)
BRASS = (224, 162, 43, 255)
DIM = (92, 67, 18, 255)


def flywheel(px: int, pad_ratio: float, rounded: bool) -> Image.Image:
    """Render the mark at `px` square. `pad_ratio` leaves maskable safe-area."""
    s = px * 4  # supersample, then downscale for clean edges
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=INK)
    else:
        d.rectangle([0, 0, s, s], fill=INK)

    c = s / 2
    r = (s / 2) * (1 - pad_ratio)
    w = max(2, int(r * 0.24))

    d.ellipse([c - r, c - r, c + r, c + r], outline=DIM, width=w)

    for deg in (30, 150, 270):
        a = math.radians(deg)
        d.line(
            [c, c, c + math.cos(a) * r * 0.72, c + math.sin(a) * r * 0.72],
            fill=DIM,
            width=max(2, int(r * 0.11)),
        )

    # brass momentum arc, ~75% fill
    d.arc([c - r, c - r, c + r, c + r], start=-90, end=180, fill=BRASS, width=w)

    hr = r * 0.52
    d.ellipse([c - hr, c - hr, c + hr, c + hr], fill=INK, outline=DIM, width=max(1, int(r * 0.07)))

    a = math.radians(30)
    cw = r * 0.16
    cx, cy = c + math.cos(a) * r * 0.72, c + math.sin(a) * r * 0.72
    d.ellipse([cx - cw, cy - cw, cx + cw, cy + cw], fill=BRASS)

    return img.resize((px, px), Image.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    flywheel(192, 0.16, True).save(OUT / "icon-192.png")
    flywheel(512, 0.16, True).save(OUT / "icon-512.png")
    flywheel(512, 0.30, False).save(OUT / "icon-maskable-512.png")
    flywheel(180, 0.16, True).save(OUT / "apple-touch-icon.png")
    print(f"wrote 4 icons to {OUT}")
