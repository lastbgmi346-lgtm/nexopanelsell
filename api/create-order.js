// api/create-order.js - Add user_uid in order
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount, mobile, uid } = req.body; // ✅ uid frontend se bhejo

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';
    const BASE_URL = 'https://famgateway.in';
    const REDIRECT_URL = 'https://nexopanelsell.vercel.app/success';
    const WEBHOOK_URL = 'https://nexopanelsell.vercel.app/api/webhook';

    try {
        const response = await fetch(
            `${BASE_URL}/api/qr.php?api_key=${API_KEY}&amount=${amount}&redirect_url=${encodeURIComponent(REDIRECT_URL)}&webhook_url=${encodeURIComponent(WEBHOOK_URL)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ FamGateway Response:', data);

        if (data.status === 'success' && data.data) {
            // ✅ Store order with user UID in Firebase
            const orderRef = ref(db, `orders/${data.data.order_id}`);
            await update(orderRef, {
                order_id: data.data.order_id,
                user_uid: uid, // ✅ User UID store karo
                amount: parseFloat(amount),
                mobile: mobile,
                status: 'pending',
                created_at: new Date().toISOString()
            });

            return res.status(200).json({
                success: true,
                checkout_url: data.data.checkout_url || `${BASE_URL}/checkout.php?order_id=${data.data.order_id}`,
                order_id: data.data.order_id,
                qr_url: data.data.qr_url,
                payable_amount: data.data.payable_amount
            });
        } else {
            return res.status(500).json({
                error: data.message || 'Failed to create payment order'
            });
        }
    } catch (error) {
        console.error('❌ Payment Error:', error);
        return res.status(500).json({
            error: 'Payment gateway error: ' + error.message
        });
    }
}
