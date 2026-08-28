// api/create-order.js
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set } = require("firebase/database");

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDES_57EvH2ao97UKgLkbuKQA71NXB5CM0",
    authDomain: "nexo-store-6d494.firebaseapp.com",
    databaseURL: "https://nexo-store-6d494-default-rtdb.firebaseio.com",
    projectId: "nexo-store-6d494",
    storageBucket: "nexo-store-6d494.firebasestorage.app",
    messagingSenderId: "1077591470608",
    appId: "1:1077591470608:web:78022588f0fd1e4aa15095"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, 'createOrderApp');
const db = getDatabase(app);

// ✅ Vercel Standard Node.js Handler Export
module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-FamGateway-Signature');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { amount, mobile, uid } = req.body || {};

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        if (!uid) {
            return res.status(400).json({ error: 'User UID required' });
        }

        const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_2a9c0077d8c7d9e26f93fa6116ddfefc72eea8dc';
        const BASE_URL = 'https://famgateway.in';
        const REDIRECT_URL = 'https://nexopanelsell.vercel.app/success';
        const WEBHOOK_URL = 'https://nexopanelsell.vercel.app/api/webhook';

        console.log('📤 Creating order for user:', uid);

        // Gateway Call with Browser Headers
        const gatewayApiUrl = `${BASE_URL}/api/qr.php?api_key=${API_KEY}&amount=${amount}&redirect_url=${encodeURIComponent(REDIRECT_URL)}&webhook_url=${encodeURIComponent(WEBHOOK_URL)}`;

        const response = await fetch(gatewayApiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ FamGateway Error:', errorText);
            throw new Error(`Gateway response error: HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ FamGateway Response:', data);

        if (data.status === 'success' && data.data) {
            const orderId = data.data.order_id;
            
            try {
                // Firebase Database Entry
                await set(ref(db, `orders/${orderId}`), {
                    order_id: orderId,
                    user_uid: uid,
                    amount: parseFloat(amount),
                    mobile: mobile || 'N/A',
                    status: 'pending',
                    payable_amount: data.data.payable_amount || amount,
                    created_at: new Date().toISOString()
                });

                await set(ref(db, `user_orders/${uid}/${orderId}`), {
                    order_id: orderId,
                    amount: parseFloat(amount),
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            } catch (dbError) {
                console.error('❌ Firebase DB Sync Warning:', dbError);
            }

            return res.status(200).json({
                success: true,
                checkout_url: data.data.checkout_url || `${BASE_URL}/checkout.php?order_id=${orderId}`,
                order_id: orderId,
                qr_url: data.data.qr_url,
                payable_amount: data.data.payable_amount
            });
        } else {
            return res.status(500).json({
                error: data.message || 'Failed to create payment order'
            });
        }
    } catch (error) {
        console.error('❌ Payment Handler Error:', error);
        return res.status(500).json({
            error: 'Payment gateway error: ' + error.message
        });
    }
};
