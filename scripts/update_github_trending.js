const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const POSTS_DIR = path.join(__dirname, '../public/posts');
const TARGET_FILE = path.join(POSTS_DIR, 'github-trending.md');

// Configuration
const TRENDING_URL = 'https://github.com/trending?since=daily';
const MAX_RETRIES = 3;

async function fetchTrending() {
    console.log('Fetching GitHub Trending...');
    try {
        const { data } = await axios.get(TRENDING_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        return data;
    } catch (error) {
        console.error('Error fetching trending page:', error.message);
        return null;
    }
}

function parseTrending(html) {
    const $ = cheerio.load(html);
    const repos = [];

    $('article.Box-row').each((i, el) => {
        const titleEl = $(el).find('h2 a');
        const repoName = titleEl.text().trim().replace(/\s+/g, ''); // owner/repo
        const link = 'https://github.com' + titleEl.attr('href');
        const description = $(el).find('p').text().trim() || 'No description';
        const stars = $(el).find('a[href$="/stargazers"]').text().trim().replace(/\s+/g, ' ');
        const language = $(el).find('[itemprop="programmingLanguage"]').text().trim() || 'Unknown';

        repos.push({
            name: repoName,
            link,
            description,
            stars,
            language
        });
    });

    return repos;
}

function getExistingContent() {
    if (!fs.existsSync(TARGET_FILE)) {
        return {
            content: '',
            existingRepos: new Set()
        };
    }
    const content = fs.readFileSync(TARGET_FILE, 'utf8');
    const existingRepos = new Set();
    
    // Extract repo links to identify duplicates
    const linkRegex = /\[([^\]]+)\]\(https:\/\/github\.com\/([^\/]+\/[^\)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        // match[2] is usually "owner/repo" but might have extra path
        // Let's use the full link for uniqueness or just the name if simpler
        // The parser above extracts "owner/repo" as name. 
        // Let's match based on the repo name "owner/repo" which is cleaner.
        
        // Actually, let's just use the link for strict deduplication
        existingRepos.add('https://github.com/' + match[2]);
    }

    return { content, existingRepos };
}

async function updateTrendingPost() {
    const html = await fetchTrending();
    if (!html) return;

    const trendingRepos = parseTrending(html);
    const { content, existingRepos } = getExistingContent();
    const today = new Date().toISOString().split('T')[0];

    let newContent = '';
    let addedCount = 0;

    // Filter new repos
    const newRepos = trendingRepos.filter(repo => !existingRepos.has(repo.link));

    if (newRepos.length === 0) {
        console.log('No new trending repos found today (duplicates skipped).');
        return;
    }

    // Prepare Markdown content
    let appendText = `\n\n## ${today}\n`;
    newRepos.forEach(repo => {
        // Format: - [name](link) - description (Language, Stars)
        appendText += `- [${repo.name}](${repo.link})  \n  ${repo.description}  \n  *Language: ${repo.language} | Stars: ${repo.stars}*\n`;
        addedCount++;
    });

    if (fs.existsSync(TARGET_FILE)) {
        // Update existing file
        // 1. Update Date in Front Matter
        let updatedFileContent = content.replace(/^date: ".*?"/m, `date: "${today}"`);
        
        // If file didn't match regex (e.g. no date field), handle it? 
        // Assuming standard template usage.
        
        // Append new section
        updatedFileContent += appendText;
        
        fs.writeFileSync(TARGET_FILE, updatedFileContent);
    } else {
        // Create new file
        const frontMatter = `---
title: "GitHub Trending 每日精选 (长期更新)"
date: "${today}"
category: "持续更新"
author: "Auto-Bot"
tags: ["github", "trending", "open-source"]
excerpt: "每日自动更新 GitHub Trending 榜单，发现最酷的开源项目。去重收录，常看常新。"
coverImage: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1000"
---

# GitHub Trending 每日精选

这里汇集了每日 GitHub 热门项目。脚本会自动抓取并去重，只展示你没见过的新鲜货。

${appendText}`;
        
        fs.writeFileSync(TARGET_FILE, frontMatter);
    }

    console.log(`✅ Added ${addedCount} new trending repos to ${TARGET_FILE}`);
}

updateTrendingPost();
