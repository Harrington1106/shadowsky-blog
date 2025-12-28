<?php
/**
 * RSS Proxy - Secure Implementation with Caching
 * 
 * Features:
 * 1. Caching: Caches feeds for 1 hour to improve performance and avoid rate limits
 * 2. Security: SSRF Protection, Protocol Restriction, SSL Verification
 * 3. Error Handling: Standardized error messages
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/xml; charset=UTF-8");

// Disable error display in output, log to server logs instead
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Configuration
$CACHE_DIR = __DIR__ . '/../data/rss_cache';
$CACHE_DURATION = 3600; // 1 hour in seconds

/**
 * Check if an IP address is private/reserved
 */
function is_private_ip($ip) {
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return true; // Invalid IP is treated as unsafe
    }
    
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $long = ip2long($ip);
        if ($long === false) return true;
        
        // 127.0.0.0/8
        if (($long & 0xFF000000) === 0x7F000000) return true;
        
        // 10.0.0.0/8
        if (($long & 0xFF000000) === 0x0A000000) return true;
        
        // 172.16.0.0/12
        if (($long & 0xFFF00000) === 0xAC100000) return true;
        
        // 192.168.0.0/16
        if (($long & 0xFFFF0000) === 0xC0A80000) return true;
        
        // 169.254.0.0/16
        if (($long & 0xFFFF0000) === 0xA9FE0000) return true;
        
        // 100.64.0.0/10
        if (($long & 0xFFC00000) === 0x64400000) return true;
        
        // 0.0.0.0/8
        if (($long & 0xFF000000) === 0) return true;
        
        return false;
    }
    
    // IPv6 Private Ranges
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        // ::1 (Loopback)
        if ($ip === '::1') return true;
        
        // fc00::/7 (Unique Local)
        $firstWord = hexdec(substr($ip, 0, strpos($ip, ':')));
        if (($firstWord & 0xFE00) === 0xFC00) return true;
        
        // fe80::/10 (Link-local)
        if (($firstWord & 0xFFC0) === 0xFE80) return true;
        
        return false;
    }
    
    return true; // Default to unsafe
}

/**
 * Validate URL and DNS resolution
 */
function validate_url($url) {
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        throw new Exception("Invalid URL format");
    }
    
    $parsed = parse_url($url);
    if (!$parsed || !isset($parsed['scheme']) || !isset($parsed['host'])) {
        throw new Exception("Invalid URL structure");
    }
    
    if (!in_array(strtolower($parsed['scheme']), ['http', 'https'])) {
        throw new Exception("Only HTTP/HTTPS protocols allowed");
    }
    
    $host = $parsed['host'];
    
    // Block localhost explicitly
    if (in_array(strtolower($host), ['localhost', 'ip6-localhost', 'ip6-loopback'])) {
        throw new Exception("Access to localhost is denied");
    }
    
    // DNS Resolution & IP Check
    $ips = gethostbynamel($host);
    if ($ips === false || empty($ips)) {
        throw new Exception("DNS resolution failed");
    }
    
    foreach ($ips as $ip) {
        if (is_private_ip($ip)) {
            throw new Exception("Access to private IP address denied ($ip)");
        }
    }
    
    return $url;
}

$url = isset($_GET['url']) ? $_GET['url'] : '';

if (!$url) {
    http_response_code(400);
    echo 'Missing URL parameter';
    exit;
}

// Prepare cache
if (!file_exists($CACHE_DIR)) {
    mkdir($CACHE_DIR, 0755, true);
}

$cache_key = md5($url);
$cache_file = $CACHE_DIR . '/' . $cache_key . '.xml';

// Check cache
if (file_exists($cache_file)) {
    $file_mtime = filemtime($cache_file);
    if (time() - $file_mtime < $CACHE_DURATION) {
        // Serve from cache
        $content = file_get_contents($cache_file);
        // Try to detect content type from content or default to XML
        header("X-Cache: HIT");
        echo $content;
        exit;
    }
}

try {
    // Security Validation
    validate_url($url);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (ShadowSky RSS Proxy; +https://github.com/shadowsky/blog)');
    curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Increased timeout
    
    // Security: Enforce SSL Verification
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    
    $content = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl Error: ' . curl_error($ch));
    }
    
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 400) {
        // Save to cache
        file_put_contents($cache_file, $content);
        
        if ($contentType) {
            header("Content-Type: $contentType");
        }
        header("X-Cache: MISS");
        echo $content;
    } else {
        // If fetch fails but we have stale cache, serve it
        if (file_exists($cache_file)) {
            header("X-Cache: STALE");
            echo file_get_contents($cache_file);
        } else {
            http_response_code($httpCode);
            echo "Remote Server Error: $httpCode";
        }
    }
    
} catch (Exception $e) {
    // If exception occurs but we have stale cache, serve it
    if (file_exists($cache_file)) {
        header("X-Cache: STALE-ERROR");
        echo file_get_contents($cache_file);
    } else {
        http_response_code(403);
        echo "Proxy Error: " . $e->getMessage();
        error_log("RSS Proxy Blocked: " . $e->getMessage() . " for URL: $url");
    }
}
?>