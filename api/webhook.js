// api/webhook.js
import crypto from 'crypto';

export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-FamGateway-Signature');

  // ✅ Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-famgateway-signature'];
    const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';

    console.log('📥 Webhook Received');
    console.log('📝 Raw Body:', rawBody);
    console.log('🔑 Signature:', signature);

    // ✅ Verify HMAC SHA-256
    const expectedSignature = crypto
      .createHmac('sha256', API_KEY)
      .update(rawBody)
      .digest('hex');

    if (!signature || !crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )) {
      console.log('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    const event = req.body;
    
    if (event.event === 'payment.success') {
      console.log('💳 PAYMENT SUCCESS!');
      console.log(`Order: ${event.order_id}, Amount: ₹${event.amount}, UTR: ${event.utr}`);
      
      return res.status(200).json({
        status: 'success',
        message: 'Payment recorded'
      });
    }

    return res.status(200).json({ status: 'ignored' });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
