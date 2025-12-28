<?php
/**
 * CORS Configuration for Private Server
 * 
 * Determines which origins are allowed to access the Private Server APIs.
 * 
 * PHP 5.x Compatible (No short array syntax, no null coalescing)
 */

// 1. Get Allowed Origins
// Allow main domain and local testing
$allowed_origins = array(
    'https://shadowquake.top',
    'http://shadowquake.top',
    'http://localhost:3000',
    'http://localhost:5500'
);

// Also allow direct IP access if needed
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    // Allow any origin during debugging phase
    header("Access-Control-Allow-Origin: " . $origin);
} else {
    header("Access-Control-Allow-Origin: *");
}

// 2. Handle CORS Headers
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-admin-token");
header("Access-Control-Allow-Credentials: true");
header("Vary: Origin");

// 3. Handle Preflight Requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Make sure we exit cleanly with 204 No Content (Standard)
    if (function_exists('http_response_code')) {
        http_response_code(204);
    } else {
        $protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
        header($protocol . ' 204 No Content');
    }
    header("Content-Length: 0");
    exit(0);
}
?>