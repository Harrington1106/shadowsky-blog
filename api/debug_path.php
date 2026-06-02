<?php
header("Content-Type: text/plain");
echo "PHP Version: " . phpversion() . "\n";
echo "File: " . __FILE__ . "\n";
echo "Dir: " . __DIR__ . "\n";
echo "CWD: " . getcwd() . "\n";
echo "Files in CWD:\n";
$files = scandir(getcwd());
foreach ($files as $file) {
    echo $file . "\n";
}
?>