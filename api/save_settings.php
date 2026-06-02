<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'cors.php';
require_once 'auth.php';
require_admin_token();

$settingsFile = __DIR__ . '/settings.json';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['bangumi_username'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing bangumi_username']);
    exit;
}

// Load existing settings if any
$settings = [];
if (file_exists($settingsFile)) {
    $settings = json_decode(file_get_contents($settingsFile), true) ?: [];
}

// Update settings
$settings['bangumi_username'] = trim($input['bangumi_username']);
if (isset($input['bangumi_token'])) {
    $settings['bangumi_token'] = trim($input['bangumi_token']);
}

// Save back to file
if (file_put_contents($settingsFile, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save settings']);
}
