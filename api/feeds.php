<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// 数据存储路径
$file_path = '../data/user_feeds.json';

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 读取订阅列表
    if (file_exists($file_path)) {
        echo file_get_contents($file_path);
    } else {
        // 如果用户数据不存在，尝试读取默认配置作为初始数据
        // 注意：根据实际部署情况，这里可能需要调整路径
        $default_path = '../public/data/feeds.json';
        if (file_exists($default_path)) {
            echo file_get_contents($default_path);
        } else {
            echo "[]";
        }
    }
} elseif ($method === 'POST') {
    // 保存订阅列表
    $input = file_get_contents('php://input');
    
    // 验证 JSON
    $data = json_decode($input);
    if ($data === null) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON"]);
        exit;
    }
    
    // 写入文件
    if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(["status" => "success"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to write file"]);
    }
}
?>
