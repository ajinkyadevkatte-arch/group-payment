// ===== SPINNING RING GALLERY =====
// Proof screenshots sit evenly around a circle. When the section scrolls
// into view the ring spins in — fast at first, then eases out and settles
// (like a wheel coming to rest) — followed by a very slow idle drift so it
// stays alive. Cards stay upright (readable) the whole time. Hovering
// pauses the idle drift so any screenshot is easy to tap-to-zoom.
(function () {
    const stage = document.getElementById('ringStage');
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll('.ring-card'));
    if (!cards.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => window.innerWidth <= 768;

    let ring = 0;        // spin-in angle (deg)
    let idle = 0;        // slow continuous drift (deg)
    let hover = false;
    let idleRunning = false;

    function radius() {
        return stage.clientWidth * 0.34;
    }

    function place() {
        const R = radius();
        const n = cards.length;
        for (let i = 0; i < n; i++) {
            const a = ((i / n) * 360 + ring + idle) * Math.PI / 180;
            const x = Math.cos(a) * R;
            const y = Math.sin(a) * R;
            cards[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        }
    }

    function spinIn() {
        if (reduced) { ring = 0; place(); return; }
        const DUR = 2600;          // total spin time
        const TOTAL = 720;         // 2 full turns before settling
        const start = performance.now();
        function step(now) {
            const t = Math.min(1, (now - start) / DUR);
            const e = 1 - Math.pow(1 - t, 3);   // easeOutCubic: fast -> slow
            ring = TOTAL * e;
            place();
            if (t < 1) requestAnimationFrame(step);
            else startIdle();
        }
        requestAnimationFrame(step);
    }

    function startIdle() {
        // Desktop only — keep mobile light (battery): ring settles & stops.
        if (reduced || idleRunning || isMobile()) return;
        idleRunning = true;
        function loop() {
            requestAnimationFrame(loop);
            if (document.hidden || hover) return;
            idle += 0.05;            // ~3°/sec — very gentle living wheel
            place();
        }
        loop();
    }

    stage.addEventListener('mouseenter', () => { hover = true; });
    stage.addEventListener('mouseleave', () => { hover = false; });
    window.addEventListener('resize', place);

    // Robust initial layout (timer-based so it runs even if rAF is paused)
    place();
    window.addEventListener('load', place);
    setTimeout(place, 300);
    setTimeout(place, 800);

    // trigger the spin-in each time the ring scrolls into view
    let armed = true;
    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting && armed) { armed = false; spinIn(); }
            else if (!en.isIntersecting) { armed = true; }   // re-arm after leaving
        });
    }, { threshold: 0.35 });
    io.observe(stage);
})();
