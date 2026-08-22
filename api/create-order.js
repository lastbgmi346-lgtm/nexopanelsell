// api/create-order.js
import crypto from 'crypto';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, push } from "firebase/database";

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

// ✅ Firebase Initialize
const app = initializeApp(firebaseConfig, 'createOrderApp');
const db = getDatabase(app);

export default async function handler(req, res) {
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
        const { amount, mobile, uid } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        if (!uid) {
            return res.status(400).json({ error: 'User UID required' });
        }

        const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';
        const BASE_URL = 'https://famgateway.in';
        const REDIRECT_URL = 'https://nexopanelsell.vercel.app/success';
        const WEBHOOK_URL = 'https://nexopanelsell.vercel.app/api/webhook';

        console.log('📤 Creating order for user:', uid);
        console.log('💰 Amount:', amount);
        console.log('📱 Mobile:', mobile);

        // Step 1: Create order via FamGateway
        const response = await fetch(
            `${BASE_URL}/api/qr.php?api_key=${API_KEY}&amount=${amount}&redirect_url=${encodeURIComponent(REDIRECT_URL)}&webhook_url=${encodeURIComponent(WEBHOOK_URL)}`
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ FamGateway Error:', errorText);
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ FamGateway Response:', data);

        if (data.status === 'success' && data.data) {
            const orderId = data.data.order_id;
            
            // ✅ Store order in Firebase with user UID
            try {
                const orderRef = ref(db, `orders/${orderId}`);
                await set(orderRef, {
                    order_id: orderId,
                    user_uid: uid,
                    amount: parseFloat(amount),
                    mobile: mobile || 'N/A',
                    status: 'pending',
                    payable_amount: data.data.payable_amount || amount,
                    created_at: new Date().toISOString(),
                    expires_at: data.data.expires_at_ist || 'N/A'
                });
                console.log('✅ Order stored in Firebase');

                // ✅ Also store in user's orders
                const userOrderRef = ref(db, `user_orders/${uid}/${orderId}`);
                await set(userOrderRef, {
                    order_id: orderId,
                    amount: parseFloat(amount),
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
                console.log('✅ User order stored');
            } catch (dbError) {
                console.error('❌ Firebase Error:', dbError);
                // Continue even if Firebase fails
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
        console.error('❌ Payment Error:', error);
        return res.status(500).json({
            error: 'Payment gateway error: ' + error.message
        });
    }
}
