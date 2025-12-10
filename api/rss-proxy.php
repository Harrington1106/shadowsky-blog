<?php
// 允许跨域访问
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// 获取 URL 参数
$url = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($url)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing URL parameter"]);
    exit;
}

// 简单的 URL 验证
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid URL"]);
    exit;
}

// 尝试获取内容
// 设置 User-Agent 避免被某些服务器拒绝
$options = [
    "http" => [
        "method" => "GET",
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36\r\n"
    ]
];
$context = stream_context_create($options);

// 抑制错误输出，自己处理
$content = @file_get_contents($url, false, $context);

if ($content === FALSE) {
    // 尝试获取最后的错误信息
    $error = error_get_last();
    http_response_code(502);
    echo json_encode([
        "error" => "Failed to fetch URL",
        "details" => $error ? $error['message'] : "Unknown error"
    ]);
    exit;
}

// 保持与 allorigins 兼容的返回格式
echo json_encode(["contents" => $content]);
?>
