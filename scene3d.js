// ===== ALPHX 3D MARKET JOURNEY — v2 =====
// Not just a background: a story. The visitor flies along a glowing
// trendline road through a digital market landscape. The world's mood
// follows their scroll — purple uncertainty at the top, cyan focus in
// the middle, and a green "profit zone" dawn as they reach the plans.
//
// Unique elements:
//  • Trendline Road — a glowing price-line path the camera actually
//    follows, banking through the turns like a chart come alive
//  • Color story — terrain/particles/aurora hue-shift with scroll
//  • Hyperspace streaks — fast scrolling stretches light past you
//  • Floating ticker boards — NIFTY/BANKNIFTY billboards in the sky
//  • Aurora trend-wave rippling overhead
//  • Candles glow & grow when the cursor touches them (desktop)
//  • Tap/click anywhere → expanding shockwave ring in the world
//
// Degrades gracefully: lighter on mobile, pauses when hidden or when a
// modal is open, respects prefers-reduced-motion, and bails silently
// without WebGL — the classic background remains.
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof THREE === 'undefined') return;

    const canvas = document.getElementById('bg3d');
    if (!canvas) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance'
        });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.4 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const FOG_BASE = isMobile ? 0.034 : 0.026;
    scene.fog = new THREE.FogExp2(0x0a0a0f, FOG_BASE);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 220);
    camera.position.set(0, 3.4, 14);

    // ---------- Shared world constants ----------
    const TILE = 150;            // terrain + road period (seamless looping)
    const WORLD_DEPTH = 130;     // recycling depth for floaters

    // The trendline road: a periodic "price line" path through the world.
    // Camera x follows this, so the flight banks through the swings.
    function roadX(z) {
        const k = (Math.PI * 2) / TILE;
        return Math.sin(k * 2 * z) * 6 + Math.sin(k * 5 * z + 1.3) * 3.2;
    }

    // ---------- Terrain: valley carved along the road ----------
    const SEG = isMobile ? 42 : 68;
    function heightAt(x, z) {
        const k = (Math.PI * 2) / TILE;
        let h =
            Math.sin(k * 3 * x) * Math.cos(k * 2 * z) * 2.2 +
            Math.sin(k * 5 * x + 1.7) * Math.sin(k * 4 * z) * 1.4 +
            Math.sin(k * 9 * x + 4.0) * Math.cos(k * 7 * z + 2.0) * 0.6;
        const dRoad = Math.abs(x - roadX(z));
        const valley = Math.min(1, Math.pow(dRoad / 14, 1.6));
        return h * (0.22 + 0.78 * valley) * 2.1;
    }
    const terrainMat = new THREE.MeshBasicMaterial({
        color: 0x6d5cff, wireframe: true, transparent: true,
        opacity: isMobile ? 0.26 : 0.32, blending: THREE.AdditiveBlending, depthWrite: false
    });
    function buildTerrainTile(zOff) {
        const geo = new THREE.PlaneGeometry(TILE, TILE, SEG, SEG);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            // displace using WORLD-space z so tiles match the road exactly
            pos.setY(i, heightAt(pos.getX(i), pos.getZ(i) + zOff));
        }
        pos.needsUpdate = true;
        const m = new THREE.Mesh(geo, terrainMat);
        m.position.set(0, -2.5, zOff);
        m.userData.zOff = zOff;
        return m;
    }
    const tileA = buildTerrainTile(0);
    const tileB = buildTerrainTile(-TILE);
    scene.add(tileA, tileB);

    // ---------- Trendline Road (glowing tube along roadX) ----------
    const roadMat = new THREE.MeshBasicMaterial({
        color: 0x00e5a0, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    function buildRoadSegment(zOff) {
        const pts = [];
        const STEPS = isMobile ? 60 : 110;
        for (let i = 0; i <= STEPS; i++) {
            const z = -(i / STEPS) * TILE;       // local 0 .. -TILE
            const wz = z + zOff;                  // world z for sampling
            pts.push(new THREE.Vector3(
                roadX(wz),
                -1.0 + Math.sin(wz * 0.18) * 0.35,
                z
            ));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const geo = new THREE.TubeGeometry(curve, STEPS, 0.07, 5, false);
        const m = new THREE.Mesh(geo, roadMat);
        m.position.z = zOff;
        return m;
    }
    const roadA = buildRoadSegment(0);
    const roadB = buildRoadSegment(-TILE);
    scene.add(roadA, roadB);

    // ---------- Floating candlesticks ----------
    const candles = [];
    const candleMeshes = [];
    const CANDLE_COUNT = isMobile ? 10 : 24;
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x00e5a0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const redMat   = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.8,  blending: THREE.AdditiveBlending, depthWrite: false });
    const bodyGeo  = new THREE.BoxGeometry(0.34, 1, 0.34);
    const wickGeo  = new THREE.BoxGeometry(0.07, 1.9, 0.07);
    for (let i = 0; i < CANDLE_COUNT; i++) {
        const mat = Math.random() < 0.68 ? greenMat.clone() : redMat.clone();
        const g = new THREE.Group();
        const body = new THREE.Mesh(bodyGeo, mat);
        const wick = new THREE.Mesh(wickGeo, mat);
        body.scale.y = 0.8 + Math.random() * 1.8;
        g.add(wick, body);
        const z = 10 - Math.random() * WORLD_DEPTH;
        g.position.set(roadX(z) + (Math.random() - 0.5) * 26, 2.2 + Math.random() * 7, z);
        g.userData = {
            phase: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.012,
            bob: 0.25 + Math.random() * 0.5,
            baseOpacity: mat.opacity,
            targetGlow: 0, glow: 0
        };
        candles.push(g);
        candleMeshes.push(body, wick);
        scene.add(g);
    }

    // ---------- Floating ticker boards ----------
    const TICKERS = [
        'NIFTY  ▲ 24,812', 'BANKNIFTY  ▲ 52,140', 'SENSEX  ▲ 81,455',
        'RELIANCE  ▲ 2,847', 'TCS  ▲ 4,210', 'FINNIFTY  ▲ 23,610',
        'TATAMOTORS  ▲ 782', 'HDFCBANK  ▲ 1,738'
    ];
    function makeTickerTexture(text) {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 96;
        const ctx = c.getContext('2d');
        ctx.font = '700 44px "Space Grotesk", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,229,160,0.9)';
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#aef7df';
        ctx.fillText(text, 256, 50);
        return new THREE.CanvasTexture(c);
    }
    const tickers = [];
    const TICKER_COUNT = isMobile ? 4 : 8;
    for (let i = 0; i < TICKER_COUNT; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
            map: makeTickerTexture(TICKERS[i % TICKERS.length]),
            transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        sp.scale.set(7.4, 1.4, 1);
        const z = 5 - Math.random() * WORLD_DEPTH;
        sp.position.set(roadX(z) + (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 8), 6.5 + Math.random() * 5, z);
        sp.userData = { phase: Math.random() * Math.PI * 2 };
        tickers.push(sp);
        scene.add(sp);
    }

    // ---------- Particle dust ----------
    const P_COUNT = isMobile ? 260 : 650;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(P_COUNT * 3);
    for (let i = 0; i < P_COUNT; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 44;
        pPos[i * 3 + 1] = Math.random() * 16;
        pPos[i * 3 + 2] = 12 - Math.random() * WORLD_DEPTH;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        color: 0x9b8cff, size: isMobile ? 0.09 : 0.075, transparent: true,
        opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ---------- Aurora trend-wave (rippling ribbon overhead) ----------
    const AUR_SEG = isMobile ? 50 : 90;
    const aurGeo = new THREE.PlaneGeometry(150, 7, AUR_SEG, 1);
    const aurMat = new THREE.MeshBasicMaterial({
        color: 0x6d5cff, transparent: true, opacity: 0.14,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const aurora = new THREE.Mesh(aurGeo, aurMat);
    aurora.rotation.x = Math.PI / 2.35;
    scene.add(aurora);

    // ---------- Horizon glow ("profit sun") ----------
    function makeGlowTexture(inner, outer) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, inner); g.addColorStop(0.4, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
    }
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(0,229,160,0.9)', 'rgba(109,92,255,0.25)'),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sun.scale.set(46, 46, 1);
    scene.add(sun);

    // ---------- Hyperspace streaks (visible only while scrolling fast) ----------
    const STREAK_COUNT = isMobile ? 8 : 14;
    const streakGeo = new THREE.BoxGeometry(0.05, 0.05, 7);
    const streaks = [];
    for (let i = 0; i < STREAK_COUNT; i++) {
        const m = new THREE.Mesh(streakGeo, new THREE.MeshBasicMaterial({
            color: 0xbfffe9, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        m.userData = {
            dx: (Math.random() - 0.5) * 30,
            dy: 1 + Math.random() * 10,
            dz: -10 - Math.random() * 60
        };
        streaks.push(m);
        scene.add(m);
    }

    // ---------- Shockwave pulse rings (tap/click anywhere) ----------
    function makeRingTexture() {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        ctx.strokeStyle = 'rgba(0,229,160,0.95)';
        ctx.lineWidth = 14;
        ctx.shadowColor = 'rgba(0,229,160,1)';
        ctx.shadowBlur = 28;
        ctx.beginPath(); ctx.arc(128, 128, 92, 0, Math.PI * 2); ctx.stroke();
        return new THREE.CanvasTexture(c);
    }
    const ringTex = makeRingTexture();
    const pulses = [];
    for (let i = 0; i < 4; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
            map: ringTex, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        sp.userData = { t: 1.1 }; // inactive
        pulses.push(sp);
        scene.add(sp);
    }
    function spawnPulse(clientX, clientY) {
        const p = pulses.find(p => p.userData.t >= 1) || pulses[0];
        const nx = (clientX / window.innerWidth) * 2 - 1;
        const ny = -(clientY / window.innerHeight) * 2 + 1;
        p.position.set(
            camera.position.x + nx * 9,
            camera.position.y + ny * 5.5,
            camera.position.z - 13
        );
        p.userData.t = 0;
    }
    window.addEventListener('pointerdown', e => {
        if (e.target.closest('button, a, input, label, select, textarea, nav, .modal-overlay, .exit-overlay, .sticky-cta, .join-notif, .live-notif, .tg-float, .promo-bar, .faq-question, .proof-card, .lightbox-overlay')) return;
        spawnPulse(e.clientX, e.clientY);
    }, { passive: true });

    // ---------- Input state ----------
    let mouseX = 0, mouseY = 0, lerpX = 0, lerpY = 0;
    const pointerNdc = new THREE.Vector2(99, 99);
    const raycaster = new THREE.Raycaster();

    if (!isMobile) {
        window.addEventListener('mousemove', e => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
            pointerNdc.set(mouseX, -mouseY);
        }, { passive: true });
    }

    let scrollProg = 0, smoothProg = 0, prevSmooth = 0, scrollEnergy = 0;
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

    let running = true;
    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) { clockPrev = performance.now(); requestAnimationFrame(animate); }
    });

    // ---------- Color story ----------
    const ACT_PURPLE = new THREE.Color(0x6d5cff);
    const ACT_CYAN   = new THREE.Color(0x2fb9e8);
    const ACT_GREEN  = new THREE.Color(0x00e5a0);
    const tmpColor   = new THREE.Color();
    const tmpColor2  = new THREE.Color();
    function smoothstep(a, b, x) {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    }

    // ---------- Animation loop ----------
    const TRAVEL = 60;
    const IDLE_SPEED = 0.55;
    let idle = 0;
    let clockPrev = performance.now();
    let firstFrame = true;

    function animate(now) {
        if (!running) return;
        requestAnimationFrame(animate);

        const modalOpen = document.querySelector('.modal-overlay.active, .exit-overlay.active, .lightbox-overlay.active');
        if (modalOpen) { clockPrev = now; return; }

        const dt = Math.min(0.05, (now - clockPrev) / 1000 || 0.016);
        clockPrev = now;

        idle += dt * IDLE_SPEED;
        smoothProg += (scrollProg - smoothProg) * 0.06;

        // Scroll velocity -> hyperspace energy
        const vel = Math.abs(smoothProg - prevSmooth) / Math.max(dt, 0.001);
        prevSmooth = smoothProg;
        scrollEnergy += (Math.min(1, vel * 9) - scrollEnergy) * 0.08;

        const camZ = 14 - idle - smoothProg * TRAVEL;

        // Camera follows the trendline road, banking through turns
        lerpX += (mouseX - lerpX) * 0.05;
        lerpY += (mouseY - lerpY) * 0.05;
        const rx  = roadX(camZ);
        const rxA = roadX(camZ - 11);
        camera.position.z = camZ;
        camera.position.x = rx * 0.8 + lerpX * 1.6;
        camera.position.y = 3.4 + Math.sin(now * 0.00035) * 0.35 - lerpY * 0.7 + smoothProg * 1.1;
        camera.lookAt(rxA * 0.85 + lerpX * 0.5, 2.3 + smoothProg * 0.5, camZ - 13);
        camera.rotation.z += Math.max(-0.055, Math.min(0.055, (rx - rxA) * 0.014)); // bank

        // ----- Color story: purple -> cyan -> green dawn -----
        const t1 = smoothstep(0.10, 0.48, smoothProg);
        const t2 = smoothstep(0.55, 0.88, smoothProg);
        tmpColor.copy(ACT_PURPLE).lerp(ACT_CYAN, t1).lerp(ACT_GREEN, t2);
        terrainMat.color.copy(tmpColor);
        aurMat.color.copy(tmpColor);
        tmpColor2.copy(tmpColor).lerp(new THREE.Color(0xffffff), 0.35);
        pMat.color.copy(tmpColor2);
        scene.fog.density = FOG_BASE * (1 - 0.3 * t2);          // skies clear at the end
        sun.scale.setScalar(46 + t2 * 60);                       // profit sun rises
        sun.material.opacity = 0.85 + t2 * 0.15;

        // Terrain + road leapfrog (seamless infinite world)
        [tileA, tileB, roadA, roadB].forEach(t => {
            while (t.position.z - camZ > TILE * 0.55) t.position.z -= TILE * 2;
            while (camZ - t.position.z > TILE * 1.45) t.position.z += TILE * 2;
        });

        // ----- Candles: bob, spin, hover glow, recycle along the road -----
        let hovered = null;
        if (!isMobile && pointerNdc.x < 50) {
            raycaster.setFromCamera(pointerNdc, camera);
            const hits = raycaster.intersectObjects(candleMeshes, false);
            if (hits.length) hovered = hits[0].object.parent;
        }
        for (let i = 0; i < candles.length; i++) {
            const c = candles[i], u = c.userData;
            u.targetGlow = (c === hovered) ? 1 : 0;
            u.glow += (u.targetGlow - u.glow) * 0.12;
            const s = 1 + u.glow * 0.55;
            c.scale.set(s, s, s);
            c.children.forEach(ch => { ch.material.opacity = u.baseOpacity + u.glow * 0.15; });
            c.rotation.y += u.spin + u.glow * 0.02;
            c.position.y += Math.sin(now * 0.001 + u.phase) * 0.004 * u.bob * 60 * dt;
            if (c.position.z > camZ + 6) {
                c.position.z -= WORLD_DEPTH;
                c.position.x = roadX(c.position.z) + (Math.random() - 0.5) * 26;
                c.position.y = 2.2 + Math.random() * 7;
            }
        }

        // ----- Tickers: gentle float, recycle -----
        for (let i = 0; i < tickers.length; i++) {
            const tk = tickers[i];
            tk.position.y += Math.sin(now * 0.0008 + tk.userData.phase) * 0.0035;
            if (tk.position.z > camZ + 4) {
                tk.position.z -= WORLD_DEPTH;
                tk.position.x = roadX(tk.position.z) + (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 8);
            }
        }

        // ----- Particles drift + wrap -----
        const pp = pGeo.attributes.position;
        for (let i = 0; i < P_COUNT; i++) {
            let y = pp.getY(i) + dt * 0.25;
            if (y > 17) y = 0;
            pp.setY(i, y);
            const z = pp.getZ(i);
            if (z > camZ + 6) pp.setZ(i, z - WORLD_DEPTH);
        }
        pp.needsUpdate = true;

        // ----- Aurora ripple (camera-locked, lives in the sky ahead) -----
        aurora.position.set(camera.position.x * 0.5, 14.5, camZ - 42);
        const ap = aurGeo.attributes.position;
        for (let i = 0; i <= AUR_SEG; i++) {
            const x = ap.getX(i);
            const w = Math.sin(x * 0.11 + now * 0.0011) * 1.7 + Math.cos(x * 0.05 - now * 0.0007) * 1.1;
            ap.setZ(i, w);                 // top edge
            ap.setZ(i + AUR_SEG + 1, w * 0.4); // bottom edge follows softly
        }
        ap.needsUpdate = true;
        aurMat.opacity = 0.10 + t1 * 0.07;

        // ----- Hyperspace streaks (scroll velocity) -----
        for (let i = 0; i < streaks.length; i++) {
            const st = streaks[i], u = st.userData;
            st.material.opacity += (scrollEnergy * 0.8 - st.material.opacity) * 0.1;
            if (scrollEnergy > 0.02) {
                st.position.z += dt * (40 + scrollEnergy * 700);
                if (st.position.z > camZ + 8) {
                    u.dx = (Math.random() - 0.5) * 30;
                    u.dy = 1 + Math.random() * 10;
                    st.position.set(camera.position.x + u.dx, u.dy, camZ - 70 - Math.random() * 30);
                } else {
                    st.position.x = camera.position.x + u.dx;
                    st.position.y = u.dy;
                }
            }
        }

        // ----- Shockwave pulses -----
        for (let i = 0; i < pulses.length; i++) {
            const p = pulses[i];
            if (p.userData.t < 1) {
                p.userData.t += dt / 0.9;
                const t = Math.min(1, p.userData.t);
                p.scale.setScalar(2 + t * 16);
                p.material.opacity = (1 - t) * 0.85;
            } else if (p.material.opacity > 0) {
                p.material.opacity = 0;
            }
        }

        // Horizon glow stays on the horizon
        sun.position.set(camera.position.x * 0.3, 7.5 + t2 * 3, camZ - 95);

        renderer.render(scene, camera);

        if (firstFrame) {
            firstFrame = false;
            document.body.classList.add('has-3d'); // triggers canvas fade-in
        }
    }

    requestAnimationFrame(animate);
})();
