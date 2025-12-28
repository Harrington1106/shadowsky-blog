<?php
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo "=== 阴影天际后台环境检查工具 ===\n";
echo "检查时间: " . date('Y-m-d H:i:s') . "\n";
echo "服务器IP: " . $_SERVER['SERVER_ADDR'] . "\n";
echo "访问域名: " . $_SERVER['HTTP_HOST'] . "\n";
echo "PHP版本: " . phpversion() . "\n";

// 定义关键目录路径
$root = __DIR__ . '/..'; // 假设 check.php 在 api/ 目录下
$dataDir = realpath($root) . '/data';
$imgDir = realpath($root) . '/public/img/snapshots';

echo "\n[1. 路径检查]\n";
echo "当前脚本路径: " . __FILE__ . "\n";
echo "项目根目录: " . realpath($root) . "\n";

// 检查函数
function check_dir_status($path, $name) {
    echo "  > 检查 $name ($path):\n";
    if (!file_exists($path)) {
        echo "    ❌ 状态: 不存在\n";
        echo "    ⚠️  尝试自动创建...\n";
        if (@mkdir($path, 0777, true)) {
            echo "    ✅ 创建成功\n";
        } else {
            echo "    ❌ 创建失败 (请手动创建文件夹)\n";
            return false;
        }
    } else {
        echo "    ✅ 状态: 已存在\n";
    }

    if (is_writable($path)) {
        echo "    ✅ 权限: 可写 (正常)\n";
        return true;
    } else {
        echo "    ❌ 权限: 不可写 (请在宝塔面板将此文件夹权限设置为 777)\n";
        return false;
    }
}

echo "\n[2. 读写权限检查]\n";
$dataOk = check_dir_status($dataDir, "数据目录 (data)");
$imgOk = check_dir_status($imgDir, "图片目录 (public/img/snapshots)");

echo "\n[3. 写入测试]\n";
if ($dataOk) {
    $testFile = $dataDir . '/write_test.txt';
    if (@file_put_contents($testFile, 'test ' . date('Y-m-d H:i:s'))) {
        echo "  ✅ data 目录写入测试成功\n";
        @unlink($testFile);
    } else {
        echo "  ❌ data 目录写入测试失败\n";
    }
} else {
    echo "  ⚠️  跳过 data 目录写入测试\n";
}

if ($imgOk) {
    $testFile = $imgDir . '/write_test.txt';
    if (@file_put_contents($testFile, 'test')) {
        echo "  ✅ 图片目录写入测试成功\n";
        @unlink($testFile);
    } else {
        echo "  ❌ 图片目录写入测试失败\n";
    }
} else {
    echo "  ⚠️  跳过图片目录写入测试\n";
}

echo "\n=== 检查结束 ===\n";
echo "如果看到以上全为 ✅，说明后台配置成功。\n";
echo "如果无法访问此页面 (404 Not Found)，说明文件上传位置错误或域名未绑定。\n";
?>
