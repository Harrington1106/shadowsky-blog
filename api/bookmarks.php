<?php
require_once 'auth.php'; // Import Auth Module

// Prevent any previous output
ob_start();

require_once 'cors.php';
header("Content-Type: application/json");

// Clean buffer
ob_clean();

// Load Database Helper
$db_helper = __DIR__ . '/db_helper.php';
if (!file_exists($db_helper)) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => 'Database helper missing'));
    exit;
}
require_once $db_helper;

// Initialize DB
$db = new KVDB('shadowsky_data');
$KEY_BOOKMARKS = 'bookmarks';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = $db->get($KEY_BOOKMARKS);
    if ($data) {
        // KV DB stores strings, ensure it's valid JSON
        $decoded = json_decode($data, true);
        echo $decoded ? $data : $data; // Return raw if not JSON or decoded successfully
    } else {
        echo "[]";
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // SECURITY: Require Admin Token for Writes
    require_admin_token();

    $input = json_decode(file_get_contents('php://input'), true);
    
    // Support two modes: 
    // 1. Array (Save all bookmarks - Admin Dashboard style)
    // 2. Single Object (Add one bookmark - API style)
    
    if (is_array($input) && isset($input[0])) {
        // Mode 1: Bulk Save
        $jsonStr = json_encode($input, JSON_UNESCAPED_UNICODE);
        // db_helper now handles LOCK_EX internally
        if ($db->set($KEY_BOOKMARKS, $jsonStr) !== false) {
            echo json_encode(array('success' => true, 'count' => count($input)));
        } else {
            http_response_code(500);
            echo json_encode(array('error' => 'Failed to save data'));
        }
        exit;
    }

    // Mode 2: Add Single (Legacy logic, but authenticated now)
    if (!isset($input['url'])) {
        http_response_code(400);
        echo json_encode(array('error' => 'URL is required'));
        exit;
    }

    $raw = $db->get($KEY_BOOKMARKS);
    $bookmarks = $raw ? json_decode($raw, true) : array();
    if (!is_array($bookmarks)) $bookmarks = array();

    // Generate ID if missing
    $newBookmark = array(
        'id' => isset($input['id']) ? $input['id'] : uniqid('bm_'),
        'url' => $input['url'],
        'title' => isset($input['title']) ? $input['title'] : 'New Bookmark',
        'category' => isset($input['category']) ? $input['category'] : 'Uncategorized',
        'desc' => isset($input['desc']) ? $input['desc'] : '',
        'icon' => isset($input['icon']) ? $input['icon'] : '',
        'created_at' => time()
    );

    // Add to beginning
    array_unshift($bookmarks, $newBookmark);

    $jsonStr = json_encode($bookmarks, JSON_UNESCAPED_UNICODE);
    $db->set($KEY_BOOKMARKS, $jsonStr);

    echo json_encode(array('success' => true, 'bookmark' => $newBookmark));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // UPDATE
    require_admin_token();
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('error' => 'ID is required'));
        exit;
    }

    $raw = $db->get($KEY_BOOKMARKS);
    $bookmarks = $raw ? json_decode($raw, true) : array();
    
    $found = false;
    foreach ($bookmarks as &$bm) {
        if ($bm['id'] === $input['id']) {
            // Update fields
            if (isset($input['title'])) $bm['title'] = $input['title'];
            if (isset($input['url'])) $bm['url'] = $input['url'];
            if (isset($input['category'])) $bm['category'] = $input['category'];
            if (isset($input['desc'])) $bm['desc'] = $input['desc'];
            if (isset($input['icon'])) $bm['icon'] = $input['icon'];
            $found = true;
            break;
        }
    }

    if ($found) {
        $db->set($KEY_BOOKMARKS, json_encode($bookmarks, JSON_UNESCAPED_UNICODE));
        echo json_encode(array('success' => true));
    } else {
        http_response_code(404);
        echo json_encode(array('error' => 'Bookmark not found'));
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    require_admin_token();
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(array('error' => 'ID is required'));
        exit;
    }

    $raw = $db->get($KEY_BOOKMARKS);
    $bookmarks = $raw ? json_decode($raw, true) : array();
    
    $newBookmarks = array();
    $found = false;
    foreach ($bookmarks as $bm) {
        if ($bm['id'] !== $id) {
            $newBookmarks[] = $bm;
        } else {
            $found = true;
        }
    }

    if ($found) {
        $db->set($KEY_BOOKMARKS, json_encode($newBookmarks, JSON_UNESCAPED_UNICODE));
        echo json_encode(array('success' => true));
    } else {
        http_response_code(404);
        echo json_encode(array('error' => 'Bookmark not found'));
    }
    exit;
}
?>