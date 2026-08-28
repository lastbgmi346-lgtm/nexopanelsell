// File: /api/create-order.js

export default async function handler(req, res) {
  try {
    const API_KEY = 'fam_2a9c0077d8c7d9e26f93fa6116ddfefc72eea8dc';
    const BASE_URL = 'https://famgateway.in';
    const MY_WEBSITE = 'https://nexopanelsell.vercel.app';

    // Amount aur order_id query se lo
    const amount = req.query.amount || 100;
    const orderId = req.query.order_id || 'ORD_' + Date.now();

    console.log('📝 Creating order:', { amount, orderId });

    // ✅ Step 1: FamGateway se payment order create karo
    const apiUrl = `${BASE_URL}/api/create-order.php`;
    
    const requestBody = {
        amount: parseFloat(amount),
        redirect_url: `${MY_WEBSITE}/success.html`,
        order_id: orderId,
        webhook_url: `${MY_WEBSITE}/api/webhook`
    };

    console.log('📤 Sending to FamGateway:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // ✅ Check if response is OK
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FamGateway API Error:', response.status, errorText);
        throw new Error(`FamGateway API returned ${response.status}: ${errorText}`);
    }

    // ✅ Parse JSON response
    let json;
    try {
        json = await response.json();
    } catch (e) {
        const text = await response.text();
        console.error('❌ Invalid JSON response:', text);
        throw new Error('FamGateway returned invalid response');
    }

    console.log('📱 FamGateway Response:', JSON.stringify(json, null, 2));

    // ✅ Step 2: Agar success hai toh checkout page pe redirect
    if (json.status === 'success' && json.data) {
      // ✅ FamGateway ka checkout page URL
      const checkoutUrl = json.data.checkout_url || `${BASE_URL}/pay/${json.data.order_id || orderId}`;
      
      console.log('🔗 Redirecting to:', checkoutUrl);
      
      // ✅ Direct redirect to checkout page
      return res.redirect(302, checkoutUrl);
    }

    // ❌ Agar error hai toh
    console.error('❌ FamGateway Error Response:', json);
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
