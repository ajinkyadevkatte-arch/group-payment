// ===== ALPHX AWWWARDS-GRADE POLISH LAYER =====
// The craft details top studios put on their own sites:
//  • Cinematic preloader (brand letters + 0→100 counter + curtain lift)
//  • Custom blend-mode cursor that morphs over interactive elements
//  • Film grain overlay (runtime-generated noise, stepped jitter)
//  • Masked line/word reveals on headlines (expo ease, stagger)
//  • Giant outlined marquee bands that skew with scroll velocity
//  • Matrix-style text scramble on nav hover
//  • Scroll progress hairline
// All vanilla, dependency-free, touch-aware, reduced-motion-aware.
(function () {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch   = window.matchMedia('(hover: none)').matches;

    /* ---------------- PRELOADER ---------------- */
    (function preloader() {
        const pl = document.getElementById('preloader');
        if (!pl) return;
        const countEl = pl.querySelector('.pl-count');
        const barEl   = pl.querySelector('.pl-bar i');

        if (reduced) {
            pl.remove();
            document.body.classList.add('loaded');
            return;
        }

        document.body.classList.add('pl-lock');

        const start = performance.now();
        const DUR = 1500;                 // counter run time
        let pageLoaded = document.readyState === 'complete';
        window.addEventListener('load', () => { pageLoaded = true; });

        function tick(now) {
            const t = Math.min(1, (now - start) / DUR);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = Math.round(eased * 100);
            if (countEl) countEl.textContent = v;
            if (barEl) barEl.style.width = v + '%';
            if (t < 1) { requestAnimationFrame(tick); return; }
            // counter done — leave as soon as the page is loaded (cap 2.5s total)
            const elapsed = now - start;
            if (pageLoaded || elapsed > 2500) finish();
            else setTimeout(() => requestAnimationFrame(check), 80);
        }
        function check(now) {
            if (pageLoaded || (now - start) > 2500) finish();
            else setTimeout(() => requestAnimationFrame(check), 80);
        }
        function finish() {
            pl.classList.add('pl-done');
            document.body.classList.remove('pl-lock');
            document.body.classList.add('loaded');   // gates hero reveal
            setTimeout(() => pl.remove(), 1100);
        }
        requestAnimationFrame(tick);
    })();

    /* ---------------- SCROLL PROGRESS ---------------- */
    (function progress() {
        const bar = document.getElementById('scrollProgress');
        if (!bar) return;
        function update() {
            const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            bar.style.transform = 'scaleX(' + Math.min(1, window.scrollY / max) + ')';
        }
        window.addEventListener('scroll', update, { passive: true });
        update();
    })();

    /* ---------------- FILM GRAIN ---------------- */
    (function grain() {
        if (reduced) return;
        const el = document.querySelector('.grain');
        if (!el) return;
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = (Math.random() * 255) | 0;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 22;
        }
        ctx.putImageData(img, 0, 0);
        el.style.backgroundImage = 'url(' + c.toDataURL() + ')';
    })();

    /* ---------------- CUSTOM CURSOR ---------------- */
    (function cursor() {
        if (touch || reduced) return;
        const dot = document.getElementById('cursorDot');
        const ring = document.getElementById('cursorRing');
        if (!dot || !ring) return;
        document.body.classList.add('has-cursor');

        let mx = -100, my = -100, rx = -100, ry = -100, sc = 1;
        window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

        const HOVER_SEL = 'a, button, input, label, .plan-card, .faq-question, .proof-card, .duration-btn, .testi-card';
        let hovering = false;
        document.addEventListener('mouseover', e => { hovering = !!e.target.closest(HOVER_SEL); });
        document.addEventListener('mousedown', () => ring.classList.add('cursor-press'));
        document.addEventListener('mouseup',   () => ring.classList.remove('cursor-press'));

        (function loop() {
            rx += (mx - rx) * 0.16;
            ry += (my - ry) * 0.16;
            sc += ((hovering ? 1.8 : 1) - sc) * 0.18;
            dot.style.transform  = 'translate(' + (mx - 4)  + 'px,' + (my - 4)  + 'px)';
            ring.style.transform = 'translate(' + (rx - 19) + 'px,' + (ry - 19) + 'px) scale(' + sc.toFixed(3) + ')';
            requestAnimationFrame(loop);
        })();
    })();

    /* ---------------- HEADLINE WORD REVEALS ---------------- */
    (function reveals() {
        if (reduced) return;
        const targets = document.querySelectorAll('.hero-title, .section-header h2');

        targets.forEach(el => {
            const frag = document.createDocumentFragment();
            Array.from(el.childNodes).forEach(node => {
                if (node.nodeType === 3) {                       // text → split words
                    node.textContent.split(/(\s+)/).forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        w.className = 'rv-w';
                        const i = document.createElement('span');
                        i.className = 'rv-i';
                        i.textContent = part;
                        w.appendChild(i);
                        frag.appendChild(w);
                    });
                } else if (node.nodeType === 1) {                // element (e.g. gradient span) → one unit
                    const w = document.createElement('span');
                    w.className = 'rv-w';
                    const i = document.createElement('span');
                    i.className = 'rv-i';
                    i.appendChild(node.cloneNode(true));
                    w.appendChild(i);
                    frag.appendChild(w);
                    frag.appendChild(document.createTextNode(' '));
                }
            });
            el.innerHTML = '';
            el.appendChild(frag);
            el.classList.add('rv');
            el.querySelectorAll('.rv-i').forEach((s, i) => {
                s.style.transitionDelay = (0.06 + i * 0.05) + 's';
            });
        });

        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) { en.target.classList.add('rv-on'); io.unobserve(en.target); }
            });
        }, { threshold: 0.35 });

        targets.forEach(el => {
            if (el.classList.contains('hero-title')) {
                // hero waits for the preloader curtain
                const arm = () => el.classList.add('rv-on');
                if (document.body.classList.contains('loaded')) setTimeout(arm, 250);
                else {
                    const mo = new MutationObserver(() => {
                        if (document.body.classList.contains('loaded')) { mo.disconnect(); setTimeout(arm, 250); }
                    });
                    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
                }
            } else {
                io.observe(el);
            }
        });
    })();

    /* ---------------- MARQUEE VELOCITY SKEW ---------------- */
    (function marqueeSkew() {
        const bands = document.querySelectorAll('.marquee');
        if (!bands.length || reduced) return;
        let lastY = window.scrollY, vel = 0;
        window.addEventListener('scroll', () => {
            vel += (window.scrollY - lastY) * 0.06;
            lastY = window.scrollY;
        }, { passive: true });
        (function loop() {
            vel *= 0.88;
            const skew = Math.max(-10, Math.min(10, vel));
            bands.forEach(b => { b.style.transform = 'skewX(' + skew.toFixed(2) + 'deg)'; });
            requestAnimationFrame(loop);
        })();
    })();

    /* ---------------- TEXT SCRAMBLE (nav hover) ---------------- */
    (function scramble() {
        if (touch || reduced) return;
        const CHARS = '!<>-_\\/[]{}—=+*^?#01';
        function scrambleEl(el) {
            if (el.dataset.scrambling) return;
            const original = el.dataset.orig || el.textContent;
            el.dataset.orig = original;
            el.dataset.scrambling = '1';
            const DUR = 420;
            const start = performance.now();
            (function frame(now) {
                const t = Math.min(1, (now - start) / DUR);
                const reveal = Math.floor(t * original.length);
                let out = '';
                for (let i = 0; i < original.length; i++) {
                    out += i < reveal ? original[i]
                        : (original[i] === ' ' ? ' ' : CHARS[(Math.random() * CHARS.length) | 0]);
                }
                el.textContent = out;
                if (t < 1) requestAnimationFrame(frame);
                else { el.textContent = original; delete el.dataset.scrambling; }
            })(performance.now());
        }
        document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
            a.addEventListener('mouseenter', () => scrambleEl(a));
        });
    })();
})();
