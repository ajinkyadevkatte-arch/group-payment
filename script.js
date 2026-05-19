// ===== CONFIG =====
// Public key only — secret stays server-side in Vercel env vars.
// Backend (/api/create-order) will also return key_id, so this is just a UI fallback.
const RAZORPAY_KEY = 'rzp_live_SOAQ0TsqzHImFB';

// Supabase writes now happen on the backend (/api/create-order, /api/verify-payment)
// to prevent users from inserting fake "paid" records by spoofing the API.
// The anon key is no longer needed on the frontend.

const PLANS = {
    equity: {
        name: 'Alpha Swing & Positional',
        durations: {
            '1month':  { label: '1 Month',  amount: 2000,  save: null },
            '3month':  { label: '3 Months', amount: 3999,  save: '₹2,001' },
            '1year':   { label: '1 Year',   amount: 10000, save: '₹14,000' }
        },
        links: ['equity']
    },
    fno: {
        name: 'AlphX Premium F&O',
        durations: {
            '1month':  { label: '1 Month',  amount: 2500,  save: null },
            '3month':  { label: '3 Months', amount: 4999,  save: '₹2,501' },
            '1year':   { label: '1 Year',   amount: 12000, save: '₹18,000' }
        },
        links: ['fno']
    },
    combo: {
        name: 'Ultimate Combo (Equity + F&O)',
        durations: {
            '1month':  { label: '1 Month',  amount: 3500,  save: null }
        },
        links: ['equity', 'fno']
    },
    discussion: {
        name: 'AlphX Discussion Group',
        durations: {
            '1month':  { label: '1 Month',  amount: 200,   save: null }
        },
        links: ['discussion']
    }
};

let selectedPlan     = null;
let selectedPlanKey  = null;
let selectedDuration = null;
let selectedAmount   = 0;

// ===== BACKEND API HELPERS =====
async function apiCreateOrder({ plan, duration, name, phone }) {
    const res = await fetch('/api/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan, duration, name, phone })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Order creation failed (${res.status})`);
    return data;
}

async function apiVerifyPayment(payload) {
    const res = await fetch('/api/verify-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ...data };
}

// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== MOBILE MENU =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu    = document.getElementById('mobileMenu');
mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});
function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
}

// ===== SCROLL =====
function scrollToPlans() {
    document.getElementById('plans').scrollIntoView({ behavior: 'smooth' });
}

// ===== COUNTER ANIMATION =====
function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(counter => {
        const target   = parseInt(counter.getAttribute('data-count'));
        const start    = performance.now();
        const duration = 2000;
        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3);
            counter.textContent = Math.floor(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    });
}
const heroObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { animateCounters(); heroObserver.disconnect(); }
    });
}, { threshold: 0.3 });
heroObserver.observe(document.getElementById('hero'));

// ===== SCROLL ANIMATIONS =====
const animObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('[data-aos]').forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    animObserver.observe(el);
});
const aosCss = document.createElement('style');
aosCss.textContent = '[data-aos].visible { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(aosCss);

// ===== FAQ =====
function toggleFaq(btn) {
    const item     = btn.parentElement;
    const wasActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    if (!wasActive) item.classList.add('active');
}

