<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Debug log function
function feeds_debug_log($msg) {
    $log_path = dirname(__FILE__) . '/../public/data/feeds_debug.log';
    @file_put_contents($log_path, date('[Y-m-d H:i:s] ') . $msg . "\n", FILE_APPEND);
}

try {
    // feeds_debug_log("feeds.php accessed. Method: " . $_SERVER['REQUEST_METHOD']);

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-admin-token, x-adminkey");
        exit(0);
    }

    // Buffer output
    if (function_exists('ob_start')) ob_start();

    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-admin-token, x-adminkey");
    header("Content-Type: application/json; charset=UTF-8");

    $file = dirname(__FILE__) . '/../public/data/feeds.json';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Load Auth Module Only for POST
        $auth_file = dirname(__FILE__) . '/auth.php';
        if (file_exists($auth_file)) {
            require_once $auth_file;
        } else {
            throw new Exception("Auth module missing");
        }

        // SECURITY: Require Admin Token for Writes
        if (function_exists('require_admin_token')) {
            require_admin_token();
        } else {
            throw new Exception("Auth function missing");
        }

        $data = file_get_contents('php://input');
        $json = json_decode($data);
        
        if ($json !== null) {
            $dir = dirname($file);
            if (!is_dir($dir)) {
                if (!@mkdir($dir, 0755, true)) {
                    throw new Exception("Failed to create directory");
                }
            }
            
            if (@file_put_contents($file, $data, LOCK_EX) !== false) {
                echo json_encode(['success' => true]);
            } else {
                throw new Exception("Failed to write file");
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
        }
    } else {
        // GET logic
        if (file_exists($file)) {
            $content = @file_get_contents($file);
            if ($content === false) {
                echo '[]';
            } else {
                echo $content;
            }
        } else {
            echo '[]';
        }
    }
    
    // Flush buffer
    if (function_exists('ob_end_flush')) ob_end_flush();

} catch (Throwable $e) {
    feeds_debug_log("Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    if (!headers_sent()) {
        http_response_code(500);
        header("Content-Type: application/json");
    }
    echo json_encode(['error' => $e->getMessage()]);
}
?>