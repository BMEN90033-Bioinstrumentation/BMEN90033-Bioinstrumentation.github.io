// Section 01 readout: physiological velocity ranges and the speed ratio of
// the animation, set by the internode distance and the node timing.
(function () {
    var M = window.MYE;
    M.onRender(function () {
        var ratio = M.p.internode / (M.DWELL_TIME + M.JUMP_DURATION) / M.UNMYEL_BASE_SPEED;
        var el = document.querySelector('[data-ratio]');
        if (el) el.textContent = ratio.toFixed(1) + '×';
    });
})();
