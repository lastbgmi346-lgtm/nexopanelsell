// File: /api/create-order.js

export default async function handler(req, res) {
  try {
    const API_KEY = 'fam_2a9c0077d8c7d9e26f93fa6116ddfefc72eea8dc';
    const BASE_URL = 'https://famgateway.in';
    const MY_WEBSITE = 'https://nexopanelsell.vercel.app';

    // Amount ko query se lo, default 100
    const amount = req.query.amount || 100;
    const redirectUrl = `${MY_WEBSITE}/success.html`;

    // 🔥 STEP 1: Direct QR API call for UPI intent
    const qrApiUrl = `${BASE_URL}/api/qr.php?api_key=${encodeURIComponent(API_KEY)}&amount=${amount}&redirect_url=${encodeURIComponent(redirectUrl)}`;
    
    const response = await fetch(qrApiUrl);
    const json = await response.json();

    console.log('📱 FamGateway QR Response:', json);

    // 🔥 STEP 2: Agar success hai toh direct UPI intent ya checkout URL pe redirect
    if (json.status === 'success' && json.data) {
      // ✅ Option 1: Agar upi_intent available hai toh direct UPI app open karo
      if (json.data.upi_intent) {
        return res.redirect(302, json.data.upi_intent);
      }
      
      // ✅ Option 2: Agar checkout_url available hai toh wahan redirect
      if (json.data.checkout_url) {
        return res.redirect(302, json.data.checkout_url);
      }
      
      // ✅ Option 3: Agar qr_url hai toh usko HTML me embed karo
      if (json.data.qr_url) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment - Nexo Store</title>
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              * { margin:0; padding:0; box-sizing:border-box; }
              body {
                background: #030305;
                color: #fff;
                font-family: 'Poppins', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-image: radial-gradient(circle at 15% 15%, rgba(0, 240, 255, 0.08) 0%, transparent 40%);
              }
              .payment-box {
                background: rgba(12,16,26,0.9);
                padding: 40px 30px;
                border-radius: 20px;
                text-align: center;
                border: 1px solid #00f0ff;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 0 30px rgba(0, 240, 255, 0.2);
              }
              .payment-box h1 {
                font-family: 'Orbitron', sans-serif;
                color: #00f0ff;
                font-size: 20px;
                margin-bottom: 10px;
              }
              .payment-box p { color: #8b949e; font-size: 13px; margin-bottom: 20px; }
              .qr-container {
                background: #fff;
                padding: 15px;
                border-radius: 12px;
                display: inline-block;
                margin: 15px auto;
              }
              .qr-container img {
                max-width: 250px;
                height: auto;
                display: block;
              }
              .btn {
                display: inline-block;
                padding: 14px 30px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: 700;
                font-size: 13px;
                text-transform: uppercase;
                transition: all 0.3s;
                margin: 8px 4px;
                cursor: pointer;
                border: none;
              }
              .btn-primary {
                background: linear-gradient(135deg, #00f0ff, #0088ff);
                color: #000;
                box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
              }
              .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 0 30px rgba(0, 240, 255, 0.5);
              }
              .btn-outline {
                background: transparent;
                border: 1px solid rgba(255,255,255,0.2);
                color: #fff;
              }
              .btn-outline:hover {
                border-color: #00f0ff;
                background: rgba(0, 240, 255, 0.1);
              }
              .upi-intent-btn {
                background: linear-gradient(135deg, #00ff66, #00cc55);
                color: #000;
                box-shadow: 0 0 20px rgba(0, 255, 102, 0.3);
              }
              .upi-intent-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 0 30px rgba(0, 255, 102, 0.5);
              }
              .order-info {
                background: rgba(0,0,0,0.3);
                padding: 12px;
                border-radius: 10px;
                margin: 15px 0;
                font-size: 13px;
              }
              .order-info span { color: #00f0ff; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="payment-box">
              <h1>💳 PAYMENT</h1>
              <p>Scan QR code or use UPI to complete payment</p>
              
              <div class="order-info">
                Order: <span>${json.data.order_id || 'N/A'}</span><br>
                Amount: <span>₹${json.data.amount || amount}</span>
              </div>
              
              <div class="qr-container">
                <img src="${json.data.qr_url}" alt="UPI QR Code">
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                ${json.data.upi_intent ? `<a href="${json.data.upi_intent}" class="btn upi-intent-btn"><i class="fas fa-bolt"></i> PAY WITH UPI APP</a>` : ''}
                <a href="/" class="btn btn-outline"><i class="fas fa-home"></i> Back to Store</a>
              </div>
              
              <p style="font-size: 11px; color: #8b949e; margin-top: 15px;">
                <i class="fas fa-shield-alt"></i> Secure payment via FamGateway
              </p>
            </div>
          </body>
          </html>
        `);
      }
    }

    // 🔥 Agar kuch bhi nahi mila toh error
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
