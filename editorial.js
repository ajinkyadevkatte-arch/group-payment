// ===== EDITORIAL MOTION LAYER =====
// The refined "corporate-premium" vocabulary of top Awwwards finance/
// studio sites: numbered section indices, cascading staggered reveals,
// clip-path image reveals, a hero scroll cue. Pure vanilla, additive —
// layers on top of the existing reveal system without fighting it.
(function () {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. SECTION INDEX NUMBERS (01 — / 02 — ...) ---------- */
    (function sectionIndex() {
        const headers = document.querySelectorAll('section .section-header');
        let n = 0;
        headers.forEach(h => {
            n++;
            const tag = h.querySelector('.section-tag');
            if (!tag || tag.dataset.indexed) return;
            tag.dataset.indexed = '1';
            const idx = document.createElement('span');
            idx.className = 'sec-index';
            idx.textContent = String(n).padStart(2, '0');
            tag.parentNode.insertBefore(idx, tag);
        });
    })();

    /* ---------- 2. STAGGERED CASCADE on grouped reveals ---------- */
    // Existing [data-aos] items reveal individually; give grouped grids a
    // cascading delay so rows ripple in like editorial sites.
    (function stagger() {
        if (reduced) return;
        const groups = document.querySelectorAll(
            '.features-grid, .plans-grid, .testi-grid, .hiw-grid'
        );
        groups.forEach(group => {
            const items = group.querySelectorAll('[data-aos]');
            items.forEach((el, i) => {
                el.style.transitionDelay = (i * 0.08) + 's';
            });
        });
    })();

    /* ---------- 3. CLIP-PATH IMAGE REVEALS ---------- */
    // Proof screenshots wipe open as they enter (only the non-duplicated
    // first set; the marquee duplicates are skipped to avoid double work).
    (function imageReveal() {
        if (reduced) return;
        const imgs = document.querySelectorAll('.proof-card');
        if (!imgs.length) return;
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    en.target.classList.add('img-revealed');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.2 });
        imgs.forEach(c => { c.classList.add('img-reveal'); io.observe(c); });
    })();

    /* ---------- 4. HERO SCROLL CUE auto-hide on scroll ---------- */
    (function scrollCue() {
        const cue = document.getElementById('scrollCue');
        if (!cue) return;
        let hidden = false;
        window.addEventListener('scroll', () => {
            const past = window.scrollY > 120;
            if (past !== hidden) {
                hidden = past;
                cue.classList.toggle('cue-hide', past);
            }
        }, { passive: true });
    })();

    /* ---------- 5. STAT COUNT-UP polish ---------- */
    // (Hero counters already animate in script.js; nothing to do — kept
    //  here as the single source of editorial timing if needed later.)
})();
