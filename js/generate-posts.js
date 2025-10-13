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
// 扫描 Markdown 文件并解析 Front Matter
// ------------------------
const files = fs.readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => {
        const filePath = path.join(postsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/^---\n([\s\S]+?)\n---/);
        if (!match) return null;

        const frontMatter = match[1];
        const metadata = {};
        frontMatter.split('\n').forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) metadata[key] = value.replace(/['"]/g, '');
        });

        return {
            title: metadata.title || '无标题',
            date: metadata.date || '未知日期',
            category: metadata.category || '未分类',
            excerpt: metadata.excerpt || '暂无摘要',
            readTime: parseInt(metadata.readTime) || 5,
            file
        };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

// ------------------------
// 写入 posts.json
// ------------------------
fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));
console.log(`已生成文章索引，共 ${files.length} 篇文章`);
