# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static GitHub Pages site (`callumvidler.github.io`) hosting interactive lecture/study visualisations for **BMEN90033 Bioinstrumentation** at the University of Melbourne. Each "Week N" directory contains standalone HTML pages that simulate a concept (action potentials, semiconductor physics, op-amps, Laplace transforms, filters, etc.) using vanilla JS + Canvas2D + Three.js (via ESM importmap from jsdelivr).

There is **no build system, no package.json, no tests, and no lint config**. Edits to HTML/JS/CSS are the final artefact — opening the file in a browser is the only way to "run" it.

## Running locally

Open `index.html` directly in a browser, or serve the repo root over HTTP (needed for ESM modules in some pages):

```
python3 -m http.server 8000
# then visit http://localhost:8000/
```

Pages are published by GitHub Pages from `main` at the repo root.

## Architecture

### Landing page and navigation
- `index.html` (root) is the landing page and is the source of truth for which topic pages are linked. When adding a new topic, add an `<a href="Week N/topic.html" class="cta-card">…</a>` entry (number tag, title, arrow box) to the appropriate week section.
- Each topic page lives at `Week N/<topic>.html` (spaces in directory names: always quote paths). Topic pages include the fixed `.brand` tag and a `.back-btn` link to `../index.html`.

### Design system (global, shared by every page)
- The site follows the Ambience design system and is **light only**. There is no dark palette, no theme toggle and no `data-theme` attribute; do not reintroduce them.
- `theme.css` and `theme.js` at the repo root are referenced by every page as `../theme.css` / `../theme.js` (or `../../…` from nested paths like `Week 6/Slides/` and `Week 7/Week 7 Laplace/`). Keep this relative-path contract intact when moving pages.
- `theme.css` is the single source of tokens: ink `#1e1e1e` on white, pastel washes, spacing, radii, the type families, the shared chrome (`.brand`, `.back-btn`), hairline controls (`.seg-btn`, `.pill`, `.pillbtn`, `button.ctrl-btn`, grouped in `.seg`), sliders, `.dot-tag`, `.panel`, `.cta-card`. Pages do not define their own base palette.
- **Data palette**: `--d-blue`, `--d-orange`, `--d-pink`, `--d-green`, `--d-violet`, `--d-olive`, plus `--d-slate`, `--d-ink`, `--d-grey` and `-soft` tints for filled regions. Assign hues in that order, keep one colour per physical quantity across a page, and label traces directly when olive and orange appear together. A page CSS maps its trace variables onto these (for example `--c-ic: var(--d-blue)`).
- `theme.js` loads Inter and JetBrains Mono and exposes **`window.T`**, the colour helper for Canvas, D3 and Three.js code: `T.c('blue')`, `T.series`, `T.hex('blue')` for Three.js, `T.text`, `T.textDim`, `T.fg(alpha)`, `T.grid…`, `T.wire`, `T.sceneBg`.
- Style rules: headings weight 300 (display weight 200) in sentence case; labels and controls in uppercase mono; emphasis is ink, with no accent colour on chrome; no shadows, glows or gradients other than the hero wash; controls are 1 px hairline boxes; containers use a 16 px radius.

### Page anatomy (the common pattern)
1. `<link rel="stylesheet" href="../theme.css">`, then `../components/lecture_page.css` for scroll-lecture pages (`.landing`, `section.scene`, `.eyebrow`, `.plot-box`, `.toolbar`, `.readout`, `.legend`, `.callout`, `.eq-block`), then the page CSS, which holds only page-specific layout and the trace-variable mapping.
2. `<script src="../theme.js"></script>` in `<head>`.
3. Page scripts live in a `<topic>_JS/` directory beside the page (model, controls, one file per plot). Three.js pages use an `<script type="importmap">` pointing at the jsdelivr CDN.
4. KaTeX is loaded from jsdelivr when formulas are needed; `components/katex_label.js` places KaTeX labels in SVG.

A CSS or JS file is owned by the page that loads it. Files loaded by several pages (`theme.css`, `theme.js`, `components/`, `Week 6/Slides/slide.css`, the Week 10 deck stylesheets) affect every one of those pages; change shared behaviour there instead of overriding it per page.

### Multi-file features

- **`Week 7/Week 7 Laplace/`** — one `index.html` with section-based scroll navigation that loads `js/*.js` scene scripts (`scene1_car.js` … `scene8_sandbox.js`, plus `common.js`, `nav.js`, `tweaks.js`). `common.js` provides shared canvas helpers (`setupCanvas`, `drawGrid`, colour lookup from CSS vars / `window.TWEAKS`). `nav.js` builds the dot rail from `<section data-label="…">`. `window.TWEAKS` is an inline object in the HTML wrapped by `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` markers — the Tweaks panel UI persists palette/font overrides by rewriting that region.

