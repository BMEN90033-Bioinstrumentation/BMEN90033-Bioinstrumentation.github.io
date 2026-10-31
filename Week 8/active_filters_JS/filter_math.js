// Pole and zero generators for the four classical lowpass families.
// Butterworth, Chebyshev I and elliptic use a passband edge ω = 1 rad/s;
// Chebyshev II uses a stopband edge ω_s = 1 rad/s.
// Each generator returns { poles, zeros, gain } where poles and zeros
// are arrays of complex numbers { re, im } and gain is the multiplicative
// constant on the numerator so that the magnitude is unity at its peak.
(function () {

    // ─── Complex arithmetic ──────────────────────────────────────
    function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
    function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
    function cMul(a, b) {
        return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    }
    function cDiv(a, b) {
        var d = b.re * b.re + b.im * b.im;
        return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
    }
    function cAbs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }
    function cArg(a) { return Math.atan2(a.im, a.re); }

    // Evaluate H(s) = gain * Π(s - zk) / Π(s - pk) at s = jω.
    function evalHjw(omega, poles, zeros, gain) {
        var s = { re: 0, im: omega };
        var num = { re: gain, im: 0 };
        if (zeros) {
            for (var i = 0; i < zeros.length; i++) {
                num = cMul(num, cSub(s, zeros[i]));
            }
        }
        var den = { re: 1, im: 0 };
        for (var j = 0; j < poles.length; j++) {
            den = cMul(den, cSub(s, poles[j]));
        }
        return cDiv(num, den);
    }

    // Sample magnitude (in dB) and phase (in degrees) over a log frequency
    // sweep. If filter.evalMag(w) is provided it overrides the magnitude
    // from pole-zero evaluation; the phase is always taken from the
    // pole-zero form for consistency.
    function sampleResponse(filter, wMin, wMax, n) {
        var raw = [];
        var maxMag = 0;
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var Hjw = evalHjw(w, filter.poles, filter.zeros || [], filter.gain || 1);
            var mag = filter.evalMag ? filter.evalMag(w) : cAbs(Hjw);
            var phRad = cArg(Hjw);
            raw.push({ w: w, mag: mag, phRad: phRad });
            if (w <= 1.0 && mag > maxMag) maxMag = mag;
        }
        if (maxMag === 0) maxMag = 1;
        var phaseUnwrapped = [raw[0].phRad];
        for (var k = 1; k < raw.length; k++) {
            var prev = phaseUnwrapped[k - 1];
            var p = raw[k].phRad;
            while (p - prev > Math.PI) p -= 2 * Math.PI;
            while (p - prev < -Math.PI) p += 2 * Math.PI;
            phaseUnwrapped.push(p);
        }
        var pts = [];
        for (var m = 0; m < raw.length; m++) {
            var magNorm = raw[m].mag / maxMag;
            pts.push({
                w: raw[m].w,
                magDb: 20 * Math.log10(Math.max(magNorm, 1e-12)),
                phase: phaseUnwrapped[m] * 180 / Math.PI
            });
        }
        return pts;
    }

    // ─── Butterworth ─────────────────────────────────────────────
    // Poles equally spaced on the unit circle in the LHP.
    function butterworth(N) {
        var poles = [];
        for (var k = 1; k <= N; k++) {
            var theta = Math.PI / 2 + (2 * k - 1) * Math.PI / (2 * N);
            poles.push({ re: Math.cos(theta), im: Math.sin(theta) });
        }
        // Monic numerator H(s) = K / Π(s - pk). |H(0)| = K / |Π(-pk)|.
        // Π(-pk) for Butterworth on unit circle equals (-1)^N times a real
        // number; |Π(-pk)| = 1 since each |pk| = 1, so K = 1.
        return { poles: poles, zeros: [], gain: 1, family: 'butter' };
    }

    // ─── Chebyshev Type I ────────────────────────────────────────
    // Poles on an ellipse with semi-axes (sinh μ, cosh μ).
    function chebyshev1(N, eps) {
        var mu = Math.asinh(1 / eps) / N;
        var sh = Math.sinh(mu);
        var ch = Math.cosh(mu);
        var poles = [];
        for (var k = 1; k <= N; k++) {
            var theta = (2 * k - 1) * Math.PI / (2 * N);
            poles.push({ re: -sh * Math.sin(theta), im: ch * Math.cos(theta) });
        }
        // Compute K so that the peak passband magnitude is 1.
        // For monic H(s) = K / Π(s - pk), |H(jω_peak)| = K / Π|jω_peak - pk|.
        // Numerical normalisation handled by sampleResponse, but we still
        // want a sensible default gain so the time-domain shape is right.
        var prod = { re: 1, im: 0 };
        for (var i = 0; i < poles.length; i++) {
            prod = cMul(prod, { re: -poles[i].re, im: -poles[i].im });
        }
        var gain;
        if (N % 2 === 1) {
            gain = cAbs(prod);                     // peak at DC where |H| = 1
        } else {
            gain = cAbs(prod) / Math.sqrt(1 + eps * eps); // even N: DC sits at ripple floor
        }
        return { poles: poles, zeros: [], gain: gain, family: 'cheb1' };
    }

    // ─── Chebyshev Type II ───────────────────────────────────────
    // Zeros on the imaginary axis at ω_zk = 1/cos(θ_k); poles are the
    // reciprocals of a Chebyshev I prototype with the same N and ε.
    // Normalised here so that the passband is monotone with |H(0)| = 1
    // and the stopband edge sits at ω_s = 1.
    function chebyshev2(N, eps) {
        // Zeros: at jω_zk = j/cos(θ_k). Each zero contributes a complex
        // conjugate pair on the imaginary axis, except for the middle
        // notch at infinity for N odd (no finite zero).
        var zeros = [];
        var L = Math.floor(N / 2);
        for (var k = 1; k <= L; k++) {
            var theta = (2 * k - 1) * Math.PI / (2 * N);
            var wz = 1 / Math.cos(theta);
            zeros.push({ re: 0, im: wz });
            zeros.push({ re: 0, im: -wz });
        }
        // Poles: invert Chebyshev I prototype poles.
        var nu = Math.asinh(1 / eps) / N;
        var sh = Math.sinh(nu);
        var ch = Math.cosh(nu);
        var poles = [];
        for (var k2 = 1; k2 <= N; k2++) {
            var th = (2 * k2 - 1) * Math.PI / (2 * N);
            var pre = -sh * Math.sin(th);
            var pim = ch * Math.cos(th);
            var d = pre * pre + pim * pim;
            poles.push({ re: pre / d, im: -pim / d });
        }
        // Gain: choose so |H(0)| = 1.
        var H0 = { re: 1, im: 0 };
        var s0 = { re: 0, im: 0 };
        for (var z = 0; z < zeros.length; z++) H0 = cMul(H0, cSub(s0, zeros[z]));
        var den = { re: 1, im: 0 };
        for (var p = 0; p < poles.length; p++) den = cMul(den, cSub(s0, poles[p]));
        var ratio = cDiv(H0, den);
        var gain = 1 / cAbs(ratio);
        return { poles: poles, zeros: zeros, gain: gain, family: 'cheb2' };
    }

    // ─── Elliptic (Cauer) ────────────────────────────────────────
    // Lowpass elliptic prototype with passband edge ωp = 1, 0.5 dB passband
    // ripple (ε = 0.3493) and fixed selectivity ξ = ωs/ωp = 1.6. With ξ and
    // ε fixed, the stopband attenuation follows from N (degree equation):
    // 9.6, 24.1, 39.2, 54.3 dB for N = 2..5. Poles and zeros are tabulated
    // from scipy.signal.ellip(N, 0.5, Rs, 1, analog=True); zeros are at
    // ω = 1/(κ·cd((2r−1)K/N, κ)), κ = 1/ξ. Magnitude, phase, probe and
    // 3D surface all evaluate this one pole-zero set.
    var ELLIP_TABLE = {
        2: { zeros: [2.135041], poles: [[-0.548751, 1.142326]] },
        3: { zeros: [1.795435], poles: [[-0.743208, 0], [-0.239090, 1.045165]] },
        4: { zeros: [1.703238, 3.777663], poles: [[-0.454799, 0.495456], [-0.134302, 1.021356]] },
        5: { zeros: [1.664234, 2.520870], poles: [[-0.415499, 0], [-0.286941, 0.691324], [-0.086020, 1.012509]] }
    };
    function elliptic(N) {
        var epsP = Math.sqrt(Math.pow(10, 0.05) - 1);
        var t = ELLIP_TABLE[Math.min(5, Math.max(2, N))];
        var zeros = [], poles = [];
        t.zeros.forEach(function (w) {
            zeros.push({ re: 0, im: w });
            zeros.push({ re: 0, im: -w });
        });
        t.poles.forEach(function (p) {
            poles.push({ re: p[0], im: p[1] });
            if (p[1] !== 0) poles.push({ re: p[0], im: -p[1] });
        });
        // Gain: passband maximum is unity, so |H(0)| = 1 for odd N and
        // 1/sqrt(1 + ε²) for even N (DC sits at the ripple trough).
        var target = (poles.length % 2 === 1) ? 1 : 1 / Math.sqrt(1 + epsP * epsP);
        var gain = target / cAbs(evalHjw(0, poles, zeros, 1));
        return { poles: poles, zeros: zeros, gain: gain, family: 'ellip' };
    }

    window.FilterMath = {
        cAdd: cAdd, cSub: cSub, cMul: cMul, cDiv: cDiv, cAbs: cAbs, cArg: cArg,
        evalHjw: evalHjw,
        sampleResponse: sampleResponse,
        butterworth: butterworth,
        chebyshev1: chebyshev1,
        chebyshev2: chebyshev2,
        elliptic: elliptic
    };
})();
