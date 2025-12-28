<?php
/**
 * Visit Counter API
 * Compatible with api/stats.php storage (shadowsky_stats)
 */

// 1. Error Reporting (Enable for debugging 500 errors)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 2. Compatibility & Dependencies
// Standard Environment (Aliyun/VPS)
if (!defined('__DIR__')) define('__DIR__', dirname(__FILE__));

$db_helper = __DIR__ . '/db_helper.php';
if (!file_exists($db_helper)) {
    header("HTTP/1.1 500 Internal Server Error");
    echo '{"success":false,"error":"Database helper missing"}';
    exit;
}
require_once $db_helper;

// 3. CORS Headers
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = array(
    'https://shadowquake.top',
    'https://www.shadowquake.top',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
);

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://shadowquake.top");
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-admin-token");
header("Access-Control-Allow-Credentials: true");
header("Vary: Origin");

// 4. Preflight Handling
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // Uses shim from db_helper if PHP < 5.4
    header("Content-Length: 0");
    exit(0);
}

// 5. Set Content-Type
header("Content-Type: application/json; charset=UTF-8");

// 6. Handle Input
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputJSON = file_get_contents('php://input');
    if ($inputJSON) {
        $input = json_decode($inputJSON, true);
        if (isset($input['page'])) {
            $_GET['page'] = $input['page'];
        } elseif (isset($input['url'])) {
            $parsedUrl = parse_url($input['url']);
            if (isset($parsedUrl['path'])) {
                 $path = trim($parsedUrl['path'], '/');
                 $_GET['page'] = $path ? $path : 'home';
            }
        }
    }
}

// 7. Main Logic
try {
    // Initialize DB
    $db = new KVDB('shadowsky_stats');
    $KEY_LOGS = 'visit_logs';
    $KEY_STATS = 'visit_stats';

    $pageId = isset($_GET['page']) ? $_GET['page'] : 'home';
    // Sanitize pageId
    $pageId = preg_replace('/[^a-zA-Z0-9_\-\.\/]/', '', $pageId);
    if (!$pageId) $pageId = 'home';

    // Load Data
    $statsRaw = $db->get($KEY_STATS);
    $stats = $statsRaw ? json_decode($statsRaw, true) : null;
    
    $logsRaw = $db->get($KEY_LOGS);
    $logs = $logsRaw ? json_decode($logsRaw, true) : array();
    if (!is_array($logs)) $logs = array();

    // Migration
    if (!$stats) {
        if (function_exists('initStatsFromLogs')) {
            $stats = initStatsFromLogs($logs);
        } else {
            $stats = array('total' => 0, 'daily' => array(), 'pages' => array());
        }
    }

    // Update Stats
    $stats['total'] = isset($stats['total']) ? $stats['total'] + 1 : 1;
    
    $today = date('Y-m-d');
    if (!isset($stats['daily'][$today])) $stats['daily'][$today] = 0;
    $stats['daily'][$today]++;
    
    if (!isset($stats['pages'][$pageId])) $stats['pages'][$pageId] = 0;
    $stats['pages'][$pageId]++;
    
    // Prune Stats (Keep size manageable for KV limit)
    if (count($stats['daily']) > 365) {
        ksort($stats['daily']);
        $stats['daily'] = array_slice($stats['daily'], -365, null, true);
    }
    if (count($stats['pages']) > 200) {
        arsort($stats['pages']);
        $stats['pages'] = array_slice($stats['pages'], 0, 200, true);
    }
    
    // Update Logs
    $newLog = array(
        'time' => date('c'),
        'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
        'ua' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : '',
        'page' => $pageId
    );
    
    $logs[] = $newLog;
    if (count($logs) > 50) {
        $logs = array_slice($logs, -50);
    }
    
    // Save
    $db->set($KEY_STATS, json_encode($stats));
    $db->set($KEY_LOGS, json_encode($logs));
    
    // Response
    echo json_encode(array(
        'success' => true,
        'data' => array(
            'page' => $pageId,
            'count' => $stats['pages'][$pageId],
            'total_site_visits' => $stats['total'],
            'mode' => 'kv_unified'
        )
    ));

} catch (Exception $e) {
    // Log error but also try to show it in JSON for debugging
    error_log("Visit API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => $e->getMessage()));
}
?>
