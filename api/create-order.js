// ======== SOLUTION 2: DIRECT CLIENT-SIDE FAMGATEWAY INTEGRATION ========
async function initiateFamGatewayPayment(amount, mobile = '9999999999') {
    try {
        if (!amount || amount <= 0) {
            showToast('Kripya valid amount darj karein', 'error');
            return;
        }

        if (!currentUser || !currentUser.uid) {
            showToast('Kripya pehle login karein', 'error');
            return;
        }

        showToast('⏳ Direct Gateway Checkout Launch Ho Raha Hai...', 'warning');

        // Config Params
        const API_KEY = 'fam_2a9c0077d8c7d9e26f93fa6116ddfefc72eea8dc';
        const REDIRECT_URL = 'https://nexopanelsell.vercel.app/success';
        const WEBHOOK_URL = 'https://nexopanelsell.vercel.app/api/webhook';

        // Unique Temporary Order ID generate karein
        const tempOrderId = 'ORD_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        // Firebase me Pending Order Log Save Karein (Auto-Balance Credit ke liye)
        try {
            if (typeof db !== 'undefined' && ref && set) {
                await set(ref(db, `pending_orders/${tempOrderId}`), {
                    uid: currentUser.uid,
                    amount: parseFloat(amount),
                    mobile: mobile,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

                await set(ref(db, `user_orders/${currentUser.uid}/${tempOrderId}`), {
                    order_id: tempOrderId,
                    amount: parseFloat(amount),
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            }
        } catch (dbErr) {
            console.warn('⚠️ Firebase pre-save notice:', dbErr);
        }

        // Direct Browser Redirect URL (Bypassing Cloudflare Server-Side Block)
        const directCheckoutUrl = `https://famgateway.in/api/qr.php?api_key=${API_KEY}&amount=${amount}&redirect_url=${encodeURIComponent(REDIRECT_URL)}&webhook_url=${encodeURIComponent(WEBHOOK_URL)}&order_id=${tempOrderId}`;

        // Local Storage Sync Backup
        sessionStorage.setItem('user_uid', currentUser.uid);
        sessionStorage.setItem('current_order_id', tempOrderId);

        // Direct Browser Launch
        window.location.href = directCheckoutUrl;

    } catch (err) {
        console.error('❌ Checkout Error:', err);
        showToast('Connection Error: ' + err.message, 'error');
    }
}
