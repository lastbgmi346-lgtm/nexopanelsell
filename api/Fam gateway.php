<?php
// FamGateway.php - PHP SDK

class FamGateway
{
    private $apiKey;
    private $baseUrl = "https://famgateway.in";

    public function __construct($apiKey)
    {
        $this->apiKey = $apiKey;
    }

    public function createPayment($amount, $redirectUrl = '', $webhookUrl = '')
    {
        $url = $this->baseUrl . "/api/qr.php?api_key=" . urlencode($this->apiKey)
             . "&amount=" . urlencode((string)$amount);

        if ($redirectUrl) {
            $url .= "&redirect_url=" . urlencode($redirectUrl);
        }
        if ($webhookUrl) {
            $url .= "&webhook_url=" . urlencode($webhookUrl);
        }

        $response = @file_get_contents($url);
        if ($response === false) {
            die("FamGateway Error: Failed to connect to API.");
        }

        $data = json_decode($response, true);

        if (isset($data['status']) && $data['status'] === 'success') {
            $checkoutUrl = $data['data']['checkout_url'];
            header("Location: " . $checkoutUrl);
            exit;
        } else {
            $error = $data['message'] ?? 'Unknown error';
            die("FamGateway Error: " . htmlspecialchars($error));
        }
    }

    public function verifyWebhook($rawPostData, $signature)
    {
        if (!$rawPostData || !$signature) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $rawPostData, $this->apiKey);

        if (hash_equals($expectedSignature, $signature)) {
            return json_decode($rawPostData, true);
        }

        return false;
    }
}
