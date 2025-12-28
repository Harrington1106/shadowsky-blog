<?php
require_once 'auth.php'; // Import Auth Module

// Prevent any previous output
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-admin-token, x-adminkey");
header("Content-Type: application/json; charset=UTF-8");

// Clean buffer
ob_clean();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$file = '../public/data/notice.json';

// Default Notice Structure
$default_notice = [
    'content' => '',
    'show' => false,
    'updated_at' => 0
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // SECURITY: Require Admin Token for Writes
    require_admin_token();

    $input = file_get_contents('php://input');
    $json = json_decode($input, true);

    if ($json !== null) {
        // Validation
        $data = [
            'content' => strip_tags($json['content'] ?? ''), // Basic XSS prevention
            'show' => (bool)($json['show'] ?? false),
            'style' => $json['style'] ?? 'info',
            'updated_at' => time()
        ];

        // Ensure directory exists
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        // Atomic Write
        if (file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX)) {
            echo json_encode(['success' => true, 'data' => $data]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to write file']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
    }
} else {
    // GET request (Public)
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo json_encode($default_notice);
    }
}
?>
