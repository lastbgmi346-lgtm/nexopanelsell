// api/verify-payment.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, runTransaction } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDES_57EvH2ao97UKgLkbuKQA71NXB5CM0",
    authDomain: "nexo-store-6d494.firebaseapp.com",
    databaseURL: "https://nexo-store-6d494-default-rtdb.firebaseio.com",
    projectId: "nexo-store-6d494",
    storageBucket: "nexo-store-6d494.firebasestorage.app",
    messagingSenderId: "1077591470608",
    appId: "1:1077591470608:web:78022588f0fd1e4aa15095"
};

const app = initializeApp(firebaseConfig, 'verifyApp');
const db = getDatabase(app);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { order_id, uid } = req.query;

        if (!order_id) {
            return res.status(400).json({ error: 'order_id required' });
        }
        if (!uid) {
            return res.status(400).json({ error: 'uid required' });
        }

        const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';
        const BASE_URL = 'https://famgateway.in';

        // ✅ Step 1: FamGateway se payment status check karo
        const response = await fetch(
            `${BASE_URL}/api/verify-order.php?api_key=${API_KEY}&order_id=${order_id}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ FamGateway Verify Response:', data);

        // ✅ Step 2: Agar payment success hai toh balance update karo
        if (data.status === 'success') {
            const amount = parseFloat(data.data?.amount || data.amount || 0);
            
            if (amount > 0) {
                const balanceRef = ref(db, `users/${uid}/balance`);
                const result = await runTransaction(balanceRef, (currentBalance) => {
                    return (currentBalance || 0) + amount;
                });

                if (result.committed) {
                    console.log(`✅ Balance updated for ${uid}: +₹${amount}`);
                    
                    // ✅ Order status update
                    await fetch(`https://nexo-store-6d494-default-rtdb.firebaseio.com/orders/${order_id}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: 'completed',
                            utr: data.data?.utr || 'N/A',
                            verified_at: new Date().toISOString()
                        })
                    });

                    return res.status(200).json({
                        success: true,
                        message: 'Payment verified and balance updated',
                        newBalance: result.snapshot.val(),
                        amount: amount
                    });
                }
            }
        }

        return res.status(200).json({
            success: false,
            status: data.status || 'pending',
            message: data.message || 'Payment not verified yet'
        });
    } catch (error) {
        console.error('❌ Verify Error:', error);
        return res.status(500).json({
            error: 'Verification failed: ' + error.message
        });
    }
}
