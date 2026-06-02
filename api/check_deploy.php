<?php
header("Content-Type: text/plain");
echo "Files in " . __DIR__ . ":\n";
$files = scandir(__DIR__);
foreach ($files as $file) {
    echo $file . "\n";
}
echo "\nFile Exists Check:\n";
echo "visit.php: " . (file_exists(__DIR__ . '/visit.php') ? "YES" : "NO") . "\n";
echo "core_db.php: " . (file_exists(__DIR__ . '/core_db.php') ? "YES" : "NO") . "\n";
?>