<?php
header("Content-Type: text/plain; charset=utf-8");
header("Access-Control-Allow-Origin: *");

echo "=== ShadowSky Environment Check ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
$ver = 'unknown';
if (defined('PHP_VERSION')) $ver = PHP_VERSION;
elseif (function_exists('phpversion')) $ver = phpversion();
echo "PHP Version: " . $ver . "\n";
echo "Server Software: " . (isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'Unknown') . "\n";
echo "Current File: " . __FILE__ . "\n";
echo "Current Dir: " . dirname(__FILE__) . "\n";

echo "\n--- Function Support ---\n";
echo "json_encode: " . (function_exists('json_encode') ? 'YES' : 'NO') . "\n";
echo "http_response_code: " . (function_exists('http_response_code') ? 'YES' : 'NO') . "\n";
echo "file_get_contents: " . (function_exists('file_get_contents') ? 'YES' : 'NO') . "\n";

echo "\n--- Class Support ---\n";
echo "Database (Retinbox Native): " . (class_exists('Database') ? 'YES' : 'NO') . "\n";

echo "\n--- Write Permissions ---\n";
$parent_dir = dirname(dirname(__FILE__));
$data_dir = $parent_dir . '/data';
echo "Root Dir: " . $parent_dir . "\n";
echo "Root Writable: " . (is_writable($parent_dir) ? 'YES' : 'NO') . "\n";
echo "Data Dir Expected: " . $data_dir . "\n";
echo "Data Dir Exists: " . (file_exists($data_dir) ? 'YES' : 'NO') . "\n";
if (file_exists($data_dir)) {
    echo "Data Dir Writable: " . (is_writable($data_dir) ? 'YES' : 'NO') . "\n";
}

echo "\n--- Dependency Check ---\n";
$db_helper = dirname(__FILE__) . '/db_helper.php';
echo "db_helper.php: " . (file_exists($db_helper) ? 'YES' : 'NO') . "\n";

echo "\n=== End Check ===\n";
?>
