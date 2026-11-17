// Scene 03 · Streetlight comparator.
// A draggable sun moves along an arc across the sky. Its height defines a
// normalised sensor voltage (0 at horizon, 1 at zenith). A draggable threshold marker
// on the right-hand bar sets the dusk level. The lamp is on whenever the
// sensor sits below threshold.
(function () {
    var svgSel = '#plot-light-scene';
    var rdSensor = document.getElementById('light-sensor');
    var rdThresh = document.getElementById('light-thresh');
    var rdLamp = document.getElementById('light-lamp');

    var state = {
        sunFrac: 0.30,    // 0..1 along the arc, 0=east horizon, 0.5=zenith, 1=west
        thresh: 0.30
    };

    var svg = d3.select(svgSel).classed('ov', true);
    var W = 600, H = 420;
    var iw, ih;
    var METER_W = 96;   // right-hand column reserved for the sensor meter
    var SKY_TOP = 34;   // clear strip for the panel label
    var sceneW;

    var gRoot = svg.append('g');
    var gSky = gRoot.append('g');
    var gSun = gRoot.append('g');
    var gGround = gRoot.append('g');
    var gLamp = gRoot.append('g');
    var gMeter = gRoot.append('g'); // right-side sensor meter

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(360, rect.width);
        H = Math.max(280, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W; ih = H;
        sceneW = iw - METER_W;
    }

    function sunPos() {
        var arcXMin = 60, arcXMax = sceneW - 30;
        var cx = arcXMin + state.sunFrac * (arcXMax - arcXMin);
        var horizon = ih - 110;
        var zenith = SKY_TOP + 30;
        var bell = Math.sin(state.sunFrac * Math.PI); // 0 at horizons, 1 at noon
        var cy = horizon - bell * (horizon - zenith);
        return { x: cx, y: cy, height: bell };
    }

    function drawStatic() {
        gSky.selectAll('*').remove();
        gGround.selectAll('*').remove();

        var sun = sunPos();
        var horizon = ih - 110;
        // Light level (0 = night, 1 = noon). Sky and ground tone encode this
        // level by interpolating between two palette tokens.
        var k = Math.max(0, sun.height);
        var skyCol = d3.interpolateRgb(T.c('slate'), T.c('blue-soft'))(k);
        var groundCol = d3.interpolateRgb(T.c('ink'), T.c('olive-soft'))(k);

        gSky.append('rect')
            .attr('x', 0).attr('y', SKY_TOP).attr('width', sceneW).attr('height', horizon - SKY_TOP)
            .attr('fill', skyCol);

        // Stars when dark
        if (k < 0.35) {
            var nstars = 60;
            var seed = 7;
            for (var i = 0; i < nstars; i++) {
                seed = (seed * 9301 + 49297) % 233280;
                var sx = (seed / 233280) * sceneW;
                seed = (seed * 9301 + 49297) % 233280;
                var sy = SKY_TOP + (seed / 233280) * (horizon - SKY_TOP) * 0.85;
                gSky.append('circle').attr('cx', sx).attr('cy', sy).attr('r', 0.8 + (i % 3) * 0.3)
                    .attr('fill', 'var(--white)').attr('opacity', (0.35 - k) * 1.6);
            }
        }

        // Ground
        gGround.append('rect')
            .attr('x', 0).attr('y', horizon).attr('width', sceneW).attr('height', ih - horizon)
            .attr('fill', groundCol);
        // road
        gGround.append('rect')
            .attr('x', 0).attr('y', horizon + 40).attr('width', sceneW).attr('height', 40)
            .attr('fill', 'var(--carbon-black-400)');
        gGround.append('line')
            .attr('x1', 0).attr('x2', sceneW)
            .attr('y1', horizon + 60).attr('y2', horizon + 60)
            .attr('stroke', 'var(--white)').attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '14 12');

        // Lamp post
        var lampX = sceneW - 80, baseY = horizon + 90;
        gGround.append('line')
            .attr('x1', lampX).attr('x2', lampX)
            .attr('y1', baseY).attr('y2', baseY - 110)
            .attr('stroke', 'var(--d-grey)').attr('stroke-width', 4).attr('stroke-linecap', 'square');
        gGround.append('line')
            .attr('x1', lampX).attr('x2', lampX + 28)
            .attr('y1', baseY - 110).attr('y2', baseY - 110)
            .attr('stroke', 'var(--d-grey)').attr('stroke-width', 4).attr('stroke-linecap', 'square');
    }

    function drawDynamic() {
        var sun = sunPos();
        // Sun: orange above the horizon, grey once set.
        gSun.selectAll('*').remove();
        gSun.append('circle')
            .attr('cx', sun.x).attr('cy', sun.y).attr('r', 22)
            .attr('fill', sun.height > 0.05 ? 'var(--d-orange)' : 'var(--d-grey)')
            .attr('stroke', 'var(--white)').attr('stroke-width', 1.5)
            .style('cursor', 'grab');

        gSun.call(d3.drag().on('drag', function (event) {
            var arcXMin = 60, arcXMax = sceneW - 30;
            var f = (event.x - arcXMin) / (arcXMax - arcXMin);
            state.sunFrac = Math.max(0, Math.min(1, f));
            drawStatic();
            drawDynamic();
            updateLamp();
            updateReadout();
        }));

        // Sensor meter (vertical bar on right, with draggable threshold)
        var mx = iw - 62, my0 = SKY_TOP + 26, my1 = ih - 60;
        gMeter.selectAll('*').remove();
        gMeter.append('rect')
            .attr('x', mx - 12).attr('y', my0).attr('width', 24).attr('height', my1 - my0)
            .attr('rx', 4).style('fill', 'var(--white)').style('stroke', 'var(--fg)');
        // fill proportional to sensor reading (sun height)
        var lvl = Math.max(0, Math.min(1, sun.height));
        var fillTop = my1 - lvl * (my1 - my0);
        gMeter.append('rect')
            .attr('x', mx - 10).attr('y', fillTop + 2).attr('width', 20)
            .attr('height', Math.max(0, my1 - fillTop - 4))
            .attr('rx', 3).style('fill', 'var(--c-input)');

        // end labels
        gMeter.append('text').attr('x', mx).attr('y', my0 - 16)
            .attr('text-anchor', 'middle')
            .style('fill', 'var(--fg)').text('Bright');
        gMeter.append('text').attr('x', mx).attr('y', my1 + 26)
            .attr('text-anchor', 'middle')
            .style('fill', 'var(--fg)').text('Dark');

        // threshold marker, labelled to the right of its handle
        var ty = my1 - state.thresh * (my1 - my0);
        // white underlay keeps the dashed marker legible over the filled bar
        gMeter.append('line')
            .attr('x1', mx - 12).attr('x2', mx + 12)
            .attr('y1', ty).attr('y2', ty)
            .style('stroke', 'var(--white)').attr('stroke-width', 5);
        gMeter.append('line')
            .attr('x1', mx - 18).attr('x2', mx + 18)
            .attr('y1', ty).attr('y2', ty)
            .style('stroke', 'var(--c-thresh)').attr('stroke-width', 2)
            .attr('stroke-dasharray', '5 4').style('cursor', 'ns-resize');
        gMeter.append('circle')
            .attr('cx', mx + 18).attr('cy', ty).attr('r', 5)
            .style('fill', 'var(--c-thresh)').style('stroke', 'var(--white)').attr('stroke-width', 1.4)
            .style('cursor', 'ns-resize');
        window.renderKatex(gMeter, 'V_\\mathrm{th}', mx + 28 + 15, ty,
            { size: 14, color: 'var(--c-thresh)', align: 'left', width: 30, height: 18 });

        gMeter.call(d3.drag()
            .on('drag', function (event) {
                var f = (my1 - event.y) / (my1 - my0);
                state.thresh = Math.max(0, Math.min(1, f));
                drawDynamic();
                updateLamp();
                updateReadout();
            }));
    }

    function updateLamp() {
        var sun = sunPos();
        var on = sun.height < state.thresh;
        gLamp.selectAll('*').remove();
        var lampX = sceneW - 80, baseY = ih - 110 + 90 - 110;
        if (on) {
            // light cone on the road
            var horizonY = ih - 110;
            gLamp.append('polygon')
                .attr('points',
                    (lampX + 28) + ',' + baseY + ' ' +
                    (lampX - 30) + ',' + (horizonY + 80) + ' ' +
                    (lampX + 78) + ',' + (horizonY + 80))
                .attr('fill', 'var(--d-orange-soft)').attr('opacity', 0.4);
        }
        gLamp.append('circle')
            .attr('cx', lampX + 28).attr('cy', baseY)
            .attr('r', 9)
            .attr('fill', on ? 'var(--d-orange-soft)' : 'var(--carbon-black-400)')
            .attr('stroke', on ? 'var(--d-orange)' : 'var(--d-grey)').attr('stroke-width', 1.4);
    }

    function updateReadout() {
        var sun = sunPos();
        rdSensor.textContent = sun.height.toFixed(2);
        rdThresh.textContent = state.thresh.toFixed(2);
        var on = sun.height < state.thresh;
        rdLamp.textContent = on ? 'On' : 'Off';
        rdLamp.className = 'v ' + (on ? 'on' : 'off');
    }

    function init() {
        layout();
        drawStatic();
        drawDynamic();
        updateLamp();
        updateReadout();

        window.addEventListener('resize', function () {
            layout(); drawStatic(); drawDynamic(); updateLamp();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
