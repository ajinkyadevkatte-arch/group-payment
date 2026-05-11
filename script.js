// ===== CONFIG =====
const RAZORPAY_KEY = 'rzp_live_SOAQ0TsqzHImFB';

// 🔑 Supabase Config — Replace with your Supabase project details
const SUPABASE_URL = 'https://qdhnctvybdynshkmfldo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaG5jdHZ5YmR5bnNoa21mbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTA5NzEsImV4cCI6MjA5NDA2Njk3MX0.dqVDSOYNqv95G67bGNd99U1HGc35P4CK2QVKzIUSgoQ';

// Plan configs with duration pricing
const PLANS = {
    equity: {
        name: 'Alpha Swing & Positional',
        durations: {
            '1month':  { label: '1 Month',   amount: 2000,  save: null },
            '3month':  { label: '3 Months',  amount: 3999,  save: '₹2,001' },
            '1year':   { label: '1 Year',    amount: 10000, save: '₹14,000' }
        },
        links: ['equity']
    },
    fno: {
        name: 'AlphX Premium F&O',
        durations: {
            '1month':  { label: '1 Month',   amount: 2500,  save: null },
            '3month':  { label: '3 Months',  amount: 4999,  save: '₹2,501' },
            '1year':   { label: '1 Year',    amount: 12000, save: '₹18,000' }
        },
        links: ['fno']
    },
    combo: {
        name: 'Ultimate Combo (Equity + F&O)',
        durations: {
            '1month':  { label: '1 Month',   amount: 3500,  save: null }
        },
        links: ['equity', 'fno']
    },
    discussion: {
        name: 'AlphX Discussion Group',
        durations: {
            '1month':  { label: '1 Month',   amount: 200,  save: null }
        },
        links: ['discussion']
    }
};

let selectedPlan = null;
let selectedPlanKey = null;
let selectedDuration = null;
let selectedAmount = 0;

// ===== SUPABASE: Save subscriber to database =====
async function saveSubscriber(data) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            console.log('✅ Subscriber saved to Supabase');
        } else {
            console.error('❌ Supabase error:', res.status, await res.text());
        }
    } catch (err) {
        console.error('❌ Supabase save failed:', err);
    }
}

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== MOBILE MENU =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
}

// ===== SCROLL TO PLANS =====
function scrollToPlans() {
    document.getElementById('plans').scrollIntoView({ behavior: 'smooth' });
}

// ===== ANIMATED COUNTERS =====
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            counter.textContent = Math.floor(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    });
}

const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            heroObserver.disconnect();
        }
    });
}, { threshold: 0.3 });
heroObserver.observe(document.getElementById('hero'));

// ===== SCROLL ANIMATIONS =====
const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('[data-aos]').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    animObserver.observe(el);
});

const style = document.createElement('style');
style.textContent = '[data-aos].visible { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(style);

// ===== FAQ TOGGLE =====
function toggleFaq(btn) {
    const item = btn.parentElement;
    const wasActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    if (!wasActive) item.classList.add('active');
}

// ===== PAYMENT MODAL =====
function openPayment(planKey) {
    selectedPlanKey = planKey;
    selectedPlan = PLANS[planKey];
    if (!selectedPlan) return;

    // Reset modal steps
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('disclaimerCheckbox').checked = false;
    document.getElementById('proceedBtn').disabled = true;
    document.getElementById('paymentForm').reset();

    // Show/hide links based on plan
    const linkEquity = document.getElementById('link-equity');
    const linkFno = document.getElementById('link-fno');
    const linkDisc = document.getElementById('link-discussion');
    
    if (linkEquity) linkEquity.style.display = selectedPlan.links.includes('equity') ? 'flex' : 'none';
    if (linkFno) linkFno.style.display = selectedPlan.links.includes('fno') ? 'flex' : 'none';
    if (linkDisc) linkDisc.style.display = selectedPlan.links.includes('discussion') ? 'flex' : 'none';

    // Show modal
    document.getElementById('paymentModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('paymentModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

function toggleProceedBtn() {
    const checkbox = document.getElementById('disclaimerCheckbox');
    document.getElementById('proceedBtn').disabled = !checkbox.checked;
}

// ===== STEP 2: BUILD DURATION PICKER =====
function showStep2() {
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');

    const plan = selectedPlan;
    const durationPicker = document.getElementById('durationPicker');
    const durations = Object.keys(plan.durations);

    document.getElementById('summaryPlanName').textContent = plan.name;

    durationPicker.innerHTML = '';
    durations.forEach((key, idx) => {
        const d = plan.durations[key];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'duration-btn' + (idx === 0 ? ' active' : '');
        btn.setAttribute('data-duration', key);
        btn.innerHTML = `
            <span class="dur-label">${d.label}</span>
            <span class="dur-price">₹${d.amount.toLocaleString()}</span>
            ${d.save ? `<span class="dur-save">Save ${d.save}</span>` : ''}
        `;
        btn.addEventListener('click', () => selectDuration(key));
        durationPicker.appendChild(btn);
    });

    selectDuration(durations[0]);
}

function selectDuration(durationKey) {
    selectedDuration = durationKey;
    const d = selectedPlan.durations[durationKey];
    selectedAmount = d.amount;

    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-duration') === durationKey);
    });

    document.getElementById('summaryPrice').textContent = '₹' + d.amount.toLocaleString();
    document.getElementById('summaryDuration').textContent = d.label;
    document.getElementById('payBtnAmount').textContent = '₹' + d.amount.toLocaleString();
}

// ===== RAZORPAY PAYMENT =====
function handlePayment(e) {
    e.preventDefault();

    const name = document.getElementById('userName').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    if (!name || !phone) {
        alert('Please fill all fields.');
        return;
    }

    const d = selectedPlan.durations[selectedDuration];
    const description = selectedPlan.name + ' - ' + d.label;

    const options = {
        key: RAZORPAY_KEY,
        amount: selectedAmount * 100,
        currency: 'INR',
        name: 'AlphX Trading',
        description: description,
        image: '',
        prefill: { name, contact: phone },
        theme: { color: '#6d5cff' },
        handler: function (response) {
            console.log('Payment ID:', response.razorpay_payment_id);

            // Save to Supabase
            saveSubscriber({
                name: name,
                phone: phone,
                plan: selectedPlanKey,
                duration: selectedDuration,
                amount: selectedAmount,
                payment_id: response.razorpay_payment_id,
                created_at: new Date().toISOString()
            });

            showSuccessStep();
        },
        modal: {
            ondismiss: function () {
                console.log('Payment cancelled by user');
            }
        }
    };

    try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            alert('Payment failed. Please try again. Error: ' + response.error.description);
        });
        rzp.open();
    } catch (err) {
        if (RAZORPAY_KEY === 'YOUR_RAZORPAY_KEY_HERE') {
            alert('⚠️ Demo Mode: Razorpay key not configured.');
            showSuccessStep();
        } else {
            alert('Error initializing payment. Please try again.');
            console.error(err);
        }
    }
}

function showSuccessStep() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
}

// ===== PROOF LIGHTBOX =====
function openProof(imgSrc) {
    const lightbox = document.getElementById('proofLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    lightboxImg.src = imgSrc;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('proofLightbox').classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const lb = document.getElementById('proofLightbox');
    if (lb) {
        lb.addEventListener('click', (e) => {
            if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLightbox();
        });
    }
});

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