// ===== PAYMENT MODAL =====
function openPayment(planKey) {
    selectedPlanKey = planKey;
    selectedPlan    = PLANS[planKey];
    if (!selectedPlan) return;

    // Reset
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('disclaimerCheckbox').checked = false;
    document.getElementById('proceedBtn').disabled = true;
    document.getElementById('paymentForm').reset();

    document.getElementById('paymentModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('paymentModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

function toggleProceedBtn() {
    document.getElementById('proceedBtn').disabled =
        !document.getElementById('disclaimerCheckbox').checked;
}

// ===== STEP 2: DURATION PICKER =====
function showStep2() {
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');

    const durations = Object.keys(selectedPlan.durations);

    document.getElementById('summaryPlanName').textContent    = selectedPlan.name;
    document.getElementById('summaryPlanDisplay').textContent = selectedPlan.name;

    const picker = document.getElementById('durationPicker');
    picker.innerHTML = '';
    durations.forEach((key, idx) => {
        const d   = selectedPlan.durations[key];
        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'duration-btn' + (idx === 0 ? ' active' : '');
        btn.setAttribute('data-duration', key);
        btn.innerHTML = `
            <span class="dur-label">${d.label}</span>
            <span class="dur-price">₹${d.amount.toLocaleString()}</span>
            ${d.save ? `<span class="dur-save">Save ${d.save}</span>` : ''}
        `;
        btn.addEventListener('click', () => selectDuration(key));
        picker.appendChild(btn);
    });

    selectDuration(durations[0]);
}

function selectDuration(key) {
    selectedDuration = key;
    const d = selectedPlan.durations[key];
    selectedAmount = d.amount;

    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-duration') === key);
    });

    document.getElementById('summaryDuration').textContent = d.label;
    document.getElementById('summaryPrice').textContent    = '₹' + d.amount.toLocaleString();
    document.getElementById('payBtnAmount').textContent    = '₹' + d.amount.toLocaleString();
}

// ===== RAZORPAY PAYMENT — SECURE FLOW =====
// 1) Backend creates order (validates plan/amount/phone)
// 2) Razorpay checkout opens with the order_id
// 3) On success, backend verifies HMAC-SHA256 signature
// 4) Only after verification do we show success page + Telegram links
async function handlePayment(e) {
    e.preventDefault();

    const name  = document.getElementById('userName').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    if (!name)  { showInputError('userName', 'Please enter your name'); return; }
    if (!/^\d{10}$/.test(phone)) { showInputError('userPhone', 'Enter a valid 10-digit number'); return; }

    const payBtn = document.querySelector('.pay-btn');
    const payBtnHTML = payBtn ? payBtn.innerHTML : null;

    function setBtnLoading(loading) {
        if (!payBtn) return;
        if (loading) {
            payBtn.disabled = true;
            payBtn.innerHTML = '<span>Preparing secure checkout…</span>';
            payBtn.style.opacity = '0.7';
        } else {
            payBtn.disabled = false;
            payBtn.innerHTML = payBtnHTML;
            payBtn.style.opacity = '';
        }
    }

    setBtnLoading(true);

    // ===== STEP 1: Create order on backend =====
    let order;
    try {
        order = await apiCreateOrder({
            plan:     selectedPlanKey,
            duration: selectedDuration,
            name,
            phone
        });
    } catch (err) {
        setBtnLoading(false);
        alert('Could not start payment. ' + (err.message || 'Please try again.'));
        console.error('create-order error:', err);
        return;
    }

    setBtnLoading(false);

    // ===== STEP 2: Open Razorpay with the order_id =====
    const options = {
        key:        order.key_id,
        amount:     order.amount,
        currency:   order.currency,
        order_id:   order.order_id,
        name:       'AlphX Trading',
        description:`${order.plan_name} - ${order.duration}`,
        prefill:    { name, contact: phone },
        theme:      { color: '#6d5cff' },
        handler: async function (response) {
            // ===== STEP 3: Verify on backend =====
            const verifyRes = await apiVerifyPayment({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature
            });
            if (verifyRes.ok && verifyRes.verified) {
                showSuccessStep(response.razorpay_payment_id, name);
            } else {
                alert('Payment received but could not be verified. Please contact support with this ID: ' + response.razorpay_payment_id);
                console.error('Signature verification failed:', verifyRes);
            }
        },
        modal: {
            ondismiss: function () {
                // User closed Razorpay popup — mark as cancelled in DB
                apiVerifyPayment({
                    razorpay_order_id: order.order_id,
                    failure_reason:    'Cancelled by user'
                }).catch(() => {});
            }
        }
    };

    try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            const reason = response.error && response.error.description || 'Payment failed';
            apiVerifyPayment({
                razorpay_order_id: response.error?.metadata?.order_id || order.order_id,
                failure_reason:    reason
            }).catch(() => {});
            alert('Payment failed: ' + reason);
        });
        rzp.open();
    } catch (err) {
        alert('Error initializing payment. Please try again.');
        console.error(err);
    }
}

