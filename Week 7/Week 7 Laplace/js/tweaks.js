// Tweaks panel: colour, font size, offset. Persists via parent postMessage.
(function () {
  const T = window.TWEAKS;
  const panel = document.getElementById('tweaks');

  // The single light default is the inline window.TWEAKS block in index.html.
  const DEFAULTS = Object.assign({}, T);

  function apply() {
    const r = document.documentElement;
    r.style.setProperty('--bg', T.colorBg);
    r.style.setProperty('--fg', T.colorFg);
    r.style.setProperty('--muted', T.colorMuted);
    r.style.setProperty('--real', T.colorReal);
    r.style.setProperty('--imag', T.colorImag);
    r.style.setProperty('--time', T.colorTime);
    r.style.setProperty('--mark', T.colorAccent);
    r.style.setProperty('--body-size', T.fontBody + 'px');
    r.style.setProperty('--math-size', T.fontMath + 'px');
    r.style.setProperty('--hero-size', T.fontHero + 'px');
    r.style.setProperty('--canvas-offset', (T.canvasOffset || 0) + 'px');
    r.style.setProperty('--text-offset', (T.textOffset || 0) + 'px');
    // sync inputs
    document.querySelectorAll('[data-tk]').forEach(el => {
      const k = el.getAttribute('data-tk');
      if (T[k] !== undefined) el.value = T[k];
    });
    // tell canvases to redraw
    window.dispatchEvent(new CustomEvent('theme-change'));
  }

  function persist() {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: T }, '*'); } catch (e) {}
  }

  // Panel events
  panel.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.hasAttribute('data-tk')) return;
    const k = el.getAttribute('data-tk');
    let v = el.value;
    if (el.type === 'range') v = parseFloat(v);
    T[k] = v;
    apply();
    persist();
  });
  document.getElementById('tweaksReset').addEventListener('click', () => {
    Object.assign(T, DEFAULTS);
    apply();
    persist();
  });
  document.getElementById('tweaksX').addEventListener('click', () => {
    panel.classList.remove('show');
    panel.classList.remove('min');
  });
  document.getElementById('tweaksMin').addEventListener('click', () => {
    panel.classList.toggle('min');
    document.getElementById('tweaksMin').textContent = panel.classList.contains('min') ? 'Show' : 'Hide';
  });

  // Edit-mode protocol
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') panel.classList.add('show');
    else if (d.type === '__deactivate_edit_mode') panel.classList.remove('show');
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  apply();
})();
