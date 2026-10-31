// Stops a Three.js OrbitControls scene from capturing page scroll.
// Wheel zoom is enabled only after the viewer clicks into the scene and is
// disabled again when the pointer leaves it, so scrolling past a 3D figure
// scrolls the page. Drag-to-rotate is unaffected.
//
// Usage (ES module):
//   import { guardWheel } from '../../components/orbit_wheel_guard.js';  // path relative to the importing file
//   guardWheel(controls, renderer.domElement, hintEl);   // hintEl optional
// hintEl, if given, has its text set to describe the current wheel state.
export function guardWheel(controls, el, hintEl) {
    var idle = 'drag to rotate · click, then scroll to zoom';
    var active = 'drag to rotate · scroll to zoom';
    function set(on) {
        controls.enableZoom = on;
        if (hintEl) hintEl.textContent = on ? active : idle;
    }
    set(false);
    el.addEventListener('pointerdown', function () { set(true); });
    el.addEventListener('pointerleave', function () { set(false); });
    return set;
}
