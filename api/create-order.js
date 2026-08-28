// File: /api/create-order.js

export default async function handler(req, res) {
  try {
    const API_KEY = 'fam_2a9c0077d8c7d9e26f93fa6116ddfefc72eea8dc';
    const BASE_URL = 'https://famgateway.in';
    const MY_WEBSITE = 'https://nexopanelsell.vercel.app';

    const amount = req.query.amount || 100;
    const redirectUrl = `${MY_WEBSITE}/success.html`;

    // 1. Server-to-server API Call
    const apiReqUrl = `${BASE_URL}/api/qr.php?api_key=${encodeURIComponent(API_KEY)}&amount=${amount}&redirect_url=${encodeURIComponent(redirectUrl)}`;
    
    const response = await fetch(apiReqUrl);
    const json = await response.json();

    // 2. Main Fix: Direct Redirect (Raw JSON display hone se rokega)
    if (json.status === 'success' && json.data && json.data.checkout_url) {
      return res.redirect(302, json.data.checkout_url);
    } else {
      return res.status(400).json({ status: 'error', message: json.message || 'Checkout URL not generated' });
    }
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}
