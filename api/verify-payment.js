// /api/verify-payment.js
// Server-side Razorpay signature verification using HMAC-SHA256
// CRITICAL: this is what prevents fraud — never trust client-side payment.success

const crypto = require('crypto');

async function updateSubscriberByOrderId(orderId, patch) {
    const url = `${process.env.SUPABASE_URL}/rest/v1/subscribers?order_id=eq.${encodeURIComponent(orderId)}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey':        process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Prefer':        'return=representation'
        },
        body: JSON.stringify(patch)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase update failed: ${res.status} ${text}`);
    }
    return res.json();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            // Optional metadata for failure cases
            failure_reason
        } = req.body || {};

        if (!razorpay_order_id) {
            return res.status(400).json({ error: 'Missing order_id' });
        }

        // ===== Failure path: payment cancelled or failed on Razorpay side =====
        if (!razorpay_payment_id || !razorpay_signature) {
            try {
                await updateSubscriberByOrderId(razorpay_order_id, {
                    status:    'failed',
                    error_msg: failure_reason || 'Payment not completed'
                });
            } catch (e) {
                console.error('Supabase failed-update error:', e.message);
            }
            return res.status(200).json({ verified: false, status: 'failed' });
        }

        // ===== Verify signature with HMAC-SHA256 =====
        // Razorpay formula: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const isValid = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'utf-8'),
            Buffer.from(razorpay_signature, 'utf-8')
        );

        if (!isValid) {
            // Signature mismatch — possible tampering
            try {
                await updateSubscriberByOrderId(razorpay_order_id, {
                    status:    'failed',
                    payment_id: razorpay_payment_id,
                    error_msg: 'Signature verification failed'
                });
            } catch (e) {
                console.error('Supabase tamper-update error:', e.message);
            }
            return res.status(400).json({ verified: false, error: 'Invalid signature' });
        }

        // ===== Success path =====
        try {
            await updateSubscriberByOrderId(razorpay_order_id, {
                status:     'success',
                payment_id: razorpay_payment_id,
                error_msg:  null
            });
        } catch (e) {
            // DB update failed but payment IS valid — log + still return success
            console.error('Supabase success-update error:', e.message);
        }

        return res.status(200).json({
            verified:   true,
            status:     'success',
            payment_id: razorpay_payment_id
        });
    } catch (err) {
        console.error('verify-payment error:', err);
        return res.status(500).json({
            error:  'Verification failed',
            detail: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
