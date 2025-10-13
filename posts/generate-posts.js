// generate-posts.js
const fs = require('fs');
const path = require('path');

const postsDir = './posts';
const outputFile = './posts/posts.json';

const files = fs.readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => {
        const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
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

fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));
console.log(`已生成文章索引，共 ${files.length} 篇文章`);
