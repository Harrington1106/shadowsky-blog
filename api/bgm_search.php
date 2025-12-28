<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_admin_token();

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
$typeParam = isset($_GET['type']) ? trim($_GET['type']) : '';
if ($q === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing q']);
    exit;
}

$subjectType = 2;
if ($typeParam === '1' || strtolower($typeParam) === 'manga') $subjectType = 1;
if ($typeParam === '2' || strtolower($typeParam) === 'anime') $subjectType = 2;

$url = 'https://api.bgm.tv/v0/search/subjects?keyword=' . urlencode($q) . '&type=' . $subjectType . '&limit=12';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'ShadowSky/Admin');

$settingsPath = __DIR__ . '/settings.json';
$token = '';
if (file_exists($settingsPath)) {
    $settings = json_decode(file_get_contents($settingsPath), true);
    if (isset($settings['bangumi_token'])) $token = $settings['bangumi_token'];
}
if (!empty($token)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token,
        'Accept: application/json'
    ]);
}

$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => curl_error($ch)]);
    curl_close($ch);
    exit;
}
curl_close($ch);

if ($code !== 200) {
    http_response_code($code);
    echo $resp;
    exit;
}

echo $resp;
?>
