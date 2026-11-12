# Ahmad Itani — personal website (Card Stack)

Plain HTML/CSS/JS. No build step, no frameworks.

## Before you upload: add 2 files

| File | Where | Notes |
|---|---|---|
| Your photo | `assets/headshot.jpg` | Portrait, about 800×1000 px. Until you add it, a grey placeholder shows. |
| Your CV | `Ahmad Itani CV.pdf` (next to `index.html`) | Same name as on your current site, so old links keep working. |

## Put it online (replaces your current Netlify site)

1. Go to app.netlify.com → open your site **ahmaditani**.
2. Open the **Deploys** tab.
3. Drag this whole folder onto the "Drag and drop your site output folder here" box.
4. Done: https://ahmaditani.netlify.app now shows the new site.

If your current site deploys from GitHub instead, replace the repo's files with these and push.

## Editing

- **Text**: everything is in `index.html`.
- **Accent color**: change `--accent` at the top of `styles.css` (try `#CCFF00`, `#FF8A3D` or `#C4B5FD`).
- **Add a job**: copy one `<article class="job">…</article>` block in `index.html`.
- **Link preview image** (LinkedIn/WhatsApp): `assets/og-image.png`.

## Files

```
index.html        the page
styles.css        all styling
script.js         scroll animations, career arrows, footer year
_redirects        sends old /About links to the homepage
assets/           favicon, preview image, photo
```
