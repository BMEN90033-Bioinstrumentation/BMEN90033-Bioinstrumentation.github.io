// blocks.js  ·  Shared block definitions for the strain-sensing hand case study.
// Exposes window.EMGBlocks: list of the eight signal-processing blocks with a
// canonical order, short descriptions, and short labels for the UI.
// Block ids and canonical order are preserved from the EMG-arm version so the
// per-block transfer functions in signal.js continue to apply unchanged.
(function () {
    // Ten signal-conditioning blocks. The Servo is the chain endcap (the
    // actuator), so it is not a tile here; its mechanical smoothing is
    // applied implicitly after the chain runs.
    var BLOCKS = [
        { id: 'amp',     short: 'AMP', name: 'Bridge amplifier', help: 'Instrumentation amplifier on the Wheatstone bridge; raises the millivolt bridge output to volts.' },
        { id: 'hpf',     short: 'HPF', name: 'High-pass',      help: 'Removes the bridge DC bias and slow thermal drift.' },
        { id: 'bpf',     short: 'BPF', name: 'Band-pass',      help: 'Selects the finger-flexion band and rejects mechanical noise.' },
        { id: 'notch',   short: 'NCH', name: 'Notch (50 Hz)',  help: 'Narrow band-stop; rejects residual 50 Hz mains coupling from the bridge.' },
        { id: 'rect',    short: 'REC', name: 'Rectifier',      help: 'Full-wave |x|; converts AC strain activity to a magnitude.' },
        { id: 'lpf',     short: 'LPF', name: 'Low-pass',       help: 'Smooths the rectified signal to extract a flexion envelope.' },
        { id: 'peak',    short: 'PKD', name: 'Peak detector',  help: 'Active envelope detector; charges rapidly to the peak and decays slowly. Replaces REC and LPF.' },
        { id: 'comp',    short: 'CMP', name: 'Comparator',     help: 'Single-threshold gate; chatters near the threshold under noise.' },
        { id: 'schmitt', short: 'SCH', name: 'Schmitt trigger',help: 'Comparator with hysteresis; gates without chatter when the envelope is noisy.' },
        { id: 'pwm',     short: 'PWM', name: 'PWM',            help: 'Encodes the gated envelope as a 50 Hz pulse train (simplified: duty 0 to 100 %; a real servo expects 1 to 2 ms pulses).' }
    ];

    // Canonical chain: eight stages with mains rejection and the
    // rectifier/low-pass envelope path. Peak Detector and Comparator stay
    // in the tray as alternatives (PKD replaces REC+LPF; CMP replaces SCH).
    var CANONICAL = ['amp', 'hpf', 'bpf', 'notch', 'rect', 'lpf', 'schmitt', 'pwm'];

    var BY_ID = {};
    BLOCKS.forEach(function (b, i) { BY_ID[b.id] = { idx: i, def: b }; });

    window.EMGBlocks = {
        list: BLOCKS,
        canonicalOrder: CANONICAL,
        byId: function (id) { return BY_ID[id] ? BY_ID[id].def : null; },
        positionOf: function (id) { return BY_ID[id] ? BY_ID[id].idx : -1; }
    };
})();
