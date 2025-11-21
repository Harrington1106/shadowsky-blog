// generate-posts.js
const fs = require('fs');
const path = require('path');

// ------------------------
// 自动识别项目根目录下的 posts 文件夹
// ------------------------
const projectRoot = path.resolve(__dirname, '..'); // 根目录，如果脚本在 js 文件夹中
const postsDir = path.join(projectRoot, 'posts');
const outputFile = path.join(postsDir, 'posts.json');

// 检查 posts 文件夹是否存在
if (!fs.existsSync(postsDir)) {
    console.error(`错误：未找到 posts 文件夹，请确保 ${postsDir} 存在`);
    process.exit(1);
}

// ------------------------
// 工具函数
// ------------------------

// 计算阅读时间：按平均每 500 字约 1 分钟（中文场景）
function calcReadTime(text) {
    const plainText = text.replace(/[#*>\-\[\]\(\)`]/g, '');
    const chars = plainText.length;
    const minutes = Math.max(1, Math.round(chars / 500));
    return minutes;
}

// 生成摘要：取前 100 个字符
function generateExcerpt(text, maxLength = 100) {
    const plainText = text.replace(/[#*>\-\[\]\(\)`]/g, ''); // 去掉 Markdown 符号
    return plainText.slice(0, maxLength) + (plainText.length > maxLength ? '...' : '');
}

// ------------------------
// 扫描 Markdown 文件并解析 Front Matter
// ------------------------
const toTimestamp = (d) => {
    const t = Date.parse(d);
    return Number.isNaN(t) ? 0 : t;
};

const files = fs.readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => {
        const filePath = path.join(postsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // 解析 Front Matter
        const match = content.match(/^---\n([\s\S]+?)\n---/);
        const metadata = {};
        let bodyContent = content;

        if (match) {
            const frontMatter = match[1];
            frontMatter.split('\n').forEach(line => {
                const [key, value] = line.split(':').map(s => s.trim());
                if (key && value) metadata[key] = value.replace(/['"]/g, '');
            });
            bodyContent = content.slice(match[0].length); // 去掉 Front Matter
        }

        return {
            title: metadata.title || '无标题',
            date: metadata.date || '未知日期',
            category: metadata.category || '未分类',
            excerpt: metadata.excerpt || generateExcerpt(bodyContent, 120),
            readTime: parseInt(metadata.readTime) || calcReadTime(bodyContent),
            file
        };
    })
    .filter(Boolean)
    .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

// ------------------------
// 写入 posts.json
// ------------------------
fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));
console.log(`已生成文章索引，共 ${files.length} 篇文章`);