- **`Week 6/Slides/`** — iframe-based slide deck. `index.html` hosts a sidebar + `<iframe id="stage">` and the slide list (`slides` array). Each slide is its own HTML file (`00_preamble.html` … `20_iv_vi_converter.html`) styled by `slide.css`, whose `--slide-*` variables map onto the theme tokens. When adding/removing slides, edit the `slides` array in `Week 6/Slides/index.html` (commented-out entries in that array are intentional gaps — not dead code).

### Large binary assets
`Week 6/Audio/` and `Week 6/Videos/` hold lecture audio/video used by the slide deck. Do not rewrite or regenerate these; they are referenced from slides verbatim.

## Conventions

- Match the surrounding page's structure when editing a topic: shared classes from `theme.css` and `lecture_page.css`, the standard brand tag and back button, jsdelivr imports.
- When drawing to canvas, always read colours from `window.T` (or CSS vars) rather than hardcoding hex.
- Directory names contain spaces (`Week 2`, `Week 7 Laplace`). Always quote paths in shell commands.
- The `.vibeyardignore` file lists paths excluded from AI readiness scans (lockfiles, minified bundles); no action needed beyond awareness.

## Writing style for any prose added to pages or docs

Any text written into this repository (topic copy, slide content, captions, inline explanations, commit messages, documentation) must follow these rules:

- Use an academic tone: precise, measured, third-person where appropriate, no marketing voice.
- Do not use em-dashes (`—`). Use a comma, semicolon, colon, or a new sentence instead.
- No flowery or ornamental language, no metaphors dressed up as insight, no rhetorical flourishes.
- No clichés or stock phrases ("at the end of the day", "dive into", "unlock", "leverage", "in today's world", "it is important to note that", etc.).
- No cringy or performative wording (no exclamations, no "let's", no second-person pep talk, no emoji unless the user explicitly asks).
- Do not be verbose. Prefer the shortest sentence that is still technically accurate. Remove hedges ("perhaps", "arguably", "it could be said that") unless the uncertainty is the point.
- Prefer concrete nouns and verbs over abstract nominalisations. State the mechanism, not an impression of it.

## When creating graphs or graphics 

When creating any graphs, animation or graphics you must always follow these rules: 

- 2D Plots should be made in D3.js with correctly labeled X-axis and Y-axis. The text on the X and Y axis should be large enough to be readable. If any axis labels include equations, mathematical symbols or sub-script/superscript, then this should be written in Latex Format. '
- Axis title placement depends on the quadrants shown:
    - For plots that show only the positive quadrant (e.g. Bode magnitude/phase, time-domain traces), place the **x-axis title** centred horizontally below the x-axis (outside the plot, in the bottom margin) and the **y-axis title rotated 90° anticlockwise**, centred vertically alongside the y-axis (outside the plot, in the left margin). Do not place either title inside the plot area.
    - For plots that show all four quadrants (e.g. s-plane, complex plane, phasor diagrams where both +X/−X and +Y/−Y are visible), do **not** rotate the y-axis title. Instead:
        - place the **y-axis title** above the plot, outside the plot area, horizontally centred on the y-axis itself (i.e. at x where the y-axis sits, in the top margin);
        - place the **x-axis title** to the right of the plot, outside the plot area, vertically centred on the x-axis itself (i.e. at y where the x-axis sits, in the right margin).
    - Reserve enough padding (pad ≥ ~36–48 px) so the external titles never overlap tick labels, the plot frame, or any drawn elements.
- 3D plots should be created in D3.js or ThreeJs depending on the content of the plots and what it is trying to represent. Ensure that you ask for clarification about this before proceeding 
- Before implementing any graphics, animations, plots, etc.. carefully analyse the placement of text elements, arrows, labels, axis labels or any overlaying elements to ensure that their placement is correct and does not cause overlapping text or elements and that they are laid out correctly with respect to each other. 
- Check that text does not overlap any line elements within the diagrams, plots or figures. 
- Check that there is sufficient gap between neighbouring text, if there is it should be moved so that there is enough space, without changing the text size. 
- If text / elements cannot be moved or localised near their intended label location, then they should be moved and an arrow / secondary element should be placed to indicate what this label or text is referencing 
- If a label is meant to move with an element, ensure that it is placed properly such that it moves correctly and does not obstruct any additional labels, lines or elements throughout its entire range 
- After implementing any graphics, check carefully again to confirm layout before completing the task. 

## Creating Circuit Graphics 

When creating any circuit diagrams, circuit animations or graphics you must always follow these rules: 
- When creating graphics of circuits, ensure that the circuits are arranged correctly, that all lines are orthogonal and straight, i.e no diagonal lines or curved lines. Ensure labels are placed correctly with respect to the components and are not overlapping. 
- Show resistors as rectangles instead of zig-zag lines 
- Ensure that voltage supplies are shown as circles with +/- correctly placed with repect to the circuit and does not overlap any elements 
- Ensure that the circuit labels are correctly sized so that they can be read properly. 
- Use latex for circuit labels where necessary 
