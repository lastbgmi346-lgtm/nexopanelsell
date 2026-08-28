<?php
// pay.php - Payment Generator

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
    $MY_WEBSITE = 'https://nexopanelsell.vercel.app'; // Vercel frontend

    $amount = $_GET['amount'] ?? $_POST['amount'] ?? 100;
    $orderId = $_GET['order_id'] ?? $_POST['order_id'] ?? 'ORD_' . time();
    $redirectUrl = $MY_WEBSITE . '/success.html';
    $webhookUrl = 'https://nexopanelsell.vercel.app/api/webhook';

    // ✅ Initialize FamGateway
    $fam = new FamGateway($API_KEY);

    // ✅ Create payment and redirect
    $fam->createPayment($amount, $redirectUrl, $webhookUrl);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
