<?php
/**
 * Stats/Visit Tracking API
 * Uses Retiehe KV Database when available, falls back to local files
 */

// 1. Error Reporting (Enable for debugging)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 2. Compatibility
if (!defined('__DIR__')) define('__DIR__', dirname(__FILE__));

// 3. Load Dependencies
require_once __DIR__ . '/db_helper.php';
require_once __DIR__ . '/cors.php';

// Disable error display again to avoid breaking JSON output (unless debugging)
// ini_set('display_errors', 0); // Keep enabled for now to see 500 cause
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Initialize DB
$db = new KVDB('shadowsky_stats');
$KEY_LOGS = 'visit_logs';
$KEY_STATS = 'visit_stats';

// Handle export/import actions
$action = isset($_GET['action']) ? $_GET['action'] : '';

// POST: Record visit or import data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        $data = array('action' => 'record');
    }
    
    $action = isset($data['action']) ? $data['action'] : 'record';
    
    if ($action === 'import') {
        // Import data (restore from backup)
        if (isset($data['stats'])) {
             $db->set($KEY_STATS, json_encode($data['stats']));
        }
        if (isset($data['logs']) && is_array($data['logs'])) {
            $db->set($KEY_LOGS, json_encode($data['logs']));
        }
        
        echo json_encode(array('success' => true, 'message' => 'Data imported successfully'));
        exit;
    }
    
    if ($action === 'record') {
        $newLog = array(
            'time' => date('c'),
            'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
            'ua' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : '',
            'page' => isset($data['page']) ? $data['page'] : 'unknown',
            'referer' => isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : ''
        );
        
        // 1. Load Logs
        $logsRaw = $db->get($KEY_LOGS);
        $logs = $logsRaw ? json_decode($logsRaw, true) : array();
        if (!is_array($logs)) $logs = array();
        
        // 2. Load Stats
        $statsRaw = $db->get($KEY_STATS);
        $stats = $statsRaw ? json_decode($statsRaw, true) : null;
        
        // Migration if stats missing (helper from db_helper.php)
        if (!$stats) {
            $stats = initStatsFromLogs($logs);
        }
        
        // 3. Update Stats
        $stats['total'] = isset($stats['total']) ? $stats['total'] + 1 : 1;
        
        $today = date('Y-m-d');
        if (!isset($stats['daily'][$today])) $stats['daily'][$today] = 0;
        $stats['daily'][$today]++;
        
        $page = $newLog['page'];
        if (!isset($stats['pages'][$page])) $stats['pages'][$page] = 0;
        $stats['pages'][$page]++;
        
        // Prune Stats
        if (count($stats['daily']) > 365) {
            ksort($stats['daily']);
            $stats['daily'] = array_slice($stats['daily'], -365, null, true);
        }
        if (count($stats['pages']) > 200) {
            arsort($stats['pages']);
            $stats['pages'] = array_slice($stats['pages'], 0, 200, true);
        }
        
        // 4. Update Logs (Limit to 50 to fit in 64KB KV limit)
        $logs[] = $newLog;
        if (count($logs) > 50) {
            $logs = array_slice($logs, -50);
        }
        
        // 5. Save
        $db->set($KEY_STATS, json_encode($stats));
        $db->set($KEY_LOGS, json_encode($logs));
        
        echo json_encode(array(
            'success' => true, 
            'data' => array(
                'page' => $page,
                'count' => $stats['pages'][$page],
                'total_site_visits' => $stats['total']
            )
        ));
        exit;
    }
}

// GET: Retrieve stats
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Basic Auth or Token Check for Admin Access
    $headers = getallheaders();
    $isAdmin = false;
    
    // Very basic check - in production use proper auth middleware
    if (isset($headers['x-admin-token']) || isset($_COOKIE['admin_token'])) {
        $isAdmin = true; 
    }
    
    // Load Stats
    $statsRaw = $db->get($KEY_STATS);
    $stats = $statsRaw ? json_decode($statsRaw, true) : null;
    
    if (!$stats) {
        $logsRaw = $db->get($KEY_LOGS);
        $logs = $logsRaw ? json_decode($logsRaw, true) : array();
        $stats = initStatsFromLogs($logs);
    }
    
    if ($isAdmin) {
        // Admin gets full stats
        echo json_encode(array('success' => true, 'data' => $stats));
    } else {
        // Public gets only simple counts
        $page = isset($_GET['page']) ? $_GET['page'] : 'home';
        echo json_encode(array(
            'success' => true, 
            'data' => array(
                'total' => $stats['total'],
                'page_count' => isset($stats['pages'][$page]) ? $stats['pages'][$page] : 0
            )
        ));
    }
    exit;
}
?>