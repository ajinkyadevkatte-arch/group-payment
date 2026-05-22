// ===== UPI PAYMENT CONFIG =====
const UPI_CONFIG = {
    upiId:        'telewarravikiran-1@okhdfcbank',   // Primary UPI ID (QR + intent)
    payeeName:    'Ravikiran Telewar',                // Name shown in UPI app
    telegramUser: 'ALPHXRK'                            // Handle for payment confirmation
};

const PLANS = {
    equity: {
        name: 'Alpha Swing & Positional',
        durations: {
            '1month':  { label: '1 Month',  amount: 1299, save: null },
            '3month':  { label: '3 Months', amount: 3000, save: '₹897' },
            '1year':   { label: '1 Year',   amount: 7500, save: '₹8,088' }
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

// Current order context (set when user proceeds to payment)
let currentOrder = { id: null, name: '', phone: '', amount: 0, planName: '', durationLabel: '' };

// ===== ORDER ID GENERATOR =====
function generateOrderId() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I/L
    let id = '';
    for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return 'ALPHX-' + id;
}

// ===== BUILD UPI INTENT STRING =====
function buildUpiString(amount, orderId) {
    const params = new URLSearchParams({
        pa: UPI_CONFIG.upiId,
        pn: UPI_CONFIG.payeeName,
        am: String(amount),
        cu: 'INR',
        tn: `AlphX ${orderId}`
    });
    return 'upi://pay?' + params.toString();
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

// ===== UPI PAYMENT FLOW =====
// 1) Validate name + phone
// 2) Generate unique order ID
// 3) Show UPI payment screen (QR + pay button + copy UPI)
// 4) User pays, then confirms on Telegram with screenshot + UTR
function handlePayment(e) {
    e.preventDefault();

    const name  = document.getElementById('userName').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    if (!name)  { showInputError('userName', 'Please enter your name'); return; }
    if (!/^\d{10}$/.test(phone)) { showInputError('userPhone', 'Enter a valid 10-digit number'); return; }

    const d = selectedPlan.durations[selectedDuration];

    // Build the order context
    currentOrder = {
        id:            generateOrderId(),
        name:          name,
        phone:         phone,
        amount:        selectedAmount,
        planName:      selectedPlan.name,
        durationLabel: d.label
    };

    showUpiPaymentStep();
}

function showInputError(inputId, message) {
    const input = document.getElementById(inputId);
    input.style.borderColor = '#ff6b6b';
    input.focus();
    setTimeout(() => { input.style.borderColor = ''; }, 3000);
    alert(message);
}

// ===== UPI PAYMENT STEP =====
function showUpiPaymentStep() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');

    const amt = currentOrder.amount;
    const amtText = '₹' + amt.toLocaleString();

    // Fill header + amount + order id
    document.getElementById('upiPlanName').textContent = `${currentOrder.planName} · ${currentOrder.durationLabel}`;
    document.getElementById('upiAmount').textContent   = amtText;
    document.getElementById('upiOrderId').textContent  = currentOrder.id;
    document.getElementById('upiIdValue').textContent  = UPI_CONFIG.upiId;

    // Build UPI intent string
    const upiString = buildUpiString(amt, currentOrder.id);

    // Mobile "Pay via UPI app" button
    const payBtn = document.getElementById('upiPayBtn');
    payBtn.href = upiString;
    payBtn.querySelector('span').textContent = `Pay ${amtText} via UPI App`;

    // Generate QR code
    const qrBox = document.getElementById('upiQrBox');
    qrBox.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrBox, {
            text:        upiString,
            width:       200,
            height:      200,
            colorDark:   '#000000',
            colorLight:  '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } else {
        // Fallback if QR library failed to load
        qrBox.innerHTML = '<div class="upi-qr-fallback">QR unavailable — please use the UPI ID below to pay</div>';
    }

    // Start at top so user sees QR + amount first
    const modal = document.querySelector('.modal');
    if (modal) modal.scrollTop = 0;

    // Gentle auto-scroll to reveal the "Confirm on Telegram" step so mobile
    // users realize they must confirm there to get the link. We preview the
    // bottom, then smoothly return to top so they can pay first.
    if (modal) {
        const tgBox = document.querySelector('.upi-confirm-box');
        if (tgBox) {
            // After a few seconds, reveal the Telegram step
            setTimeout(() => {
                // Only auto-scroll if user hasn't already scrolled themselves
                if (modal.scrollTop < 30) {
                    modal.scrollTo({ top: tgBox.offsetTop - 90, behavior: 'smooth' });
                    // Return to top after they've seen it
                    setTimeout(() => {
                        if (!modal.dataset.userScrolled) {
                            modal.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }, 2600);
                }
            }, 3500);

            // Stop the auto-return if user scrolls manually
            modal.addEventListener('scroll', function onScroll() {
                modal.dataset.userScrolled = '1';
            }, { once: true });
        }
    }

    // Save a pending record (best-effort, non-blocking)
    savePendingOrder();
}

// ===== GENERIC COPY-TO-CLIPBOARD =====
function copyText(text, btn) {
    const orig = btn.textContent;
    const done = () => {
        btn.textContent = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
        fallback();
    }
    function fallback() {
        const tmp = document.createElement('input');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(tmp);
        done();
    }
}

// ===== COPY UPI ID =====
function copyUpiId() {
    copyText(UPI_CONFIG.upiId, document.getElementById('upiCopyBtn'));
}

// ===== TOGGLE BANK DETAILS =====
function toggleBankDetails() {
    const box  = document.getElementById('bankDetails');
    const chev = document.getElementById('bankChev');
    const open = box.classList.toggle('open');
    if (chev) chev.textContent = open ? '▴' : '▾';
}

// ===== CONFIRM ON TELEGRAM =====
function confirmOnTelegram() {
    const o = currentOrder;
    const msg =
        `Hi! I have paid for AlphX 👇\n` +
        `Plan: ${o.planName}\n` +
        `Duration: ${o.durationLabel}\n` +
        `Amount: ₹${o.amount.toLocaleString()}\n` +
        `Order ID: ${o.id}\n` +
        `Name: ${o.name}\n` +
        `Phone: ${o.phone}\n` +
        `\n(Attaching payment screenshot + UTR/Transaction ID)`;

    // Copy message so user can paste it in chat (text param doesn't auto-fill user DMs)
    navigator.clipboard.writeText(msg).catch(() => {});

    const tgBtn = document.getElementById('upiTelegramBtn');
    if (tgBtn) {
        const orig = tgBtn.innerHTML;
        tgBtn.innerHTML = '✓ Order details copied! Opening Telegram…';
        setTimeout(() => { tgBtn.innerHTML = orig; }, 3500);
    }

    // Open Telegram chat with the support handle
    const tgUrl = `https://t.me/${UPI_CONFIG.telegramUser}?text=${encodeURIComponent(msg)}`;
    window.open(tgUrl, '_blank');
}

// ===== SAVE PENDING ORDER (best-effort tracking) =====
function savePendingOrder() {
    // Optional: log the order attempt. Uses Supabase REST insert.
    // Non-blocking — failure here never breaks the payment UI.
    if (!window.SUPABASE_INSERT_URL) return; // only runs if configured
    try {
        fetch(window.SUPABASE_INSERT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey':        window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Prefer':        'return=minimal'
            },
            body: JSON.stringify({
                name:       currentOrder.name,
                phone:      currentOrder.phone,
                plan:       selectedPlanKey,
                duration:   selectedDuration,
                amount:     currentOrder.amount,
                order_id:   currentOrder.id,
                status:     'pending',
                created_at: new Date().toISOString()
            })
        }).catch(() => {});
    } catch (e) { /* ignore */ }
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

// ===== LIVE VIEWER COUNT (fluctuates for FOMO) =====
(function () {
    const el = document.getElementById('viewerCount');
    if (!el) return;
    let count = 38 + Math.floor(Math.random() * 20); // 38–57
    el.textContent = count;
    setInterval(() => {
        count += Math.floor(Math.random() * 7) - 3; // ±3 drift
        if (count < 31) count = 31 + Math.floor(Math.random() * 5);
        if (count > 68) count = 68 - Math.floor(Math.random() * 5);
        el.textContent = count;
    }, 4000);
})();

// ===== MEMBER COUNTS — slow organic drift (looks genuine, not static) =====
(function () {
    const counters = document.querySelectorAll('.member-count');
    if (!counters.length) return;
    // Each counter drifts around its base value, trending slightly upward
    const state = Array.from(counters).map(el => ({
        el,
        value: parseInt(el.getAttribute('data-base'), 10) || 0
    }));
    function fmt(n) { return n.toLocaleString('en-IN'); }
    setInterval(() => {
        state.forEach(s => {
            // 70% chance +1..+2 (growth), 30% chance -1 (someone left)
            const delta = Math.random() < 0.7 ? (1 + Math.floor(Math.random() * 2)) : -1;
            s.value += delta;
            const base = parseInt(s.el.getAttribute('data-base'), 10);
            // keep within a believable band of the base
            if (s.value < base - 8) s.value = base - 8;
            if (s.value > base + 25) s.value = base + 25;
            s.el.textContent = fmt(s.value);
        });
    }, 9000);
})();

// ===== "JOINED TODAY" — slowly increments =====
(function () {
    const el = document.querySelector('.joined-today');
    if (!el) return;
    let n = parseInt(el.getAttribute('data-base'), 10) || 18;
    setInterval(() => {
        if (Math.random() < 0.45) { // not every tick, feels real
            n += 1;
            el.textContent = n;
        }
    }, 18000);
})();

// ===== LIMITED SEATS COUNTER (slowly decrements) =====
(function () {
    const el = document.getElementById('fnoSeats');
    if (!el) return;
    let seats = parseInt(el.textContent) || 7;
    // Occasionally drop by 1 to create urgency (min 2)
    setInterval(() => {
        if (seats > 2 && Math.random() < 0.35) {
            seats--;
            el.textContent = seats;
        }
    }, 22000);
})();

// ===== FLOATING TELEGRAM — attention pulse on load =====
(function () {
    const tg = document.getElementById('tgFloat');
    if (!tg) return;
    // Briefly expand the label ~5s after load to draw the eye, then collapse
    setTimeout(() => {
        tg.classList.add('attention');
        setTimeout(() => tg.classList.remove('attention'), 4000);
    }, 6000);
})();

// ===== EXIT-INTENT POPUP =====
(function () {
    const overlay = document.getElementById('exitOverlay');
    if (!overlay) return;
    const SHOWN_KEY = 'alphx_exit_shown';
    let shown = false;

    function alreadyShownThisSession() {
        try { return sessionStorage.getItem(SHOWN_KEY) === '1'; } catch (e) { return false; }
    }
    function markShown() {
        try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch (e) {}
    }

    function showExit() {
        if (shown || alreadyShownThisSession()) return;
        // Don't show if a payment modal is open
        if (document.getElementById('paymentModal').classList.contains('active')) return;
        shown = true;
        markShown();
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        startExitTimer();
    }

    // Desktop: mouse leaves toward the top (closing tab / address bar)
    document.addEventListener('mouseout', function (e) {
        if (e.clientY <= 0 && !e.relatedTarget && !e.toElement) showExit();
    });

    // Mobile: fast scroll up near the top (back-intent) OR after long idle
    let lastY = window.scrollY;
    let mobileTimer = null;
    if (window.matchMedia('(max-width: 768px)').matches) {
        window.addEventListener('scroll', function () {
            const y = window.scrollY;
            if (lastY - y > 30 && y < 400) showExit();
            lastY = y;
        }, { passive: true });
        // Fallback: show after 45s of being on page (mobile)
        mobileTimer = setTimeout(showExit, 45000);
    }

    // Exit countdown timer
    function startExitTimer() {
        const el = document.getElementById('exitTimer');
        if (!el) return;
        let total = 15 * 60; // 15 minutes
        function tick() {
            const m = Math.floor(total / 60);
            const s = total % 60;
            el.textContent = `${m}:${String(s).padStart(2, '0')}`;
            if (total > 0) { total--; setTimeout(tick, 1000); }
        }
        tick();
    }

    // Expose close globally
    window.closeExitPopup = function () {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        if (mobileTimer) clearTimeout(mobileTimer);
    };

    // Click outside modal closes it
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) window.closeExitPopup();
    });
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
