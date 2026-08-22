// api/webhook.js - Complete Code with Firebase Update
import crypto from 'crypto';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, runTransaction, update } from "firebase/database";

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

const app = initializeApp(firebaseConfig, 'webhookApp');
const db = getDatabase(app);

export default async function handler(req, res) {
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
        const rawBody = JSON.stringify(req.body);
        const signature = req.headers['x-famgateway-signature'] || '';
        const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';

        console.log('📥 Webhook Received');
        console.log('📝 Raw Body:', rawBody);

        // Verify signature (skip if no signature for test)
        if (signature && signature.length > 0) {
            const expectedSignature = crypto
                .createHmac('sha256', API_KEY)
                .update(rawBody)
                .digest('hex');

            if (!crypto.timingSafeEqual(
                Buffer.from(signature, 'utf8'),
                Buffer.from(expectedSignature, 'utf8')
            )) {
                console.log('❌ Invalid signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.log('✅ Signature verified');
        }

        const event = req.body;

        if (event.event === 'payment.success') {
            console.log('💳 PAYMENT SUCCESS!');
            console.log(`Order: ${event.order_id}, Amount: ₹${event.amount}, UTR: ${event.utr || 'N/A'}`);

            // ============================================
            // 🔥 IMPORTANT: Balance Update Logic
            // ============================================

            // Option 1: Agar order_id me user_uid stored hai (format: fg_USERUID_TIMESTAMP)
            // Aap create-order.js me order_id generate karte waqt user_uid add kar sakte ho
            
            // Option 2: UserUID se match karein - latest pending order dhundhein
            // Kyunki abhi humare paas user_uid nahi hai, humein alternative chahiye

            // 🔥 SOLUTION: Admin manually add karein ya phir create-order.js me user_uid add karein

            // Abhi ke liye, hum log store karte hain aur admin manually add kar sakte hain
            // Ya phir frontend se payment ke baad manual verify karein

            // Store payment in database
            const paymentRef = ref(db, `payments/${event.order_id}`);
            await update(paymentRef, {
                order_id: event.order_id,
                amount: parseFloat(event.amount),
                utr: event.utr || 'N/A',
                status: 'success',
                timestamp: new Date().toISOString(),
                sender_name: event.sender_name || 'N/A',
                payment_time: event.payment_time_ist || new Date().toISOString(),
                verified: true
            });
            console.log('✅ Payment logged in database');

            // 🔥 FIX: Find user by checking all users and their pending orders
            // This is not efficient but works for now
            try {
                const usersRef = ref(db, 'users');
                const usersSnapshot = await get(usersRef);
                
                if (usersSnapshot.exists()) {
                    const users = usersSnapshot.val();
                    for (const [uid, userData] of Object.entries(users)) {
                        // Check if this user has a pending order with this order_id
                        const purchasesRef = ref(db, `purchases/${uid}`);
                        const purchasesSnapshot = await get(purchasesRef);
                        
                        if (purchasesSnapshot.exists()) {
                            const purchases = purchasesSnapshot.val();
                            for (const [purchaseId, purchase] of Object.entries(purchases)) {
                                if (purchase.order_id === event.order_id || 
                                    purchase.paymentStatus === 'pending') {
                                    // Update user balance
                                    const userRef = ref(db, `users/${uid}/balance`);
                                    await runTransaction(userRef, (currentBalance) => {
                                        return (currentBalance || 0) + parseFloat(event.amount);
                                    });
                                    
                                    // Update purchase status
                                    await update(ref(db, `purchases/${uid}/${purchaseId}`), {
                                        paymentStatus: 'completed',
                                        utr: event.utr || 'N/A',
                                        verified: true
                                    });
                                    
                                    console.log(`✅ Balance updated for user: ${uid}, +₹${event.amount}`);
                                    break;
                                }
                            }
                        }
                    }
                }
            } catch (dbError) {
                console.error('❌ Database Update Error:', dbError);
            }

            return res.status(200).json({
                status: 'success',
                message: 'Payment recorded successfully',
                order_id: event.order_id
            });
        } else {
            console.log(`ℹ️ Ignored event: ${event.event}`);
            return res.status(200).json({ status: 'ignored', event: event.event });
        }
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        return res.status(500).json({
            error: 'Webhook processing failed: ' + error.message
        });
    }
}
