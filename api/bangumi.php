<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Load dynamic configuration if available
$username = defined('BANGUMI_USERNAME') ? BANGUMI_USERNAME : '';
$token = defined('BANGUMI_TOKEN') ? BANGUMI_TOKEN : '';

// Prefer unified settings.json as the single source of truth
$settingsFile = __DIR__ . '/settings.json';
if (file_exists($settingsFile)) {
    $settings = json_decode(file_get_contents($settingsFile), true);
    if (!empty($settings['bangumi_username'])) {
        $username = $settings['bangumi_username'];
    }
    if (isset($settings['bangumi_token'])) {
        $token = $settings['bangumi_token'];
    }
} else {
    // Fallback to legacy bangumi_config.json if settings.json is absent
    $configFile = __DIR__ . '/bangumi_config.json';
    if (file_exists($configFile)) {
        $config = json_decode(file_get_contents($configFile), true);
        if (isset($config['username']) && !empty($config['username'])) {
            $username = $config['username'];
        }
        if (isset($config['token'])) {
            $token = $config['token'];
        }
    }
}

// Check configuration
if (empty($username)) {
    echo json_encode(['error' => 'Bangumi username not configured']);
    exit;
}

// Cache configuration
$cacheFile = __DIR__ . '/bangumi_cache.json';
$cacheTime = 3600; // 1 hour

// Check cache
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    $data = file_get_contents($cacheFile);
    if ($data) {
        echo $data;
        exit;
    }
}

function fetchUrl($url, $token = '') {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'ShadowSky/1.0 (https://github.com/shadowsky)');
    
    if (!empty($token)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            "Accept: application/json"
        ]);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        return ['error' => curl_error($ch)];
    }
    
    curl_close($ch);

    if ($httpCode !== 200) {
        return ['error' => "API returned $httpCode", 'body' => json_decode($response, true)];
    }

    return json_decode($response, true);
}

function fetchCollection($username, $subjectType, $collectionType, $token, $limit = 30) {
    $url = "https://api.bgm.tv/v0/users/{$username}/collections?subject_type={$subjectType}&type={$collectionType}&limit={$limit}";
    return fetchUrl($url, $token);
}

// 1. User Profile
$userProfile = fetchUrl("https://api.bgm.tv/v0/users/{$username}", $token);

// 2. Anime: Watching (Type 3)
$animeWatching = fetchCollection($username, 2, 3, $token, 12);

// 3. Anime: Completed (Type 2) - Limit to 6 for recent history
$animeCompleted = fetchCollection($username, 2, 2, $token, 6);

// 4. Anime: Wish (Type 1)
$animeWish = fetchCollection($username, 2, 1, $token, 12);

// 5. Manga: Reading (Type 3)
$mangaReading = fetchCollection($username, 1, 3, $token, 12);

// 6. Manga: Wish (Type 1)
$mangaWish = fetchCollection($username, 1, 1, $token, 12);

// 5. Calendar (Daily Schedule) - Public endpoint
$calendar = fetchUrl("https://api.bgm.tv/calendar");

$result = [
    'updated_at' => time(),
    'user' => $userProfile,
    'anime_watching' => $animeWatching['data'] ?? [],
    'anime_completed' => $animeCompleted['data'] ?? [],
    'anime_wish' => $animeWish['data'] ?? [],
    'manga_reading' => $mangaReading['data'] ?? [],
    'manga_wish' => $mangaWish['data'] ?? [],
    'calendar' => $calendar ?? []
];

// Save cache
file_put_contents($cacheFile, json_encode($result));

echo json_encode($result);
