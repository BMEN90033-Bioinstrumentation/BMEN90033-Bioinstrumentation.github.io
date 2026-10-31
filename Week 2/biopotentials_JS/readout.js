// Model readouts (membrane potential, conductances, currents), updated per
// frame. The particle-derived readouts are written by scene_membrane.js.
(function () {
    var B = window.BIO, els;
    B.onTick(function () {
        els = els || document.querySelectorAll('[data-out]');
        var H = B.HH;
        var gNa = H.g_Na * Math.pow(H.m, 3) * H.h, gK = H.g_K * Math.pow(H.n, 4);
        var out = {
            vm: H.V.toFixed(1) + ' mV',
            gna: gNa.toFixed(1) + ' mS/cm²',
            gk: gK.toFixed(1) + ' mS/cm²',
            ina: H.INa.toFixed(0) + ' µA/cm²',
            ik: H.IK.toFixed(0) + ' µA/cm²'
        };
        els.forEach(function (el) { if (out[el.dataset.out] !== undefined) el.textContent = out[el.dataset.out]; });
    });
})();
