// api/webhook.js
import crypto from 'crypto';

export default async function handler(req, res) {
  // Only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-famgateway-signature'];
    const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';

    // ===== HMAC SHA-256 Signature Verification =====
    const expectedSignature = crypto
      .createHmac('sha256', API_KEY)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    if (!signature || !crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )) {
      console.log('❌ Invalid signature received');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified successfully');

    // Parse the webhook event
    const event = req.body;
    console.log('📥 Webhook Event:', JSON.stringify(event, null, 2));

    // ===== Handle payment.success event =====
    if (event.event === 'payment.success') {
      const { order_id, transaction_id, amount, utr, sender_name, payment_time_ist } = event;

      console.log(`💳 PAYMENT SUCCESSFUL!`);
      console.log(`📋 Order ID: ${order_id}`);
      console.log(`💰 Amount: ₹${amount}`);
      console.log(`🔢 UTR: ${utr}`);
      console.log(`👤 Sender: ${sender_name}`);
      console.log(`🕐 Time: ${payment_time_ist}`);

      // ===== UPDATE YOUR DATABASE HERE =====
      // Firebase Realtime Database update example:
      // const db = getDatabase();
      // await update(ref(db, `purchases/${order_id}`), {
      //   keyStatus: 'delivered',
      //   transaction_id: transaction_id,
      //   utr: utr,
      //   paymentVerified: true,
      //   paymentTime: payment_time_ist
      // });

      // Or mark order as paid in your database
      // await markOrderAsPaid(order_id, utr, amount);

      return res.status(200).json({
        status: 'success',
        message: 'Payment recorded successfully',
        order_id: order_id
      });
    } else {
      console.log(`ℹ️ Ignored event type: ${event.event}`);
      return res.status(200).json({ status: 'ignored', event: event.event });
    }
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed: ' + error.message
    });
  }
}
