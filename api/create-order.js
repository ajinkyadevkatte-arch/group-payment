// /api/create-order.js
// Server-side Razorpay order creation + pending Supabase record
// All secrets read from Vercel environment variables — never exposed to client

const Razorpay = require('razorpay');

// ===== Plan catalogue (single source of truth, server-side validated) =====
const PLANS = {
    equity: {
        name: 'Alpha Swing & Positional',
        durations: {
            '1month': { label: '1 Month',  amount: 1299 },
            '3month': { label: '3 Months', amount: 3000 },
            '1year':  { label: '1 Year',   amount: 7500 }
        }
    },
    fno: {
        name: 'AlphX Premium F&O',
        durations: {
            '1month': { label: '1 Month',  amount: 2500 },
            '3month': { label: '3 Months', amount: 4999 },
            '1year':  { label: '1 Year',   amount: 12000 }
        }
    },
    combo: {
        name: 'Ultimate Combo (Equity + F&O)',
        durations: {
            '1month': { label: '1 Month',  amount: 3500 }
        }
    },
    discussion: {
        name: 'AlphX Discussion Group',
        durations: {
            '1month': { label: '1 Month',  amount: 200 }
        }
    }
};

async function saveSubscriberPending(payload) {
    const url = `${process.env.SUPABASE_URL}/rest/v1/subscribers`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey':        process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Prefer':        'return=representation'
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase insert failed: ${res.status} ${text}`);
    }
    return res.json();
}

module.exports = async (req, res) => {
    // CORS — allow same-origin only in prod, but Vercel handles it via vercel.json
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { plan, duration, name, phone } = req.body || {};

        // ===== Server-side validation =====
        if (!plan || !duration || !name || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!PLANS[plan]) {
            return res.status(400).json({ error: 'Invalid plan' });
        }
        const planDef = PLANS[plan];
        if (!planDef.durations[duration]) {
            return res.status(400).json({ error: 'Invalid duration for this plan' });
        }
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Phone must be 10 digits' });
        }
        if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
            return res.status(400).json({ error: 'Name length invalid' });
        }

        const durationDef = planDef.durations[duration];
        const amountPaise = durationDef.amount * 100; // Razorpay uses paise

        // ===== Create Razorpay order =====
        const razorpay = new Razorpay({
            key_id:     process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        // Short receipt (max 40 chars per Razorpay)
        const receipt = `r_${plan}_${duration}_${Date.now()}`.slice(0, 40);

        const order = await razorpay.orders.create({
            amount:   amountPaise,
            currency: 'INR',
            receipt:  receipt,
            notes: {
                plan,
                duration,
                customer_name:  name.trim(),
                customer_phone: phone
            }
        });

        // ===== Save pending record to Supabase =====
        try {
            await saveSubscriberPending({
                name:       name.trim(),
                phone,
                plan,
                duration,
                amount:     durationDef.amount,
                order_id:   order.id,
                payment_id: null,
                status:     'pending',
                error_msg:  null
            });
        } catch (dbErr) {
            // Log but don't fail the order — payment can still proceed
            console.error('Supabase pending insert failed:', dbErr.message);
        }

        // ===== Return safe data to frontend =====
        return res.status(200).json({
            order_id:    order.id,
            amount:      amountPaise,
            currency:    'INR',
            key_id:      process.env.RAZORPAY_KEY_ID,
            plan_name:   planDef.name,
            duration:    durationDef.label,
            display_amount: durationDef.amount
        });
    } catch (err) {
        console.error('create-order error:', err);
        return res.status(500).json({
            error: 'Could not create order. Please try again.',
            detail: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
