<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'cors.php';
require_once 'auth.php';
require_admin_token();

$settingsFile = __DIR__ . '/settings.json';

if (file_exists($settingsFile)) {
    echo file_get_contents($settingsFile);
} else {
    echo json_encode([]);
}
