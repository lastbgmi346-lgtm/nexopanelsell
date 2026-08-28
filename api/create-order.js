// File: /api/create-order.js

export default async function handler(req, res) {
  try {
    const API_KEY = 'fam_2a9c0077d8c7d9e26f93fa6116ddfefc72eea8dc';
    const BASE_URL = 'https://famgateway.in';
    const MY_WEBSITE = 'https://nexopanelsell.vercel.app';

    // Amount aur order_id query se lo
    const amount = req.query.amount || 100;
    const orderId = req.query.order_id || 'ORD_' + Date.now();

    // ✅ Step 1: FamGateway se payment order create karo
    const apiUrl = `${BASE_URL}/api/create-order.php`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        redirect_url: `${MY_WEBSITE}/success.html`,
        order_id: orderId,
        webhook_url: `${MY_WEBSITE}/api/webhook`
      })
    });

    const json = await response.json();
    console.log('📱 FamGateway Response:', json);

    // ✅ Step 2: Agar success hai toh checkout page pe redirect
    if (json.status === 'success' && json.data) {
      // ✅ FamGateway ka checkout page URL
      const checkoutUrl = json.data.checkout_url || `${BASE_URL}/pay/${json.data.order_id}`;
      
      console.log('🔗 Redirecting to:', checkoutUrl);
      
      // ✅ Direct redirect to checkout page
      return res.redirect(302, checkoutUrl);
    }

    // ❌ Agar error hai toh
    return res.status(400).json({
      status: 'error',
      message: json.message || 'Payment gateway error'
    });

  } catch (error) {
    console.error('❌ Order creation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error: ' + error.message
    });
  }
}
