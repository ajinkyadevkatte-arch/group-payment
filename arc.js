// ===== SCROLL-DRIVEN ARC GALLERY =====
// Proof screenshots sit on a dome; as the section scrolls through the
// viewport the whole arc sweeps in a circular motion (images rise, arc
// over, and fall) — an original take on the "circular scroll" pattern,
// driven by AlphX's own proof images. Gentle idle float when at rest.
(function () {
    const gallery = document.getElementById('arcGallery');
    if (!gallery) return;
    const imgs = Array.from(gallery.querySelectorAll('.arc-img'));
    if (!imgs.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => window.innerWidth <= 768;

    let p = 0, sp = 0;          // target + smoothed scroll progress
    let running = true;

    function layout(now) {
        const W = gallery.clientWidth;
        const H = gallery.clientHeight;
        const mob = isMobile();

        // how many images form the dome (fewer on mobile)
        const visible = mob ? Math.min(5, imgs.length) : imgs.length;
        imgs.forEach((el, i) => { el.style.display = i < visible ? 'block' : 'none'; });
        const list = imgs.slice(0, visible);

        const cx = W / 2;
        const cy = H * (mob ? 1.06 : 1.02);                 // circle centre below
        const R  = mob ? Math.min(W * 0.52, H * 0.66)
                       : Math.min(W * 0.40, H * 0.80);
        const spread = mob ? 124 : 152;                      // dome width (deg)
        const startA = 90 + spread / 2;
        const stepA  = spread / (list.length - 1);

        // scroll sweep + a whisper of idle float
        const idle   = now ? Math.sin(now * 0.0006) * 1.2 : 0;
        const offset = (sp - 0.5) * (mob ? 30 : 44) + idle;

        list.forEach((el, i) => {
            const w = el.offsetWidth, h = el.offsetHeight;
            const deg = startA - i * stepA + offset;
            const ang = deg * Math.PI / 180;
            const x = cx + R * Math.cos(ang) - w / 2;
            const y = cy - R * Math.sin(ang) - h / 2;
            const tilt = (90 - deg) * 0.5;                   // outward tilt
            el.style.transform =
                'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
        });
    }

    function readProgress() {
        const r = gallery.getBoundingClientRect();
        p = Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
    }

    function loop(now) {
        if (!running) return;
        requestAnimationFrame(loop);
        readProgress();                 // read every frame — robust with Lenis/native/touch
        sp += (p - sp) * 0.08;
        layout(now);
    }

    readProgress();
    window.addEventListener('scroll', readProgress, { passive: true });
    window.addEventListener('resize', () => { readProgress(); layout(performance.now()); });
    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) requestAnimationFrame(loop);
    });

    // re-layout once images report their real heights
    imgs.forEach(el => {
        const im = el.querySelector('img');
        if (im && !im.complete) im.addEventListener('load', () => layout(performance.now()));
    });

    if (reduced) { sp = 0.5; layout(0); }   // static dome, no motion
    else requestAnimationFrame(loop);

    setTimeout(() => layout(performance.now()), 300);
})();
