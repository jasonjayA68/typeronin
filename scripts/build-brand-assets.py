"""
Build the TypeRonin brand assets from the supplied lockup.

The client supplied two 1200x1200 WebPs, both with an OPAQUE WHITE background.
The "black background" cut is white line art on white, so it cannot be shipped
as-is: on a dark page it renders as a white square, and on a light page it is
invisible. So we derive everything from the light cut, which carries the real
ink, and generate the dark cut ourselves.

Un-matting: the art was composited onto white, so for a pixel C we can recover
coverage as  a = 1 - min(C)/255  and the un-multiplied ink as
F = (C - 255(1-a)) / a. That preserves the sakura pink instead of greying it,
which a plain luminance-key would not.

Dark cut: alpha already carries every soft edge, so the ink is simply repainted
in the dark theme's own tokens from globals.css — --foreground for the neutral
line work, --sakura for the pink. See to_dark().

Run it from anywhere:  python3 scripts/build-brand-assets.py
Requires Pillow. It is a one-shot asset build, not part of `npm run build`, so
Pillow is deliberately not a project dependency.
"""

import os

from PIL import Image

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(OUT, "public/brand/source/typeronin-lockup-original.webp")

# Measured from the ink profile: row 836 is the empty gutter between the
# illustration and the wordmark, so the emblem can be cut without clipping either.
EMBLEM_BOX = (151, 87, 1096, 836)
LOCKUP_BOX = (116, 87, 1100, 1100)
# The hero blossom, measured off the pink channel. The full illustration turns to
# mush below ~32px, so the favicon gets the one shape in the logo that survives it.
BLOSSOM_BOX = (873, 302, 989, 443)

# Straight from globals.css, so the mark and the UI cannot drift apart.
PAPER = (253, 248, 250)        # --background (light). Apple icons cannot be transparent.
INK_DARK_BG = (236, 224, 230)  # --foreground (dark): the neutral ink of the dark cut
SAKURA_DARK = (240, 140, 176)  # --sakura (dark) #f08cb0


def unmatte(src: Image.Image) -> Image.Image:
    """White-background raster -> straight-alpha RGBA."""
    src = src.convert("RGB")
    w, h = src.size
    out = Image.new("RGBA", (w, h))
    sp, op = src.load(), out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = sp[x, y]
            a = 255 - min(r, g, b)
            if a == 0:
                op[x, y] = (0, 0, 0, 0)
                continue
            f = a / 255
            # Un-multiply against white, clamped.
            op[x, y] = (
                min(255, max(0, round((r - 255 * (1 - f)) / f))),
                min(255, max(0, round((g - 255 * (1 - f)) / f))),
                min(255, max(0, round((b - 255 * (1 - f)) / f))),
                a,
            )
    return out


def to_dark(art: Image.Image) -> Image.Image:
    """
    Repaint the ink in the dark theme's own tokens.

    The design system already solves this problem for the UI: --sakura is a deep
    rose (#b8446b) on paper and a light rose (#f08cb0) on plum, because a single
    pink cannot carry both. The mark follows the same rule rather than inventing
    a third pink — so the enso and the wordmark match the buttons beside them.

    The strokes are brushes: their texture lives in the alpha, around 40-60%
    coverage. Over paper that reads as mid pink; over plum the same coverage
    reads as dark maroon. So alpha gets a gamma lift (0.5) — solid enough to
    hold the token's colour, while the variation that makes it a brush stroke
    survives.
    """
    out = art.copy()
    p = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a == 0:
                continue
            if max(r, g, b) - min(r, g, b) < 30:      # neutral ink -> --foreground
                p[x, y] = (*INK_DARK_BG, a)
            else:                                       # pink ink -> --sakura (dark)
                p[x, y] = (*SAKURA_DARK, round(255 * (a / 255) ** 0.5))
    return out


def square(art: Image.Image, pad: float = 0.06) -> Image.Image:
    """Centre the art on a transparent square with breathing room."""
    w, h = art.size
    side = round(max(w, h) * (1 + pad * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(art, ((side - w) // 2, (side - h) // 2))
    return canvas


def flatten(art: Image.Image, bg) -> Image.Image:
    plate = Image.new("RGBA", art.size, (*bg, 255))
    plate.alpha_composite(art)
    return plate.convert("RGB")


def save(img: Image.Image, path: str):
    if path.endswith(".webp"):
        img.save(f"{OUT}/{path}", lossless=True)
    else:
        img.save(f"{OUT}/{path}", optimize=True)
    print("wrote", path, img.size)


art = unmatte(Image.open(SRC))

lockup_light = art.crop(LOCKUP_BOX)
lockup_dark = to_dark(lockup_light)
emblem_light = square(art.crop(EMBLEM_BOX))
emblem_dark = to_dark(emblem_light)

# Full lockup — used on the sign-in screen and anywhere the name is not yet established.
save(lockup_light, "public/brand/typeronin-logo-light.png")
save(lockup_dark, "public/brand/typeronin-logo-dark.png")
save(lockup_light, "public/brand/typeronin-logo-light.webp")
save(lockup_dark, "public/brand/typeronin-logo-dark.webp")

# Emblem — the illustration alone, square. Big enough surfaces only: the touch
# icon, an avatar, a card. Measured at 36px it is a pink smudge, which is why it
# is NOT what the header uses.
save(emblem_light.resize((512, 512), Image.LANCZOS), "public/brand/typeronin-emblem-light.png")
save(emblem_dark.resize((512, 512), Image.LANCZOS), "public/brand/typeronin-emblem-dark.png")

# Mark — the blossom alone, in both theme cuts. This is the small-size brand: the
# header at 36px and the browser tab at 16px. Every other element of the logo
# (the girl, the laptop, the enso) collapses at that size; the flower does not,
# and it is lifted straight out of the logo, so it is the same brand, legible.
blossom = square(art.crop(BLOSSOM_BOX), pad=0.10)
save(blossom.resize((512, 512), Image.LANCZOS), "public/brand/typeronin-mark-light.png")
save(to_dark(blossom).resize((512, 512), Image.LANCZOS), "public/brand/typeronin-mark-dark.png")

# Next serves app/icon.png verbatim — it is not run through the image optimiser —
# so this one file is shipped at the size a tab actually paints, and quantised.
# 512px of anti-aliased pink costs 140kB to render 16 legible pixels.
favicon = blossom.resize((128, 128), Image.LANCZOS)
alpha = favicon.getchannel("A")
favicon = favicon.convert("RGB").quantize(colors=64, method=Image.MEDIANCUT).convert("RGBA")
favicon.putalpha(alpha)
save(favicon, "src/app/icon.png")

# Apple touch icon: rendered around 120px on a home screen, which is big enough for
# the whole illustration. iOS composites alpha onto black, so ship it flat on paper.
save(flatten(emblem_light.resize((180, 180), Image.LANCZOS), PAPER), "src/app/apple-icon.png")

# Open Graph / Twitter card, 1200x630 on paper so it never lands on a host's white.
og = Image.new("RGBA", (1200, 630), (*PAPER, 255))
fit = lockup_light.copy()
fit.thumbnail((1000, 570), Image.LANCZOS)
og.alpha_composite(fit, ((1200 - fit.width) // 2, (630 - fit.height) // 2))
og.convert("RGB").save(f"{OUT}/public/brand/typeronin-og.png")
print("wrote public/brand/typeronin-og.png (1200, 630)")
