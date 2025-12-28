<?php
/**
 * ShadowSky Authentication Module
 * 
 * Implements Token-based authentication compatible with Node.js Admin Server.
 * Reads token from environment variable 'ADMIN_TOKEN' or config fallback.
 * 
 * Usage:
 * require_once 'auth.php';
 * require_admin_token(); // Will exit with 401 if unauthorized
 */

// 1. Get Token from Environment or Config
function get_server_admin_token() {
    $env_token = getenv('ADMIN_TOKEN');
    if ($env_token !== false && $env_token !== '') {
        return $env_token;
    }
    $env_path = __DIR__ . '/../.env';
    if (file_exists($env_path)) {
        $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), 'ADMIN_TOKEN=') === 0) {
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $val = trim($parts[1]);
                    if (!empty($val)) return $val;
                }
            }
        }
    }
    return '';
}

// 2. Validate Request Token
function require_admin_token() {
    // Only protect write methods (POST, PUT, DELETE) by default?
    // Or protect everything? The prompt asks for protecting specific endpoints.
    // We'll let the endpoint call this function when needed.
    
    $server_token = get_server_admin_token();
    
    if (empty($server_token)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Server misconfiguration: ADMIN_TOKEN not set']);
        exit;
    }
    
    $client_token = '';
    
    // Check Header: x-admin-token (Standard) or x-adminkey (Legacy)
    $headers = array_change_key_case(getallheaders(), CASE_LOWER);
    if (isset($headers['x-admin-token'])) {
        $client_token = $headers['x-admin-token'];
    } elseif (isset($headers['x-adminkey'])) {
        $client_token = $headers['x-adminkey'];
    }
    
    // Constant-time comparison to prevent timing attacks
    if (!hash_equals($server_token, $client_token)) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized: Invalid Token']);
        exit;
    }
}

// Polyfill for getallheaders() on Nginx/FPM if missing
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}
?>
