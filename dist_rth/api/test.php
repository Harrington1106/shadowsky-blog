<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$ver = 'unknown';
if (defined('PHP_VERSION')) {
    $ver = PHP_VERSION;
} elseif (function_exists('phpversion')) {
    $ver = phpversion();
}

echo json_encode(array(
    "status" => "ok",
    "message" => "PHP is working",
    "version" => $ver,
    "time" => date('Y-m-d H:i:s')
));
?>
