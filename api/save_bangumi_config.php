<?php
require_once 'auth.php';
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-admin-token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Verify Admin Token
require_admin_token();

// Get input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['username']) || empty(trim($input['username']))) {
    http_response_code(400);
    echo json_encode(['error' => 'Bangumi Username is required']);
    exit;
}

$config = [
    'username' => trim($input['username']),
    'token' => isset($input['token']) ? trim($input['token']) : '',
    'updated_at' => time()
];

// Save to config file
$configFile = __DIR__ . '/bangumi_config.json';
if (file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT))) {
    // Clear cache to ensure immediate update
    $cacheFile = __DIR__ . '/bangumi_cache.json';
    if (file_exists($cacheFile)) {
        unlink($cacheFile);
    }
    
    echo json_encode(['success' => true, 'message' => 'Configuration saved successfully']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write configuration file']);
}
