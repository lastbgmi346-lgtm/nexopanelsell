<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Request payload read karein
$input = json_decode(file_get_contents('php://input'), true);
$amount = isset($input['amount']) ? floatval($input['amount']) : 0;

if ($amount <= 0) {
    echo json_encode(["status" => false, "message" => "Invalid amount"]);
    exit;
}

$apiKey = "fam_7faeee60ef2a8fee0b90811fdaab21623582dbe5";

// Current protocol & host detect karke redirect URL setup karein
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$currentUrl = $protocol . "://" . $_SERVER['HTTP_HOST'];
$redirectUrl = $currentUrl . "/#history"; // Payment complete hone par "My Keys" redirect hoga

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://famgateway.in/api/create-order.php",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    "amount" => $amount,
    "redirect_url" => $redirectUrl
  ]),
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer " . $apiKey,
    "Content-Type: application/json"
  ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);
curl_close($curl);

if ($err) {
    echo json_encode(["status" => false, "message" => "cURL Error: " . $err]);
} else {
    echo $response;
}
?>
