<?php
/**
 * Database Helper for Retinbox KV Storage
 * PHP 5.2+ Compatible
 */

// Compatibility Layer
if (!defined('__DIR__')) define('__DIR__', dirname(__FILE__));

if (!function_exists('http_response_code')) {
    function http_response_code($code = NULL) {
        if ($code !== NULL) {
            $text = 'OK';
            switch ($code) {
                case 200: $text = 'OK'; break;
                case 201: $text = 'Created'; break;
                case 204: $text = 'No Content'; break;
                case 400: $text = 'Bad Request'; break;
                case 401: $text = 'Unauthorized'; break;
                case 403: $text = 'Forbidden'; break;
                case 404: $text = 'Not Found'; break;
                case 500: $text = 'Internal Server Error'; break;
                default: $text = 'Status ' . $code; break;
            }
            $protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
            header($protocol . ' ' . $code . ' ' . $text);
            $GLOBALS['http_response_code'] = $code;
        } else {
            return (isset($GLOBALS['http_response_code']) ? $GLOBALS['http_response_code'] : 200);
        }
    }
}

class KVDB {
    var $db;
    var $name;
    var $use_file = false;
    var $file_path;

    function __construct($name) {
        $this->name = $name;
        $dbClass = 'Database';
        
        // Check for Retinbox Native DB Class
        if (class_exists($dbClass)) {
            $this->db = new $dbClass($name);
        } else {
            // Local Development & Fallback (JSON File)
            $this->use_file = true;
            $data_dir = dirname(__FILE__) . '/data';
            
            if (!file_exists($data_dir)) {
                if (!@mkdir($data_dir, 0755, true)) {
                    error_log("KVDB Error: Failed to create data directory: $data_dir");
                }
            }
            
            $this->file_path = $data_dir . "/{$name}.json";
        }
    }

    function get($key) {
        if ($this->use_file) {
            if (!file_exists($this->file_path)) return null;
            $content = @file_get_contents($this->file_path);
            if ($content === false) return null;
            
            if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
                $content = substr($content, 3);
            }
            
            $data = json_decode($content, true);
            return isset($data[$key]) ? $data[$key] : null;
        }
        return $this->db->get($key);
    }
    
    function set($key, $value) {
        if ($this->use_file) {
            $data = array();
            if (file_exists($this->file_path)) {
                $content = @file_get_contents($this->file_path);
                if ($content !== false) {
                    $data = json_decode($content, true);
                    if (!is_array($data)) $data = array();
                }
            }
            
            $data[$key] = $value;
            
            // PHP 5.2 Compat: No constants for json_encode
            $json = json_encode($data); 
            if (@file_put_contents($this->file_path, $json) === false) {
                return false;
            }
            return true;
        }
        if (method_exists($this->db, 'set')) {
            return $this->db->set($key, $value);
        }
        return false;
    }
}

if (!function_exists('initStatsFromLogs')) {
    function initStatsFromLogs($logs) {
        $stats = array(
            'total' => 0,
            'daily' => array(),
            'pages' => array()
        );
        
        if (!is_array($logs)) return $stats;
        
        $stats['total'] = count($logs);
        
        foreach ($logs as $log) {
            // Daily Stats
            $time = isset($log['time']) ? $log['time'] : '';
            if ($time && strlen($time) >= 10) {
                $day = substr($time, 0, 10);
                if (!isset($stats['daily'][$day])) $stats['daily'][$day] = 0;
                $stats['daily'][$day]++;
            }
            
            // Page Stats
            $page = isset($log['page']) ? $log['page'] : 'unknown';
            if (!isset($stats['pages'][$page])) $stats['pages'][$page] = 0;
            $stats['pages'][$page]++;
        }
        
        return $stats;
    }
}
?>