function showInputError(inputId, message) {
    const input = document.getElementById(inputId);
    input.style.borderColor = '#ff6b6b';
    input.focus();
    setTimeout(() => { input.style.borderColor = ''; }, 3000);
    alert(message);
}

// ===== SUCCESS STEP =====
function showSuccessStep(paymentId, userName) {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');

    // Fill receipt
    const d = selectedPlan.durations[selectedDuration];
    document.getElementById('receiptPaymentId').textContent = paymentId || 'N/A';
    document.getElementById('receiptName').textContent      = userName;
    document.getElementById('receiptPlan').textContent      = selectedPlan.name;
    document.getElementById('receiptDuration').textContent  = d.label;
    document.getElementById('receiptAmount').textContent    = '₹' + selectedAmount.toLocaleString();
    const now = new Date();
    const datePart = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const h = now.getHours(), m = now.getMinutes();
    const timePart = `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
    document.getElementById('receiptDate').textContent = `${datePart}, ${timePart}`;

    // Show only relevant Telegram links
    const linkEquity = document.getElementById('link-equity');
    const linkFno    = document.getElementById('link-fno');
    const linkDisc   = document.getElementById('link-discussion');
    if (linkEquity) linkEquity.style.display = selectedPlan.links.includes('equity')     ? 'flex' : 'none';
    if (linkFno)    linkFno.style.display    = selectedPlan.links.includes('fno')        ? 'flex' : 'none';
    if (linkDisc)   linkDisc.style.display   = selectedPlan.links.includes('discussion') ? 'flex' : 'none';

    // Scroll modal to top so receipt is visible
    const modal = document.querySelector('.modal');
    if (modal) modal.scrollTop = 0;

    // Launch confetti
    launchConfetti();
}

// ===== CONFETTI =====
function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors  = ['#6d5cff', '#00e5a0', '#ff6b6b', '#ffd700', '#29b6f6', '#ff9f43'];
    const pieces  = Array.from({ length: 80 }, () => ({
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height - canvas.height,
        w:    Math.random() * 10 + 5,
        h:    Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy:   Math.random() * 3 + 2,
        vx:   (Math.random() - 0.5) * 2,
        rot:  Math.random() * 360,
        vrot: (Math.random() - 0.5) * 6
    }));

    let frame;
    const endTime = Date.now() + 2800;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            ctx.save();
            ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, (endTime - Date.now()) / 1200);
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
            p.x   += p.vx;
            p.y   += p.vy;
            p.rot += p.vrot;
        });
        if (Date.now() < endTime) {
            frame = requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    draw();
}

// ===== PROOF LIGHTBOX =====
function openProof(imgSrc) {
    const lb  = document.getElementById('proofLightbox');
    document.getElementById('lightboxImg').src = imgSrc;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('proofLightbox').classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const lb = document.getElementById('proofLightbox');
    if (lb) {
        lb.addEventListener('click', e => {
            if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLightbox();
        });
    }
});

// ===== LIVE NOTIFICATION POPUP =====
function showLiveNotification() {
    const notif = document.getElementById('liveNotif');
    if (!notif) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    // On mobile: appear later (8s) and disappear sooner (4s) to be non-intrusive
    const initialDelay = isMobile ? 8000 : 3500;
    const visibleFor   = isMobile ? 4000 : 7000;
    setTimeout(() => {
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), visibleFor);
    }, initialDelay);
}
showLiveNotification();

// ===== STICKY CTA BAR =====
(function () {
    const cta   = document.getElementById('stickyCta');
    const hero  = document.getElementById('hero');
    const plans = document.getElementById('plans');
    if (!cta || !hero || !plans) return;

    function updateSticky() {
        const scrollY      = window.scrollY;
        const heroBottom   = hero.offsetTop + hero.offsetHeight;
        const plansTop     = plans.offsetTop;
        const plansBottom  = plansTop + plans.offsetHeight;
        const pastHero     = scrollY > heroBottom - 100;
        const inOrPastPlans = scrollY + window.innerHeight > plansTop + 80
                           && scrollY < plansBottom + 100;
        if (pastHero && !inOrPastPlans) {
            cta.classList.add('show');
        } else {
            cta.classList.remove('show');
        }
    }
    window.addEventListener('scroll', updateSticky, { passive: true });
})();

// ===== SMOOTH ANCHOR SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
});

// ===== TOP PROMO BAR ACTIVE FLAG =====
if (document.getElementById('promoBar')) {
    document.body.classList.add('has-promo');
}

// ===== PROMO COUNTDOWN TIMER (resets daily at midnight) =====
(function () {
    const el = document.getElementById('promoTimer');
    if (!el) return;
    function tick() {
        const now = new Date();
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        const diff = end - now;
        if (diff <= 0) { el.textContent = 'Resets soon'; return; }
        const h = Math.floor(diff / 3.6e6);
        const m = Math.floor((diff % 3.6e6) / 6e4);
        const s = Math.floor((diff % 6e4) / 1000);
        const pad = n => String(n).padStart(2, '0');
        el.textContent = `Ends in ${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    tick();
    setInterval(tick, 1000);
})();

