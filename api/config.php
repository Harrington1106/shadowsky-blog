<?php
// Prevent accidental output from config file
if (!defined('CONFIG_LOADED')) {
    define('CONFIG_LOADED', true);
} else {
    return;
}

// 从 .env 文件读取配置（优先于硬编码默认值）
function loadEnvConfig() {
    $env_path = __DIR__ . '/../.env';
    if (!file_exists($env_path)) return;
    $lines = @file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) return;
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            if (!empty($val) && !isset($_ENV[$key])) {
                $_ENV[$key] = $val;
                putenv("$key=$val");
            }
        }
    }
}
loadEnvConfig();

// 数据库配置 - 优先从环境变量读取，回退到默认值
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'shadowsky_blog');
define('DB_USER', getenv('DB_USER') ?: 'shadowsky_blog');
define('DB_PASS', getenv('DB_PASS') ?: '');

function getDBConnection() {
    if (DB_HOST === 'YOUR_DB_HOST_OR_IP' || DB_PASS === '') {
        return null;
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
            PDO::ATTR_TIMEOUT => 5
        ];
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (Throwable $e) {
        error_log("DB Connection Error: " . $e->getMessage());
        return null;
    }
}

// Bangumi 配置 - 优先从环境变量读取
define('BANGUMI_TOKEN', getenv('BANGUMI_TOKEN') ?: '');
define('BANGUMI_USERNAME', getenv('BANGUMI_USERNAME') ?: '');
