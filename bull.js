// ===== SELF-DRAWING BULL =====
// The bull emblem draws itself stroke-by-stroke as the section scrolls
// through the viewport; key benefit points light up in sequence; a green
// glow blooms once the drawing completes. Pure SVG + scroll progress.
(function () {
    const svg = document.getElementById('bullSvg');
    const section = document.getElementById('bull');
    if (!svg || !section) return;

    const paths = Array.from(svg.querySelectorAll('.bp'));
    const points = Array.from(document.querySelectorAll('#bullPoints .bull-point'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // init: each path hidden (dashoffset 1 over pathLength 1)
    paths.forEach(p => {
        p.style.strokeDasharray = '1';
        p.style.strokeDashoffset = reduced ? '0' : '1';
    });
    if (reduced) { svg.classList.add('bull-done'); points.forEach(pt => pt.classList.add('show')); return; }

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    function progress() {
        const r = section.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when section top hits ~75% of viewport, 1 a bit before it leaves
        return clamp((vh * 0.78 - r.top) / (r.height * 0.62), 0, 1);
    }

    let p = 0, sp = 0, running = true;

    function render() {
        paths.forEach(path => {
            const s = parseFloat(path.dataset.s), e = parseFloat(path.dataset.e);
            const local = clamp((sp - s) / (e - s), 0, 1);
            path.style.strokeDashoffset = String(1 - local);
        });
        points.forEach(pt => {
            const at = parseFloat(pt.dataset.at);
            pt.classList.toggle('show', sp >= at);
        });
        svg.classList.toggle('bull-done', sp > 0.97);
    }

    function loop() {
        if (!running) return;
        requestAnimationFrame(loop);
        p = progress();
        sp += (p - sp) * 0.12;
        render();
    }

    window.addEventListener('scroll', () => { p = progress(); }, { passive: true });
    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) requestAnimationFrame(loop);
    });
    // timer-based fallback so it positions even if rAF is paused
    setTimeout(() => { sp = p = progress(); render(); }, 300);

    requestAnimationFrame(loop);
})();
