<?php
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/cors.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_admin_token();

$id = isset($_GET['id']) ? trim($_GET['id']) : '';
if ($id === '' || !preg_match('/^\d+$/', $id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid subject id']);
    exit;
}

$settingsPath = __DIR__ . '/settings.json';
$token = '';
if (file_exists($settingsPath)) {
    $settings = json_decode(file_get_contents($settingsPath), true);
    if (isset($settings['bangumi_token'])) $token = $settings['bangumi_token'];
}

$url = 'https://api.bgm.tv/v0/subjects/' . $id;
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'ShadowSky/Admin');
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

if (!empty($token)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token,
        'Accept: application/json'
    ]);
}

$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_errno($ch) ? curl_error($ch) : '';
curl_close($ch);

if ($err) {
    http_response_code(500);
    echo json_encode(['error' => $err]);
    exit;
}

if ($code !== 200) {
    http_response_code($code);
    echo $resp ?: json_encode(['error' => 'Request failed', 'status' => $code]);
    exit;
}

echo $resp;
?>
