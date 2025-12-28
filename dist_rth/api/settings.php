<?php
// Prevent any previous output
ob_start();
require_once __DIR__ . '/auth.php';

// Error reporting
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-admin-token');
header('Content-Type: application/json; charset=utf-8');

// Clean buffer
ob_clean();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Use the file that is likely used by the frontend
// The user suggested 'settings.json', we will use that to be consistent with their request
// but we check if we should migrate or fallback.
// For "minimal fix", we just use settings.json as requested.
$file = __DIR__ . '/settings.json';

// Handle POST request to save settings
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_token();
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    // Loose validation: just check if it is a valid JSON array/object
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    // Save exactly what was sent
    file_put_contents(
        $file,
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );

    echo json_encode(['success' => true]);
    exit;
}

// Handle GET request to read settings
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        // Fallback to empty object or defaults if needed
        // We can try to read the old config if settings.json doesn't exist
        $oldConfig = __DIR__ . '/bangumi_config.json';
        if (file_exists($oldConfig)) {
             echo file_get_contents($oldConfig);
        } else {
             echo json_encode([]);
        }
    }
    exit;
}
