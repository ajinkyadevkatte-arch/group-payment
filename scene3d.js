// ===== ALPHX 3D MARKET LANDSCAPE =====
// Immersive Three.js background: glowing wireframe terrain, floating
// candlesticks, particle dust, distant horizon glow. Camera travels
// forward through the world as the user scrolls (cinematic journey),
// with mouse parallax on desktop. Auto-degrades on mobile, pauses when
// hidden or when the payment modal is open, and bails silently if
// WebGL/Three.js are unavailable so the site works exactly as before.
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof THREE === 'undefined') return;

    const canvas = document.getElementById('bg3d');
    if (!canvas) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: !isMobile,
            alpha: true,
            powerPreference: 'high-performance'
        });
    } catch (e) {
        return; // no WebGL — keep the classic background
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.4 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, isMobile ? 0.034 : 0.026);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 3.4, 14);

    // ---------- Terrain: two seamless tiles that leapfrog forever ----------
    const TILE = 150;                       // tile size (world units)
    const SEG  = isMobile ? 42 : 68;        // grid resolution

    // Periodic height field -> tiles repeat seamlessly in x and z
    function heightAt(x, z) {
        const k = (Math.PI * 2) / TILE;
        let h =
            Math.sin(k * 3 * x) * Math.cos(k * 2 * z) * 2.2 +
            Math.sin(k * 5 * x + 1.7) * Math.sin(k * 4 * z) * 1.4 +
            Math.sin(k * 9 * x + 4.0) * Math.cos(k * 7 * z + 2.0) * 0.6;
        // carve a valley down the middle so the camera path stays clear
        const valley = Math.min(1, Math.pow(Math.abs(x) / 16, 1.6));
        return h * (0.25 + 0.75 * valley) * 2.1;
    }

    function buildTerrainTile() {
        const geo = new THREE.PlaneGeometry(TILE, TILE, SEG, SEG);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
        }
        pos.needsUpdate = true;
        const mat = new THREE.MeshBasicMaterial({
            color: 0x6d5cff,
            wireframe: true,
            transparent: true,
            opacity: isMobile ? 0.26 : 0.32,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return new THREE.Mesh(geo, mat);
    }

    const tileA = buildTerrainTile();
    const tileB = buildTerrainTile();
    tileA.position.set(0, -2.5, 0);
    tileB.position.set(0, -2.5, -TILE);
    scene.add(tileA, tileB);

    // ---------- Floating candlesticks (trading-themed "creatures") ----------
    const WORLD_DEPTH = 130;
    const candles = [];
    const CANDLE_COUNT = isMobile ? 10 : 24;
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x00e5a0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const redMat   = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.8,  blending: THREE.AdditiveBlending, depthWrite: false });
    const bodyGeo  = new THREE.BoxGeometry(0.34, 1, 0.34);
    const wickGeo  = new THREE.BoxGeometry(0.07, 1.9, 0.07);

    for (let i = 0; i < CANDLE_COUNT; i++) {
        const mat = Math.random() < 0.68 ? greenMat : redMat;
        const g = new THREE.Group();
        const body = new THREE.Mesh(bodyGeo, mat);
        const wick = new THREE.Mesh(wickGeo, mat);
        body.scale.y = 0.8 + Math.random() * 1.8;
        g.add(wick, body);
        g.position.set(
            (Math.random() - 0.5) * 34,
            2.2 + Math.random() * 7,
            10 - Math.random() * WORLD_DEPTH
        );
        g.userData = {
            phase: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.012,
            bob: 0.25 + Math.random() * 0.5
        };
        candles.push(g);
        scene.add(g);
    }

    // ---------- Particle dust ----------
    const P_COUNT = isMobile ? 260 : 650;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(P_COUNT * 3);
    for (let i = 0; i < P_COUNT; i++) {
        pPos[i * 3]     = (Math.random() - 0.5) * 44;
        pPos[i * 3 + 1] = Math.random() * 16;
        pPos[i * 3 + 2] = 12 - Math.random() * WORLD_DEPTH;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        color: 0x9b8cff, size: isMobile ? 0.09 : 0.075, transparent: true,
        opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ---------- Distant horizon glow (canvas sprite) ----------
    function makeGlowTexture(inner, outer) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, inner);
        grad.addColorStop(0.4, outer);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
    }
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(0,229,160,0.85)', 'rgba(109,92,255,0.25)'),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sun.scale.set(46, 46, 1);
    scene.add(sun);

    // ---------- State ----------
    let mouseX = 0, mouseY = 0, lerpX = 0, lerpY = 0;
    let scrollProg = 0, smoothProg = 0;
    let running = true;

    if (!isMobile) {
        window.addEventListener('mousemove', e => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        }, { passive: true });
    }

    function readScroll() {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollProg = Math.min(1, Math.max(0, window.scrollY / max));
    }
    window.addEventListener('scroll', readScroll, { passive: true });
    readScroll();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) { clockPrev = performance.now(); requestAnimationFrame(animate); }
    });

    // ---------- Animation loop ----------
    const TRAVEL = 60;        // world units travelled across full page scroll
    const IDLE_SPEED = 0.55;  // constant gentle drift (units/sec)
    let idle = 0;
    let clockPrev = performance.now();

    function animate(now) {
        if (!running) return;
        requestAnimationFrame(animate);

        // Skip rendering while the payment modal is open (saves battery,
        // content is blurred behind it anyway)
        const modalOpen = document.querySelector('.modal-overlay.active, .exit-overlay.active');
        if (modalOpen) { clockPrev = now; return; }

        const dt = Math.min(0.05, (now - clockPrev) / 1000 || 0.016);
        clockPrev = now;

        idle += dt * IDLE_SPEED;
        smoothProg += (scrollProg - smoothProg) * 0.06;

        const camZ = 14 - idle - smoothProg * TRAVEL;

        lerpX += (mouseX - lerpX) * 0.05;
        lerpY += (mouseY - lerpY) * 0.05;

        camera.position.z = camZ;
        camera.position.x = lerpX * 1.8;
        camera.position.y = 3.4 + Math.sin(now * 0.00035) * 0.35 - lerpY * 0.7 + smoothProg * 1.2;
        camera.lookAt(lerpX * 0.7, 2.3 + smoothProg * 0.6, camZ - 13);

        // Leapfrog terrain tiles to fake an infinite landscape
        [tileA, tileB].forEach(t => {
            while (t.position.z - camZ > TILE * 0.55) t.position.z -= TILE * 2;
            while (camZ - t.position.z > TILE * 1.45) t.position.z += TILE * 2;
        });

        // Candles: bob, spin, recycle ahead of the camera
        for (let i = 0; i < candles.length; i++) {
            const c = candles[i];
            const u = c.userData;
            c.rotation.y += u.spin;
            c.position.y += Math.sin(now * 0.001 + u.phase) * 0.004 * u.bob * 60 * dt;
            if (c.position.z > camZ + 6) {
                c.position.z -= WORLD_DEPTH;
                c.position.x = (Math.random() - 0.5) * 34;
                c.position.y = 2.2 + Math.random() * 7;
            }
        }

        // Particles drift up slowly; wrap around the camera
        const pp = pGeo.attributes.position;
        for (let i = 0; i < P_COUNT; i++) {
            let y = pp.getY(i) + dt * 0.25;
            if (y > 17) y = 0;
            pp.setY(i, y);
            const z = pp.getZ(i);
            if (z > camZ + 6) pp.setZ(i, z - WORLD_DEPTH);
        }
        pp.needsUpdate = true;

        // Horizon glow stays on the horizon
        sun.position.set(0, 7.5, camZ - 95);

        renderer.render(scene, camera);
    }

    document.body.classList.add('has-3d');
    requestAnimationFrame(animate);
})();
