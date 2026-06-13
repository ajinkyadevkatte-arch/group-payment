// ===== ALPHX FLOWING AURORA BACKGROUND =====
// A single full-screen fragment shader: domain-warped fractal noise that
// flows like liquid silk/aurora. This is the timeless "expensive" look
// top Awwwards sites use — restrained, premium, never literal.
//
// • Color story tied to scroll: violet (top) -> cyan (mid) -> emerald
//   "profit zone" (plans) — a slow hue migration, not a hard switch
// • Subtle mouse parallax warps the flow toward the cursor
// • Grain-free, bloom-free: one cheap quad, runs cool on phones
//
// Guards: respects prefers-reduced-motion, pauses when tab hidden or a
// modal is open, and bails silently without WebGL (classic CSS bg stays).
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof THREE === 'undefined') return;

    const canvas = document.getElementById('bg3d');
    if (!canvas) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
        u_time:   { value: 0 },
        u_res:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_scroll: { value: 0 },     // 0..1 smoothed
        u_mouse:  { value: new THREE.Vector2(0.5, 0.5) },
        u_energy: { value: 0 }       // scroll velocity glow
    };

    const frag = `
        precision highp float;
        uniform float u_time;
        uniform vec2  u_res;
        uniform float u_scroll;
        uniform vec2  u_mouse;
        uniform float u_energy;
        varying vec2 vUv;

        // --- value noise + fbm (cheap, smooth) ---
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
        float noise(vec2 p){
            vec2 i=floor(p), f=fract(p);
            float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
            vec2 u=f*f*(3.-2.*f);
            return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }
        mat2 rot(float a){ float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }
        float fbm(vec2 p){
            float v=0., amp=0.55;
            for(int i=0;i<5;i++){ v+=amp*noise(p); p=rot(0.6)*p*1.9; amp*=0.55; }
            return v;
        }

        void main(){
            // aspect-correct centered coords
            vec2 uv = (gl_FragCoord.xy - 0.5*u_res.xy) / u_res.y;

            float t = u_time * 0.045;

            // domain warp (Inigo Quilez style) for organic silk flow
            vec2 mo = (u_mouse - 0.5) * 0.6;
            vec2 q = vec2(fbm(uv*1.6 + vec2(0.0, t) + mo),
                          fbm(uv*1.6 + vec2(5.2, -t*0.8) - mo));
            vec2 r = vec2(fbm(uv*1.6 + 3.0*q + vec2(1.7, 9.2) + t*0.7),
                          fbm(uv*1.6 + 3.0*q + vec2(8.3, 2.8) - t*0.6));
            float f = fbm(uv*1.7 + 3.5*r);

            // --- palette: deep base + violet -> cyan -> emerald story ---
            vec3 base    = vec3(0.039, 0.039, 0.059);   // #0a0a0f
            vec3 violet  = vec3(0.427, 0.361, 1.000);    // #6d5cff
            vec3 cyan    = vec3(0.184, 0.725, 0.910);    // #2fb9e8
            vec3 emerald = vec3(0.000, 0.898, 0.627);    // #00e5a0

            // scroll migrates the active accent
            float s1 = smoothstep(0.08, 0.5, u_scroll);
            float s2 = smoothstep(0.55, 0.92, u_scroll);
            vec3 accent = mix(violet, cyan, s1);
            accent = mix(accent, emerald, s2);
            vec3 accent2 = mix(cyan, emerald, s1);

            // build the flowing field
            float field = smoothstep(0.15, 0.95, f);
            float ridges = smoothstep(0.55, 0.62, f) * 0.5;       // thin bright veins
            vec3 col = base;
            col = mix(col, accent*0.5, field);
            col = mix(col, accent2, pow(field, 2.2)*0.6);
            col += accent * ridges * (0.5 + u_energy*1.2);

            // soft center lift + gentle vignette so text stays readable
            float vig = smoothstep(1.15, 0.15, length(uv));
            col *= 0.42 + 0.5*vig;

            // overall intensity: kept low so foreground text always wins
            col *= 0.42 + s2*0.18 + u_energy*0.12;

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    const vert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`;

    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, depthWrite: false });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    // ---------- input ----------
    let mx = 0.5, my = 0.5, lmx = 0.5, lmy = 0.5;
    if (!isMobile) {
        window.addEventListener('mousemove', e => {
            mx = e.clientX / window.innerWidth;
            my = 1 - e.clientY / window.innerHeight;
        }, { passive: true });
    }

    let scrollProg = 0, smoothProg = 0, prevSmooth = 0, energy = 0;
    function readScroll() {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollProg = Math.min(1, Math.max(0, window.scrollY / max));
    }
    window.addEventListener('scroll', readScroll, { passive: true });
    readScroll();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_res.value.set(window.innerWidth, window.innerHeight);
    });

    let running = true;
    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) { prev = performance.now(); requestAnimationFrame(loop); }
    });

    let prev = performance.now();
    let first = true;
    function loop(now) {
        if (!running) return;
        requestAnimationFrame(loop);

        const modalOpen = document.querySelector('.modal-overlay.active, .exit-overlay.active, .lightbox-overlay.active');
        if (modalOpen) { prev = now; return; }

        const dt = Math.min(0.05, (now - prev) / 1000 || 0.016);
        prev = now;

        smoothProg += (scrollProg - smoothProg) * 0.06;
        const vel = Math.abs(smoothProg - prevSmooth) / Math.max(dt, 0.001);
        prevSmooth = smoothProg;
        energy += (Math.min(1, vel * 8) - energy) * 0.08;

        lmx += (mx - lmx) * 0.04;
        lmy += (my - lmy) * 0.04;

        uniforms.u_time.value   = now * 0.001;
        uniforms.u_scroll.value = smoothProg;
        uniforms.u_energy.value = energy;
        uniforms.u_mouse.value.set(lmx, lmy);

        renderer.render(scene, camera);

        if (first) { first = false; document.body.classList.add('has-3d'); }
    }
    requestAnimationFrame(loop);
})();
