// api/webhook.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, runTransaction, update, get, set } from "firebase/database";

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

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const event = req.body;
        console.log('📥 Webhook Received:', JSON.stringify(event, null, 2));

        // ✅ Payment success event
        if (event.status === 'success' || event.event === 'payment.success') {
            const orderId = event.order_id || event.orderId || event.data?.order_id;
            const amount = parseFloat(event.amount || event.data?.amount || 0);
            const utr = event.utr || event.transaction_id || event.data?.utr || 'N/A';

            console.log(`💳 PAYMENT SUCCESS! Order: ${orderId}, Amount: ₹${amount}`);

            if (!orderId) {
                console.warn('⚠️ No order_id in webhook');
                return res.status(200).json({ status: 'ignored', message: 'No order_id' });
            }

            // ✅ STEP 1: Get user_uid from orders
            let userUid = null;
            try {
                const orderSnap = await get(ref(db, `orders/${orderId}`));
                if (orderSnap.exists()) {
                    const orderData = orderSnap.val();
                    userUid = orderData.user_uid;
                    console.log(`👤 Found user_uid: ${userUid} from orders`);
                }
            } catch (e) {
                console.warn('⚠️ Could not fetch order:', e.message);
            }

            // ✅ STEP 2: If not found, search in user_orders
            if (!userUid) {
                try {
                    const userOrdersSnap = await get(ref(db, 'user_orders'));
                    if (userOrdersSnap.exists()) {
                        const allUserOrders = userOrdersSnap.val();
                        for (const [uid, orders] of Object.entries(allUserOrders)) {
                            if (orders && orders[orderId]) {
                                userUid = uid;
                                console.log(`👤 Found user_uid: ${userUid} from user_orders`);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Could not fetch user_orders:', e.message);
                }
            }

            // ✅ STEP 3: Update balance if user_uid found
            if (userUid && amount > 0) {
                try {
                    const balanceRef = ref(db, `users/${userUid}/balance`);
                    const result = await runTransaction(balanceRef, (currentBalance) => {
                        return (currentBalance || 0) + amount;
                    });

                    if (result.committed) {
                        console.log(`✅ Balance updated for ${userUid}: +₹${amount}`);
                        console.log(`💰 New Balance: ₹${result.snapshot.val()}`);
                    }

                    // ✅ Update order status
                    await update(ref(db, `orders/${orderId}`), {
                        status: 'completed',
                        utr: utr,
                        verified_at: new Date().toISOString()
                    });

                    // ✅ Update user order
                    await update(ref(db, `user_orders/${userUid}/${orderId}`), {
                        status: 'completed',
                        utr: utr,
                        verified_at: new Date().toISOString()
                    });

                    // ✅ Store in payments
                    await set(ref(db, `payments/${orderId}`), {
                        order_id: orderId,
                        user_uid: userUid,
                        amount: amount,
                        utr: utr,
                        status: 'success',
                        received_at: new Date().toISOString()
                    });

                    return res.status(200).json({
                        status: 'success',
                        message: 'Payment processed successfully',
                        user_uid: userUid,
                        new_balance: result.snapshot.val()
                    });

                } catch (err) {
                    console.error('❌ Balance update failed:', err);
                    return res.status(500).json({ error: 'Balance update failed' });
                }
            } else {
                console.warn(`⚠️ No user_uid found for order: ${orderId}`);
                
                // ✅ Store in unassigned payments
                await set(ref(db, `unassigned_payments/${orderId}`), {
                    order_id: orderId,
                    amount: amount,
                    utr: utr,
                    received_at: new Date().toISOString(),
                    raw_event: event
                });

                return res.status(200).json({
                    status: 'unassigned',
                    message: 'Payment recorded but user not found',
                    order_id: orderId
                });
            }
        } else {
            console.log(`ℹ️ Ignored event: ${event.event || 'unknown'}`);
            return res.status(200).json({ status: 'ignored', event: event.event });
        }
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        return res.status(500).json({
            error: 'Webhook processing failed: ' + error.message
        });
    }
}
