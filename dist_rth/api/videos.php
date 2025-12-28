<?php
// Prevent any previous output
ob_start();
require_once __DIR__ . '/auth.php';

require_once 'cors.php';
header("Content-Type: application/json; charset=UTF-8");

// Clean buffer
ob_clean();

$file = '../public/data/videos.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_token();
    $data = file_get_contents('php://input');
    $json = json_decode($data);
    if ($json !== null) {
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        if (file_put_contents($file, $data)) {
            echo json_encode(['status' => 'success']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to write file']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
    }
} else {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo '{"videos": []}';
    }
}
?>
