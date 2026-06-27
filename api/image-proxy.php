<?php
header("Access-Control-Allow-Origin: *");
header("Cache-Control: public, max-age=86400");

$url = $_GET["url"] ?? "";
if (!$url || !preg_match("/^https?:\/\//", $url)) {
    http_response_code(400); die("Invalid URL");
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_USERAGENT => "Mozilla/5.0",
    CURLOPT_REFERER => "",
]);
$data = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($code !== 200 || !$data) { http_response_code(502); die("Proxy failed"); }
header("Content-Type: $type");
echo $data;