// ===== CYCLING JOIN NOTIFICATIONS =====
(function () {
    const notif = document.getElementById('joinNotif');
    if (!notif) return;
    const avatarEl = document.getElementById('joinAvatar');
    const nameEl   = document.getElementById('joinName');
    const cityEl   = document.getElementById('joinCity');
    const planEl   = document.getElementById('joinPlan');
    const timeEl   = document.getElementById('joinTime');

    const people = [
        { name: 'Ramesh',  city: 'Mumbai',     plan: 'F&O Premium',    grad: 'linear-gradient(135deg,#6d5cff,#a78bfa)' },
        { name: 'Priya',   city: 'Bangalore',  plan: 'Equity',         grad: 'linear-gradient(135deg,#00e5a0,#06b6d4)' },
        { name: 'Vikram',  city: 'Hyderabad',  plan: 'Ultimate Combo', grad: 'linear-gradient(135deg,#f59e0b,#f97316)' },
        { name: 'Sneha',   city: 'Pune',       plan: 'F&O Premium',    grad: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
        { name: 'Aditya',  city: 'Delhi',      plan: 'Equity',         grad: 'linear-gradient(135deg,#6d5cff,#00e5a0)' },
        { name: 'Karthik', city: 'Chennai',    plan: 'F&O Premium',    grad: 'linear-gradient(135deg,#06b6d4,#6d5cff)' },
        { name: 'Anjali',  city: 'Kolkata',    plan: 'Discussion',     grad: 'linear-gradient(135deg,#ec4899,#f59e0b)' },
        { name: 'Rohan',   city: 'Ahmedabad',  plan: 'Ultimate Combo', grad: 'linear-gradient(135deg,#00e5a0,#a78bfa)' },
        { name: 'Meera',   city: 'Jaipur',     plan: 'Equity',         grad: 'linear-gradient(135deg,#f97316,#ec4899)' },
        { name: 'Suresh',  city: 'Lucknow',    plan: 'F&O Premium',    grad: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' },
        { name: 'Neha',    city: 'Indore',     plan: 'Ultimate Combo', grad: 'linear-gradient(135deg,#00e5a0,#6d5cff)' },
        { name: 'Arjun',   city: 'Chandigarh', plan: 'F&O Premium',    grad: 'linear-gradient(135deg,#a78bfa,#00e5a0)' }
    ];
    const times = ['just now', '1 min ago', '2 min ago', '3 min ago', '5 min ago', '7 min ago', '12 min ago'];
    let idx = 0;
    let cycling = false;

    function showNext() {
        const p = people[idx % people.length];
        const t = times[Math.floor(Math.random() * times.length)];
        nameEl.textContent   = p.name;
        cityEl.textContent   = p.city;
        planEl.textContent   = p.plan;
        timeEl.textContent   = t;
        avatarEl.textContent = p.name[0];
        avatarEl.style.background = p.grad;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 5000);
        idx++;
    }

    function startCycle() {
        if (cycling) return;
        cycling = true;
        setTimeout(showNext, 4500);
        setInterval(showNext, 13000);
    }
    if (document.readyState === 'complete') startCycle();
    else window.addEventListener('load', startCycle);
})();

// ===== 3D MOUSE-TRACKED TILT + SPOTLIGHT =====
(function () {
    // Skip on touch / small screens
    const isCoarse  = window.matchMedia('(hover: none)').matches;
    const isSmall   = window.matchMedia('(max-width: 900px)').matches;
    const reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isCoarse || isSmall || reduced) return;

    const cards = document.querySelectorAll(
        '.plan-card, .feature-card, .testi-card, .hiw-step, .trading-card'
    );

    cards.forEach(card => {
        let raf = null;
        let pendingX = 0, pendingY = 0;

        function applyTilt() {
            const rect = card.getBoundingClientRect();
            const px = (pendingX - rect.left) / rect.width;   // 0..1
            const py = (pendingY - rect.top)  / rect.height;  // 0..1
            const rotY = (px - 0.5) *  10;   // ±5deg
            const rotX = (0.5 - py) *  10;   // ±5deg

            card.style.transform =
                `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(0)`;

            card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
            card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
            card.style.setProperty('--gloss', '1');
            raf = null;
        }

        card.addEventListener('mousemove', e => {
            pendingX = e.clientX;
            pendingY = e.clientY;
            if (raf === null) raf = requestAnimationFrame(applyTilt);
        });

        card.addEventListener('mouseleave', () => {
            if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
            card.style.transform = '';
            card.style.setProperty('--gloss', '0');
        });
    });
})();

