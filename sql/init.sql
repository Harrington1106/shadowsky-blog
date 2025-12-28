-- 创建数据库 (如果尚未存在)
CREATE DATABASE IF NOT EXISTS shadowsky_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE shadowsky_blog;

-- 1. 访问统计表
CREATE TABLE IF NOT EXISTS page_visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL UNIQUE,
    count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_page_id (page_id)
);

-- 2. 访问日志表 (可选，用于详细分析)
CREATE TABLE IF NOT EXISTS visit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45), -- 支持 IPv6
    user_agent TEXT,
    referer TEXT,
    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_page_time (page_id, visit_time)
);

-- 3. RSS 订阅表 (如果想迁移 RSS 到数据库)
CREATE TABLE IF NOT EXISTS rss_feeds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(512) NOT NULL UNIQUE,
    title VARCHAR(255),
    icon VARCHAR(512),
    category VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
