<?php
header("Content-Type: text/plain");
echo "=== Environment Check ===\n";
echo "Server IP: " . $_SERVER['SERVER_ADDR'] . "\n";
echo "Host: " . $_SERVER['HTTP_HOST'] . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "User: " . get_current_user() . "\n";
echo "Visit API Exists: " . (file_exists(__DIR__ . '/visit.php') ? 'YES' : 'NO') . "\n";
echo "Core DB Exists: " . (file_exists(__DIR__ . '/core_db.php') ? 'YES' : 'NO') . "\n";
echo "Data Dir Writable: " . (is_writable(__DIR__ . '/data') ? 'YES' : 'NO') . "\n";
?>
