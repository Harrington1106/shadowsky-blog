<?php
// Mock $_GET
$_GET['page'] = 'index';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_USER_AGENT'] = 'TestAgent';

// Capture output
ob_start();
require 'api/visit.php';
$output = ob_get_clean();

echo "Output:\n" . $output . "\n";
?>
