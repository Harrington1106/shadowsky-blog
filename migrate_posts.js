const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'public/posts');

// Helper to check if file has frontmatter
function hasFrontMatter(content) {
    return content.trim().startsWith('---');
}

// Helper to extract title from content
function extractTitle(content) {
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].trim();
        if (line.startsWith('# ')) {
            return {
                title: line.replace(/^#\s+/, '').trim(),
                lineIndex: i
            };
        }
    }
    return null;
}

// Helper to get category from filename or content
function guessCategory(filename, content) {
    if (filename.includes('server') || filename.includes('docker') || filename.includes('linux')) return '技术';
    if (filename.includes('guide')) return '教程';
    return '未分类';
}

function migrate() {
    const files = fs.readdirSync(postsDir);
    
    files.forEach(file => {
        if (!file.endsWith('.md')) return;
        
        const filePath = path.join(postsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (hasFrontMatter(content)) {
            console.log(`Skipping ${file} (already has frontmatter)`);
            return;
        }

        console.log(`Processing ${file}...`);
        
        const titleInfo = extractTitle(content);
        let newContent = content;
        let title = 'Untitled';
        
        if (titleInfo) {
            title = titleInfo.title;
            // Remove the title line from content
            const lines = content.split('\n');
            lines.splice(titleInfo.lineIndex, 1);
            newContent = lines.join('\n').trim();
        } else {
            // Try to use filename as title if no H1 found
            title = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/, ' ').replace('.md', '');
        }

        // Extract date from filename if possible
        let date = new Date().toISOString().split('T')[0];
        const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            date = dateMatch[1];
        }

        const category = guessCategory(file, content);
        
        const frontMatter = `---
title: "${title}"
date: ${date}
category: ${category}
tags: []
---

`;
        
        fs.writeFileSync(filePath, frontMatter + newContent);
        console.log(`Migrated ${file}`);
    });
}

migrate();
