<?php
// webhook.php - Webhook Handler

require_once 'FamGateway.php';

// ✅ Allow CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $API_KEY = 'fam_2a9c0077d8c7d9e26f93fa6116ddfefc72eea8dc';
    
    $fam = new FamGateway($API_KEY);

    $rawPostData = file_get_contents('php://input');
    $signature = $_SERVER['HTTP_X_FAMGATEWAY_SIGNATURE'] ?? '';

    // ✅ Verify webhook
    $data = $fam->verifyWebhook($rawPostData, $signature);

    if ($data !== false) {
        if ($data['event'] === 'payment.success') {
            $orderId = $data['order_id'];
            $amount = $data['amount'];
            $utr = $data['utr'] ?? 'N/A';

            // ✅ Log
            error_log("✅ Payment Success: Order $orderId, Amount ₹$amount, UTR: $utr");

            http_response_code(200);
            echo "Webhook processed successfully.";
        } else {
            http_response_code(200);
            echo "Event ignored.";
        }
    } else {
        http_response_code(403);
        echo "Invalid signature!";
    }
} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
?>
