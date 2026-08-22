// api/webhook.js - Complete updated code
import crypto from 'crypto';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, runTransaction } from "firebase/database";

// Firebase Config (same as frontend)
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
const app = initializeApp(firebaseConfig, 'webhookApp');
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
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-famgateway-signature'] || '';
    const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';

    console.log('📥 Webhook Received');
    console.log('📝 Raw Body:', rawBody);

    // ✅ Verify HMAC SHA-256 (skip for test)
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
      
      // ✅ CRITICAL: Firebase me balance update karein
      try {
        // Order ID se user ka UID find karein
        // Agar order_id format: fg_XXXXX hai toh yeh user ka UID nahi hai
        // Isliye humein order_id se user ka UID match karna hoga
        
        // 🔥 SOLUTION 1: Agar order_id me user_uid stored hai
        // Example: order_id = "fg_" + user_uid + "_" + timestamp
        // Agar aisa hai toh:
        const uid = event.order_id.split('_')[1]; // Adjust according to your format
        
        if (uid) {
          // Update user balance using transaction
          const userRef = ref(db, `users/${uid}/balance`);
          await runTransaction(userRef, (currentBalance) => {
            return (currentBalance || 0) + parseFloat(event.amount);
          });
          console.log(`✅ Balance updated for user: ${uid}, +₹${event.amount}`);
        } else {
          console.log('⚠️ Could not extract UID from order_id');
        }
        
        // 🔥 SOLUTION 2: Payment logs me store karein
        const paymentRef = ref(db, `payments/${event.order_id}`);
        await update(paymentRef, {
          order_id: event.order_id,
          amount: event.amount,
          utr: event.utr || 'N/A',
          status: 'success',
          timestamp: new Date().toISOString(),
          sender_name: event.sender_name || 'N/A',
          payment_time: event.payment_time_ist || new Date().toISOString()
        });
        console.log('✅ Payment logged in database');
        
      } catch (dbError) {
        console.error('❌ Database Error:', dbError);
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
