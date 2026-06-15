// ===== SCROLL-DRIVEN 3D CHARGING BULL =====
// A real GLB charging bull that travels down the screen as you scroll
// through its (tall) section — like it's charging down the page. Lazy:
// nothing loads until the section is near; render pauses when it leaves
// view or the tab is hidden. Auto-fits/centres the model so it shows
// correctly without manual tuning. Bails silently without WebGL/GLTFLoader.
(function () {
    if (typeof THREE === 'undefined') return;
    const canvas  = document.getElementById('bullCanvas');
    const section = document.getElementById('bull');
    if (!canvas || !section) return;

    const MODEL = 'models/bull.glb/charging_bull.glb';
    const isMobile = () => window.innerWidth <= 768;

    let renderer, scene, camera, pivot, inited = false, loaded = false, visible = false, raf = null;
    let sp = 0;

    function size() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    }

    function init() {
        if (inited) return;
        inited = true;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile() });
        } catch (e) { return; }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.3 : 1.8));

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 7.5);
        size();

        scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(4, 6, 5); scene.add(key);
        const g1 = new THREE.PointLight(0x00e5a0, 0.9, 40); g1.position.set(-5, 2, 4); scene.add(g1);
        const g2 = new THREE.PointLight(0x6d5cff, 0.9, 40); g2.position.set(5, -2, 3); scene.add(g2);

        pivot = new THREE.Group();
        scene.add(pivot);

        window.addEventListener('resize', size);

        if (!THREE.GLTFLoader) { console.error('bull3d: GLTFLoader missing'); return; }
        const loader = new THREE.GLTFLoader();
        loader.load(MODEL, (gltf) => {
            const m = gltf.scene;
            const box = new THREE.Box3().setFromObject(m);
            const c = box.getCenter(new THREE.Vector3());
            const s = box.getSize(new THREE.Vector3());
            m.position.sub(c);                               // centre
            const maxd = Math.max(s.x, s.y, s.z) || 1;
            const target = isMobile() ? 3.6 : 4.6;
            m.scale.setScalar(target / maxd);                // fit
            pivot.add(m);
            pivot.rotation.y = -0.6;                          // 3/4 charging view
            loaded = true;
        }, undefined, (err) => { console.error('bull3d: model load failed', err); });
    }

    function progress() {
        const r = section.getBoundingClientRect();
        return Math.max(0, Math.min(1, (window.innerHeight - r.top) / (r.height || 1)));
    }

    function loop() {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        sp += (progress() - sp) * 0.1;
        if (loaded && pivot) {
            pivot.position.y = 2.7 - sp * 5.4;               // charge from top -> bottom
            pivot.rotation.y = -0.6 + Math.sin(performance.now() * 0.0006) * 0.22;
            pivot.position.x = Math.sin(sp * Math.PI) * 0.3; // subtle drift
        }
        renderer.render(scene, camera);
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            visible = e.isIntersecting;
            if (visible) { init(); size(); if (!raf) requestAnimationFrame(loop); }
        });
    }, { rootMargin: '300px 0px' });
    io.observe(section);
})();
