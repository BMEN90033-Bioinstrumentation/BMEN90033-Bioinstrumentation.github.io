// Model readouts (membrane potential, conductances, currents, pump current
// and compartment concentrations), updated per frame. The started-transport
// readout is written by scene_membrane.js.
(function () {
    var B = window.BIO, els;
    B.onTick(function () {
        els = els || document.querySelectorAll('[data-out]');
        var H = B.HH, c = B.concNow;
        var gNa = H.g_Na * Math.pow(H.m, 3) * H.h, gK = H.g_K * Math.pow(H.n, 4);
        var out = {
            vm: H.V.toFixed(1) + ' mV',
            gna: gNa.toFixed(1) + ' mS/cm²',
            gk: gK.toFixed(1) + ' mS/cm²',
            ina: H.INa.toFixed(0) + ' µA/cm²',
            ik: H.IK.toFixed(0) + ' µA/cm²',
            ip: H.Ip.toFixed(2) + ' µA/cm²',
            na: c('na', 'out').toFixed(1) + ' | ' + c('na', 'in').toFixed(1) + ' mM',
            k: c('k', 'in').toFixed(1) + ' | ' + c('k', 'out').toFixed(1) + ' mM'
        };
        els.forEach(function (el) { if (out[el.dataset.out] !== undefined) el.textContent = out[el.dataset.out]; });
    });
})();
