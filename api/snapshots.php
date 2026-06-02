<?php
// Prevent any previous output
ob_start();
require_once __DIR__ . '/auth.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

// Clean buffer
ob_clean();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Preserve existing file path to ensure frontend works
$file = __DIR__ . '/../public/data/moments.json';
$uploadDir = __DIR__ . '/../public/img/snapshots/';

// Ensure upload directory exists
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo "[]";
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_token();
    $data = [];
    $imageUrl = null;
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    // Unified input handling: Support both JSON and POST/Multipart
    if (strpos($contentType, 'application/json') !== false) {
        // Handle JSON
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);
        
        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            exit;
        }
        $data = $input;
        // Check for image URL in JSON
        if (isset($data['imageUrl'])) $imageUrl = $data['imageUrl'];
        if (isset($data['image'])) $imageUrl = $data['image'];
    } else {
        // Handle Form Data (POST)
        $data = $_POST;
        
        // Handle File Upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
            $filename = 'snapshot_' . time() . '.' . $ext;
            $targetFile = $uploadDir . $filename;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $targetFile)) {
                $imageUrl = '/public/img/snapshots/' . $filename; 
            }
        }
    }

    // "Loose" logic: Extract what we can, don't 400 if something is missing.
    $content = $data['content'] ?? '';
    $location = $data['location'] ?? '';
    // Handle tags (string or array)
    $tags = [];
    if (isset($data['tags'])) {
        if (is_array($data['tags'])) {
            $tags = $data['tags'];
        } else {
            $tags = explode(',', $data['tags']);
        }
    }

    // Construct the moment object (preserving data structure)
    $newMoment = [
        'id' => 'snap-' . time(),
        'date' => gmdate('Y-m-d\TH:i:s\Z'),
        'content' => $content,
        'image' => $imageUrl,
        'location' => $location,
        'tags' => $tags,
        'fromAdmin' => true
    ];

    // Load existing
    $moments = [];
    if (file_exists($file)) {
        $moments = json_decode(file_get_contents($file), true);
        if (!is_array($moments)) $moments = [];
    }

    // Prepend new moment
    array_unshift($moments, $newMoment);

    // Save
    if (file_put_contents($file, json_encode($moments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['success' => true, 'moment' => $newMoment]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write data file']);
    }
    exit;
}
