<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<div style='font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 2rem; border: 1px solid #ddd; border-radius: 8px;'>";
echo "<h1>🛠️ 数据库自动初始化工具</h1>";

// Check config
if (DB_HOST === 'YOUR_ALIYUN_PUBLIC_IP') {
    die("<p style='color:red; font-weight:bold;'>⚠️ 错误：请先在 api/config.php 文件中填写您的阿里云公网 IP。</p></div>");
}

try {
    // 1. Try to connect without DB name first
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
    echo "<p style='color:green'>✅ 成功连接到 MySQL 服务器</p>";

    // 2. Create Database
    $dbName = DB_NAME;
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "<p style='color:green'>✅ 数据库 `$dbName` 准备就绪</p>";
    
    // 3. Select Database
    $pdo->exec("USE `$dbName`");
    
    // 4. Create Tables
    $sql = "
    CREATE TABLE IF NOT EXISTS page_visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_id VARCHAR(255) NOT NULL UNIQUE,
        count INT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_page_id (page_id)
    );

    CREATE TABLE IF NOT EXISTS visit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_id VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referer TEXT,
        visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_page_time (page_id, visit_time)
    );
    ";
    
    $pdo->exec($sql);
    echo "<p style='color:green'>✅ 数据表 `page_visits` 和 `visit_logs` 创建成功</p>";
    echo "<hr>";
    echo "<h2 style='color:green'>🎉 全部完成！</h2>";
    echo "<p>您的数据库已配置完毕。</p>";
    echo "<p style='background: #f0f0f0; padding: 10px; border-radius: 4px;'>⚠️ 为了安全，请在验证成功后删除此文件 (<code>api/install_db.php</code>)。</p>";

} catch (PDOException $e) {
    echo "<h2 style='color:red'>❌ 初始化失败</h2>";
    echo "<div style='background: #fff0f0; border-left: 4px solid red; padding: 10px;'>";
    echo "<p><strong>错误信息：</strong>" . $e->getMessage() . "</p>";
    echo "</div>";
    echo "<h3>可能是以下原因：</h3>";
    echo "<ul>";
    echo "<li><strong>IP填错了吗？</strong> 请检查 api/config.php 里的 IP 是否是公网 IP。</li>";
    echo "<li><strong>防火墙没开？</strong> 请检查阿里云安全组是否放行了 3306 端口。</li>";
    echo "<li><strong>权限不够？</strong> 请检查宝塔面板里该用户的权限是否改成了 '所有人' (%)。</li>";
    echo "</ul>";
}

echo "</div>";
?>