// Shared helpers for the scrolling trace plots: time scale for the 70 ms
// window (present instant at t = 0) and a path builder over a buffer.
(function () {
    var B = window.BIO;
    B.timeScale = function (iw) {
        return d3.scaleLinear().domain([-(B.N - 1) * B.HH.dt, 0]).range([0, iw]);
    };
    // Path string for buffer arr on scales x (index -> time) and y.
    B.tracePath = function (arr, x, y, step) {
        var dt = B.HH.dt, n = arr.length, gen = d3.line()
            .x(function (d, i) { return x((i - n + 1) * dt); })
            .y(function (d) { return y(d); });
        if (step) gen.curve(d3.curveStepAfter);
        return gen(arr);
    };
})();
