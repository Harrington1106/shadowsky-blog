<?php
// Prevent accidental output from config file
if (!defined('CONFIG_LOADED')) {
    define('CONFIG_LOADED', true);
} else {
    return;
}

// 数据库配置
// 请在部署时修改为您的实际数据库信息
// 建议：使用阿里云服务器作为数据库主机，因为它更稳定

define('DB_HOST', 'localhost'); // 在服务器本地运行，使用 localhost 最稳定
define('DB_PORT', '3306');
define('DB_NAME', 'shadowsky_blog');
define('DB_USER', 'shadowsky_blog');
define('DB_PASS', 'hX8wzW4mYCpjFCB3');

function getDBConnection() {
    // 检查配置是否已填写
    if (DB_HOST === 'YOUR_DB_HOST_OR_IP') {
        return null; // 未配置，返回 null 以便回退到文件模式
    }

    try {
        if (!class_exists('PDO')) {
            error_log("PDO class not found. Please enable php_pdo_mysql extension.");
            return null;
        }

        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5 // 5秒连接超时
        ];
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (Throwable $e) {
        // 连接失败 (可能是网络不通或密码错误)
        error_log("DB Connection Error: " . $e->getMessage());
        return null;
    }
}

// Bangumi Configuration
define('BANGUMI_TOKEN', 'x7LMqEPLDaml222OUBVHJEZI9BHxfnUa4LuVzb6u'); // 填入你的 Bangumi Access Token
define('BANGUMI_USERNAME', '563355'); // 填入你的 Bangumi 用户名
