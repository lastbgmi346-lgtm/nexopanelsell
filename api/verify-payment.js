// api/verify-payment.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({ error: 'order_id required' });
  }

  const API_KEY = process.env.FAMGATEWAY_API_KEY || 'fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5';
  const BASE_URL = 'https://famgateway.in';

  try {
    // Poll FamGateway to verify payment
    const response = await fetch(
      `${BASE_URL}/api/verify-order.php?api_key=${API_KEY}&order_id=${order_id}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Verify Response:', data);

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Verify Error:', error);
    return res.status(500).json({
      error: 'Failed to verify payment: ' + error.message
    });
  }
}
