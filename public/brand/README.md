# Brand assets — what each file is, and where it shows up

Every file here is **generated**. Do not hand-edit them. Replace the source art,
re-run the build, commit the result:

```bash
python3 scripts/build-brand-assets.py     # needs Pillow: pip install pillow
```

## To change the logo

Replace **one** file:

```
public/brand/source/typeronin-lockup-original.webp
```

That is the master: the full lockup (illustration + wordmark + tagline) drawn in
**dark ink on a plain white background**, square, 1200×1200 or larger. Everything
else on this page is cut, recoloured and resized from it. Then re-run the build
command above.

> **Supply the light version only.** The dark-background version is generated,
> not supplied. The build repaints the ink in the dark theme's own colours
> (`--foreground` and `--sakura` from `globals.css`), which is why the mark
> matches the buttons next to it instead of drifting into a third pink.
>
> A supplied "black background" file is the wrong input twice over: it bakes in a
> black rectangle that clashes with the app's plum background, and if its artwork
> is white-on-white it carries no usable ink at all.

## Generated files, and where each one appears

| File | Where it appears | Notes |
| --- | --- | --- |
| `typeronin-emblem-light.png` | Site header, footer, mobile menu, touch icon — **light theme** | The illustration without the wordmark. `<Logo />` |
| `typeronin-emblem-dark.png` | The same places — **dark theme** | Swapped by CSS on `.dark`, so there is no flash and no JS |
| `typeronin-logo-light.png` | Sign-in screen and other "introduce the brand" spots — **light theme** | The whole drawn lockup. `<Logo variant="lockup" />` |
| `typeronin-logo-dark.png` | The same, **dark theme** | |
| `typeronin-mark-light.png` | Nothing in the app — the favicon master | The blossom alone, cut from the logo |
| `typeronin-mark-dark.png` | Nothing in the app | Kept so the blossom is available on dark ground if ever needed |
| `typeronin-logo-*.webp` | Nothing in the app | Kept as a handoff copy for social posts, decks and print |
| `typeronin-og.png` | Link previews on social media and chat apps | 1200×630, flat on paper, referenced from `app/layout.tsx` metadata |
| `../../src/app/icon.png` | **Browser tab** | The mark at 128px, quantised to ~15kB. Next serves this file verbatim — it is not run through the image optimiser, so size matters |
| `../../src/app/apple-icon.png` | iOS/iPadOS home screen | The emblem at 180px, flat on paper — iOS composites transparency onto black |

`icon.png` and `apple-icon.png` live in `src/app/` and **must stay there**: those
filenames are a Next.js file convention, and Next generates the `<link rel>` tags
from them. Moving or renaming them silently removes the favicon.

## Why the tab icon is a flower and the header is not

A browser tab paints its icon at 16–32px. At that size the girl, the laptop and
the enso average out into a pink smudge — no arrangement of the full artwork
survives it. The blossom is the one shape in the logo that still reads as itself
that small, and it is lifted straight out of the logo, so the tab is not a
different brand, just the legible part of the same one.

Everywhere with room for it shows the artwork itself: the header and footer show
the illustration, and the sign-in screen and the link preview card show the whole
lockup, wordmark and all.

The header renders the illustration at **44px**, not the 36px that is typical for
a nav bar. The artwork is fine line work and loses its subject below roughly that
size. If you ever shrink the header, shrink the padding, not the logo.
