<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'cors.php';
require_once 'auth.php';
require_admin_token();

$settingsFile = __DIR__ . '/settings.json';
$mediaFile = __DIR__ . '/../public/data/media.json';

// 1. Get Configuration
$username = '';
$token = '';

if (file_exists($settingsFile)) {
    $settings = json_decode(file_get_contents($settingsFile), true);
    if (!empty($settings['bangumi_username'])) $username = $settings['bangumi_username'];
    if (!empty($settings['bangumi_token'])) $token = $settings['bangumi_token'];
}

if (empty($username)) {
    http_response_code(400);
    echo json_encode(['error' => 'Bangumi username not configured']);
    exit;
}

// Helper Function
function fetchBgm($path, $token) {
    $url = "https://api.bgm.tv/v0" . $path;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'ShadowSky/1.0 (Refreshed)');
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    if ($token) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer $token",
            "Accept: application/json"
        ]);
    }
    
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return ['error' => "HTTP $httpCode", 'body' => $res];
    }
    
    return json_decode($res, true);
}

// 2. Fetch Data (All Types)
$types = [1,2,3,4,5];
$animeData = [];
$mangaData = [];
foreach ($types as $t) {
    $a = fetchBgm("/users/$username/collections?subject_type=2&type=$t&limit=50", $token);
    if (isset($a['data']) && is_array($a['data'])) {
        foreach ($a['data'] as $item) { $item['_type'] = $t; $animeData[] = $item; }
    }
    $m = fetchBgm("/users/$username/collections?subject_type=1&type=$t&limit=50", $token);
    if (isset($m['data']) && is_array($m['data'])) {
        foreach ($m['data'] as $item) { $item['_type'] = $t; $mangaData[] = $item; }
    }
}

// 3. Transform Data
$newMedia = [
    'anime' => [],
    'manga' => []
];

// Process Anime
foreach ($animeData as $item) {
    $subject = $item['subject'];
    $type = isset($item['_type']) ? intval($item['_type']) : 3;
    $statusMap = [1 => 'plan', 2 => 'completed', 3 => 'watching', 4 => 'on_hold', 5 => 'dropped'];
    $bgmStatusMap = [1 => 'wish', 2 => 'collect', 3 => 'do', 4 => 'on_hold', 5 => 'dropped'];
    $status = isset($statusMap[$type]) ? $statusMap[$type] : 'watching';
    $newMedia['anime'][] = [
        'id' => (string)$subject['id'],
        'title' => $subject['name_cn'] ?: $subject['name'],
        'cover' => $subject['images']['large'] ?? ($subject['images']['common'] ?? ''),
        'progress' => intval($item['ep_status'] ?? 0),
        'total' => isset($subject['eps']) ? $subject['eps'] : (isset($subject['vols']) ? $subject['vols'] : '?'),
        'status' => $status,
        'bgm_status' => isset($bgmStatusMap[$type]) ? $bgmStatusMap[$type] : 'do',
        'tag' => 'Bangumi'
    ];
}

// Process Manga
foreach ($mangaData as $item) {
    $subject = $item['subject'];
    $type = isset($item['_type']) ? intval($item['_type']) : 3;
    $statusMap = [1 => 'plan', 2 => 'completed', 3 => 'reading', 4 => 'on_hold', 5 => 'dropped'];
    $bgmStatusMap = [1 => 'wish', 2 => 'collect', 3 => 'do', 4 => 'on_hold', 5 => 'dropped'];
    $status = isset($statusMap[$type]) ? $statusMap[$type] : 'reading';
    $newMedia['manga'][] = [
        'id' => (string)$subject['id'],
        'title' => $subject['name_cn'] ?: $subject['name'],
        'cover' => $subject['images']['large'] ?? ($subject['images']['common'] ?? ''),
        'progress' => intval($item['ep_status'] ?? 0),
        'volume' => isset($item['vol_status']) ? ('Vol.' . $item['vol_status']) : '',
        'total' => isset($subject['vols']) ? $subject['vols'] : (isset($subject['eps']) ? $subject['eps'] : '?'),
        'status' => $status,
        'bgm_status' => isset($bgmStatusMap[$type]) ? $bgmStatusMap[$type] : 'do',
        'tag' => 'Bangumi'
    ];
}

// 4. Save
$dir = dirname($mediaFile);
if (!is_dir($dir)) mkdir($dir, 0777, true);

if (file_put_contents($mediaFile, json_encode($newMedia, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode([
        'success' => true, 
        'count_anime' => count($newMedia['anime']), 
        'count_manga' => count($newMedia['manga'])
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write media.json']);
}
