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

// Adjust path as needed. Assuming api/ is at root/api and data is at root/public/data
$file = '../public/data/feeds.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // SECURITY: Require Admin Token for Writes
    require_admin_token();

    $data = file_get_contents('php://input');
    // Basic validation
    $json = json_decode($data);
    if ($json !== null) {
        // Ensure directory exists
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        // Use exclusive lock to prevent race conditions (Fix D-04)
        if (file_put_contents($file, $data, LOCK_EX)) {
            echo json_encode(['success' => true]);
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
        echo '[]';
    }
}
?>