// ===== MAGNETIC BUTTONS =====
(function () {
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const buttons = document.querySelectorAll(
        '.btn-primary, .nav-cta, .plan-subscribe-btn, .sticky-btn, .promo-cta'
    );

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width  / 2);
            const dy = e.clientY - (rect.top  + rect.height / 2);
            // Pull strength: ~14% of distance, capped
            const strength = 0.18;
            const tx = Math.max(-10, Math.min(10, dx * strength));
            const ty = Math.max(-6,  Math.min(6,  dy * strength));
            btn.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
})();

// ===== PARALLAX BACKGROUND GLOWS =====
(function () {
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const glows = document.querySelectorAll('.glow');
    if (!glows.length) return;

    let raf = null;
    let mx = 0, my = 0;

    function apply() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const nx = (mx / w - 0.5) * 2;   // -1..1
        const ny = (my / h - 0.5) * 2;
        glows.forEach((g, i) => {
            const depth = (i + 1) * 18;
            g.style.transform = `translate(${(nx * depth).toFixed(1)}px, ${(ny * depth).toFixed(1)}px)`;
        });
        raf = null;
    }

    window.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        if (raf === null) raf = requestAnimationFrame(apply);
    }, { passive: true });
})();

// ===== HERO VISUAL — DEEP 3D PARALLAX ON MOUSE =====
(function () {
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 900px)').matches) return;

    const hero  = document.getElementById('hero');
    const cards = hero ? hero.querySelectorAll('.trading-card') : [];
    if (!hero || !cards.length) return;

    let raf = null, mx = 0, my = 0;

    function apply() {
        const rect = hero.getBoundingClientRect();
        const px = (mx - rect.left) / rect.width  - 0.5;   // -0.5..0.5
        const py = (my - rect.top)  / rect.height - 0.5;
        cards.forEach((c, i) => {
            const depth   = i === 0 ? 1 : 1.6;
            const rY = px * 12 * depth;
            const rX = -py * 12 * depth;
            const tZ = i === 0 ? 0 : 40;
            c.style.transform =
                `perspective(1000px) rotateY(${rY.toFixed(2)}deg) rotateX(${rX.toFixed(2)}deg) translateZ(${tZ}px)`;
        });
        raf = null;
    }

    hero.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        if (raf === null) raf = requestAnimationFrame(apply);
    }, { passive: true });

    hero.addEventListener('mouseleave', () => {
        cards.forEach(c => c.style.transform = '');
    });
})();
