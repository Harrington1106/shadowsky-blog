<?php
/**
 * Security Verification Endpoint
 * 
 * Used by deploy_test.html to verify CORS and Auth configuration.
 */

// 1. Load CORS configuration
require_once 'cors.php';

// 2. Load Auth configuration
require_once 'auth.php';

header('Content-Type: application/json');

// 3. Verify Authentication
// This function will exit with 401 if the token is missing or invalid.
require_admin_token();

// 4. Return Success Response
echo json_encode([
    'status' => 'success',
    'message' => 'Security Check Passed: You are authorized and allowed by CORS.',
    'debug' => [
        'origin_received' => $_SERVER['HTTP_ORIGIN'] ?? 'null',
        'cors_env_configured' => !empty(getenv('CORS_ALLOWED_ORIGINS')),
        'auth_method' => 'Token'
    ]
]);
?>