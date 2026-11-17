(function () {
    // The site is light only; there is no theme switching.

    // House fonts: Inter (text, headings) and JetBrains Mono (labels, controls).
    try {
        if (!document.querySelector('link[data-house-fonts]')) {
            var f = document.createElement('link');
            f.rel = 'stylesheet';
            f.setAttribute('data-house-fonts', '');
            f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&family=JetBrains+Mono:wght@400&display=swap';
            document.head.appendChild(f);
        }
    } catch (e) { }

    var INK = '#1e1e1e';
    function k(a) { return 'rgba(0,0,0,' + a + ')'; }
    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    // Colour helper for canvas, D3 and Three.js drawing code. Values follow
    // the tokens in theme.css. Data colours are read from the --d-* palette.
    window.T = {
        isDark: false,
        // Data palette: T.c('blue') or T.series[0]
        names: ['blue', 'orange', 'pink', 'green', 'violet', 'olive', 'slate', 'ink', 'grey'],
        c: function (name) { return cssVar('--d-' + name) || INK; },
        get series() { var s = this; return s.names.slice(0, 6).map(function (n) { return s.c(n); }); },
        // Three.js wants an integer: T.hex('blue')
        hex: function (name) { return parseInt(this.c(name).slice(1), 16); },
        // Surfaces
        plotBg: '#ffffff', plotBg2: '#f7f7f7',
        panelBg: '#f7f7f7', panelBg2: '#f7f7f7', cardBg: '#f7f7f7',
        canvasBg: '#ffffff', canvasBg2: '#f7f7f7',
        sceneBg: 0xffffff, sceneBg2: 0xf7f7f7,
        darkOverlay: 'rgba(255,255,255,0.6)', darkOverlay2: 'rgba(255,255,255,0.65)',
        // Grid lines
        gridFine: k(0.05), gridLight: k(0.07), grid: k(0.09), gridMed: k(0.12),
        gridStrong: k(0.15), gridBold: k(0.2), gridHeavy: k(0.25), gridAxis: k(0.35), gridMax: k(0.4),
        // Text: primary ink and the muted secondary; the intermediate names
        // are retained for existing call sites.
        text: INK, textLight: INK, textSub: INK, textMid: INK,
        textDim: k(0.55), textDimmer: k(0.55), textMuted: k(0.55), textFaint: k(0.55),
        textQuiet: k(0.55), textSlate: k(0.55), textGray: k(0.55),
        // Ink overlays
        overlay02: k(0.02), overlay03: k(0.03), overlay05: k(0.05), overlay08: k(0.06),
        overlay10: k(0.1), overlay15: k(0.12), overlay20: k(0.15), overlay25: k(0.18),
        overlay30: k(0.2), overlay35: k(0.25), overlay40: k(0.3), overlay50: k(0.35),
        overlay60: k(0.45), overlay70: k(0.55), overlay80: k(0.7),
        fg: k,
        // Circuit strokes
        wire: INK, wireDim: '#3a3a3a',
        // Emphasis is ink; there is no accent hue.
        accent: INK, accent2: INK, onAccent: '#ffffff',
        accentA: k,
        // Legacy names retained for existing call sites.
        yellow: INK, yellow2: INK, yellow3: INK, yellowF: INK,
        yellowA: function (a) { return 'rgba(217,102,31,' + a + ')'; },
        yellow3js: 0x1e1e1e, yellow3js2: 0x1e1e1e, yellow3js3: 0x1e1e1e
    };
})();
